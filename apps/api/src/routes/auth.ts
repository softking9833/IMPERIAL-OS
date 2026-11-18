import { Router } from "express";
import { z } from "zod";
import {
  buildAuthUser,
  signToken,
  verifyPassword,
} from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { writeAudit } from "../lib/audit.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const parsed = z
    .object({
      // Allow demo domains like @imperial (Zod .email() requires a TLD).
      email: z.string().trim().min(3).regex(/^[^\s@]+@[^\s@]+$/),
      password: z.string().min(1),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid credentials payload" });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Email or password is incorrect" });
  }

  if (user.identityState === "SUSPENDED" || user.identityState === "ARCHIVED") {
    return res.status(403).json({ error: "Account is not available for login" });
  }

  const token = signToken({ sub: user.id, email: user.email });
  const summary = await buildAuthUser(user.id);

  await writeAudit({
    actorId: user.id,
    action: "AUTH_LOGIN",
    entityType: "User",
    entityId: user.id,
  });

  return res.json({ token, user: summary });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  return res.json({ user: req.user });
});

authRouter.post("/perspective", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      perspective: z.string().min(1),
      scopeId: z.string().nullable().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success || !req.user) {
    return res.status(400).json({ error: "Invalid perspective payload" });
  }

  const allowed = await prisma.userPerspective.findFirst({
    where: { userId: req.user.id, perspective: parsed.data.perspective },
  });
  if (!allowed) {
    return res.status(403).json({ error: "Perspective not authorised for this identity" });
  }

  if (parsed.data.scopeId) {
    const scopeOk = await prisma.userScope.findFirst({
      where: { userId: req.user.id, scopeId: parsed.data.scopeId },
    });
    if (!scopeOk) {
      return res.status(403).json({ error: "Scope not authorised for this identity" });
    }
  }

  await prisma.sessionContext.upsert({
    where: { userId: req.user.id },
    create: {
      userId: req.user.id,
      activePerspective: parsed.data.perspective,
      activeScopeId: parsed.data.scopeId ?? null,
    },
    update: {
      activePerspective: parsed.data.perspective,
      activeScopeId: parsed.data.scopeId ?? null,
    },
  });

  await writeAudit({
    actorId: req.user.id,
    action: "PERSPECTIVE_SWITCH",
    entityType: "SessionContext",
    entityId: req.user.id,
    meta: parsed.data,
  });

  const user = await buildAuthUser(req.user.id);
  return res.json({ user });
});
