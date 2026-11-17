import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { writeAudit } from "../lib/audit.js";
import { buildPerformanceSummary } from "../lib/performance.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const profileRouter = Router();
profileRouter.use(requireAuth);

profileRouter.get("/me", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user.id },
    include: {
      perspectives: true,
      scopes: { include: { scope: true } },
      sessions: true,
      dayRates: { orderBy: { effectiveFrom: "desc" } },
      deployments: {
        include: { campaign: true, territory: true },
        orderBy: { createdAt: "desc" },
      },
      roleplaySubmissions: {
        include: { requirement: true },
        orderBy: { submittedAt: "desc" },
        take: 10,
      },
      lessonProgress: {
        include: { lesson: true },
        orderBy: { updatedAt: "desc" },
        take: 10,
      },
    },
  });

  const timeline = [
    {
      code: "ACCOUNT_CREATED",
      label: "Account created",
      at: user.createdAt,
    },
  ];
  if (user.isFieldReady) {
    const approval = await prisma.approval.findFirst({
      where: {
        subjectUserId: user.id,
        type: "FIELD_READINESS",
        decision: "APPROVED",
      },
      orderBy: { decidedAt: "desc" },
    });
    timeline.push({
      code: "FIELD_READY",
      label: "Became Field Ready",
      at: approval?.decidedAt ?? user.updatedAt,
    });
  }
  const firstDeployment = user.deployments[user.deployments.length - 1];
  if (firstDeployment) {
    timeline.push({
      code: "FIRST_DEPLOYMENT",
      label: `Deployed to ${firstDeployment.campaign.name}`,
      at: firstDeployment.startDate,
    });
  }
  const firstSale = await prisma.sale.findFirst({
    where: { userId: user.id },
    orderBy: { saleDate: "asc" },
  });
  if (firstSale) {
    timeline.push({
      code: "FIRST_SALE",
      label: "First sale recorded",
      at: firstSale.saleDate,
    });
  }

  let performance = null;
  try {
    performance = await buildPerformanceSummary(user.id);
  } catch {
    performance = null;
  }

  const session = user.sessions[0];
  return res.json({
    profile: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      identityState: user.identityState,
      lifecycleState: user.lifecycleState,
      isFieldReady: user.isFieldReady,
      activePerspective: session?.activePerspective ?? user.role,
      activeScope:
        user.scopes.find((s) => s.scopeId === session?.activeScopeId)?.scope ??
        user.scopes.find((s) => s.isDefault)?.scope ??
        null,
      authorisedPerspectives: user.perspectives.map((p) => p.perspective),
      authorisedScopes: user.scopes.map((s) => ({
        id: s.scope.id,
        name: s.scope.name,
        type: s.scope.type,
      })),
      dayRatePence: user.dayRates[0]?.dayRatePence ?? null,
      activeDeployment: user.deployments.find((d) => d.status === "ACTIVE") ?? null,
      deploymentHistory: user.deployments,
      roleplays: user.roleplaySubmissions,
      recentLearning: user.lessonProgress,
      timeline: timeline.sort(
        (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
      ),
      performance,
    },
  });
});

profileRouter.patch("/me", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });

  const parsed = z
    .object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid profile payload" });
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
    },
  });

  await writeAudit({
    actorId: req.user.id,
    action: "PROFILE_UPDATE",
    entityType: "User",
    entityId: user.id,
  });

  return res.json({
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
  });
});
