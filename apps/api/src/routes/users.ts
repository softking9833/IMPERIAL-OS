import { Router } from "express";
import { z } from "zod";
import { ROLES } from "@imperial/shared";
import { hashPassword } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { writeAudit } from "../lib/audit.js";
import { requireAuth, requireRoles, type AuthedRequest } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get("/", requireRoles("MANAGING_DIRECTOR"), async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      identityState: true,
      lifecycleState: true,
      isFieldReady: true,
      createdAt: true,
      deployments: {
        where: { status: "ACTIVE" },
        include: {
          campaign: { select: { id: true, name: true } },
          territory: { select: { id: true, name: true } },
        },
      },
    },
  });
  return res.json({ users });
});

usersRouter.post("/", requireRoles("MANAGING_DIRECTOR"), async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      email: z.string().trim().min(3).regex(/^[^\s@]+@[^\s@]+$/),
      password: z.string().min(6),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      role: z.enum(ROLES),
    })
    .safeParse(req.body);

  if (!parsed.success || !req.user) {
    return res.status(400).json({ error: "Invalid user payload", details: parsed.error?.flatten() });
  }

  const org = await prisma.organisation.findFirst();
  if (!org) {
    return res.status(500).json({ error: "Organisation missing" });
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const orgScope = await prisma.scope.findFirst({
    where: { organisationId: org.id, type: "ORGANISATION" },
  });

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      organisationId: org.id,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      role: parsed.data.role,
      identityState: "REGISTERED",
      lifecycleState: "ACCOUNT_CREATED",
      perspectives: {
        create: [{ perspective: parsed.data.role, isDefault: true }],
      },
      scopes: orgScope
        ? { create: [{ scopeId: orgScope.id, isDefault: true }] }
        : undefined,
      sessions: {
        create: {
          activePerspective: parsed.data.role,
          activeScopeId: orgScope?.id ?? null,
        },
      },
    },
  });

  // Attach active Field Readiness curriculum requirements
  const curriculum = await prisma.curriculum.findFirst({
    where: { organisationId: org.id, kind: "FIELD_READINESS", isActive: true },
    include: { requirements: true },
  });
  if (curriculum) {
    await prisma.requirementProgress.createMany({
      data: curriculum.requirements.map((r) => ({
        userId: user.id,
        requirementId: r.id,
        status: "NOT_STARTED",
      })),
    });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        identityState: "FIELD_READINESS",
        lifecycleState: "LEARNING",
      },
    });
  }

  await writeAudit({
    actorId: req.user.id,
    action: "USER_CREATE",
    entityType: "User",
    entityId: user.id,
    meta: { email: user.email, role: user.role },
  });

  return res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  });
});
