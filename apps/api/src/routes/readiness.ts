import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { writeAudit } from "../lib/audit.js";
import { param } from "../lib/params.js";
import { requireAuth, requireRoles, type AuthedRequest } from "../middleware/auth.js";

export const readinessRouter = Router();
readinessRouter.use(requireAuth);

readinessRouter.get("/me", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });

  const progress = await prisma.requirementProgress.findMany({
    where: { userId: req.user.id },
    include: { requirement: true },
    orderBy: { requirement: { sortOrder: "asc" } },
  });

  const pendingApproval = await prisma.approval.findFirst({
    where: {
      subjectUserId: req.user.id,
      type: "FIELD_READINESS",
      decision: "PENDING",
    },
  });

  return res.json({
    isFieldReady: req.user.isFieldReady,
    lifecycleState: req.user.lifecycleState,
    pendingApproval: Boolean(pendingApproval),
    requirements: progress.map((p) => ({
      id: p.id,
      status: p.status,
      feedback: p.feedback,
      completedAt: p.completedAt,
      requirement: {
        id: p.requirement.id,
        title: p.requirement.title,
        description: p.requirement.description,
        requirementType: p.requirement.requirementType,
        isMandatory: p.requirement.isMandatory,
        sortOrder: p.requirement.sortOrder,
      },
    })),
  });
});

readinessRouter.post("/me/:progressId/complete", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });

  const progress = await prisma.requirementProgress.findFirst({
    where: { id: param(req.params.progressId), userId: req.user.id },
  });
  if (!progress) {
    return res.status(404).json({ error: "Requirement not found" });
  }

  const updated = await prisma.requirementProgress.update({
    where: { id: progress.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await maybeAdvanceToAwaitingApproval(req.user.id);

  await writeAudit({
    actorId: req.user.id,
    action: "REQUIREMENT_PROGRESS",
    entityType: "RequirementProgress",
    entityId: updated.id,
    meta: { status: updated.status },
  });

  return res.json({ progress: updated });
});

readinessRouter.get("/queue", requireRoles("MANAGING_DIRECTOR"), async (_req, res) => {
  const awaiting = await prisma.user.findMany({
    where: {
      lifecycleState: "AWAITING_MANAGER_REVIEW",
      isFieldReady: false,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      lifecycleState: true,
      requirementProgress: {
        include: { requirement: true },
        orderBy: { requirement: { sortOrder: "asc" } },
      },
    },
  });
  return res.json({ awaiting });
});

readinessRouter.post(
  "/:userId/approve",
  requireRoles("MANAGING_DIRECTOR"),
  async (req: AuthedRequest, res) => {
    const parsed = z
      .object({
        decision: z.enum(["APPROVED", "RETURNED"]),
        feedback: z.string().optional(),
      })
      .safeParse(req.body);

    if (!parsed.success || !req.user) {
      return res.status(400).json({ error: "Invalid approval payload" });
    }

    const subject = await prisma.user.findUnique({ where: { id: param(req.params.userId) } });
    if (!subject) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.approval.updateMany({
      where: {
        subjectUserId: subject.id,
        type: "FIELD_READINESS",
        decision: "PENDING",
      },
      data: {
        approverId: req.user.id,
        decision: parsed.data.decision,
        feedback: parsed.data.feedback,
        decidedAt: new Date(),
      },
    });

    const approval = await prisma.approval.findFirst({
      where: {
        subjectUserId: subject.id,
        type: "FIELD_READINESS",
      },
      orderBy: { createdAt: "desc" },
    });

    if (parsed.data.decision === "APPROVED") {
      await prisma.user.update({
        where: { id: subject.id },
        data: {
          isFieldReady: true,
          identityState: "ACTIVE",
          lifecycleState: "FIELD_READY",
        },
      });
    } else {
      await prisma.user.update({
        where: { id: subject.id },
        data: {
          lifecycleState: "LEARNING",
          identityState: "FIELD_READINESS",
        },
      });
    }

    await writeAudit({
      actorId: req.user.id,
      action: "FIELD_READINESS_DECISION",
      entityType: "Approval",
      entityId: approval?.id,
      meta: { subjectUserId: subject.id, decision: parsed.data.decision },
    });

    return res.json({ approval });
  },
);

async function maybeAdvanceToAwaitingApproval(userId: string) {
  const progress = await prisma.requirementProgress.findMany({
    where: { userId },
    include: { requirement: true },
  });

  const mandatory = progress.filter((p) => p.requirement.isMandatory);
  if (mandatory.length === 0) return;

  const allComplete = mandatory.every(
    (p) => p.status === "COMPLETED" || p.status === "APPROVED",
  );
  if (!allComplete) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.isFieldReady || user.lifecycleState === "AWAITING_MANAGER_REVIEW") {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lifecycleState: "AWAITING_MANAGER_REVIEW" },
  });

  const existing = await prisma.approval.findFirst({
    where: {
      subjectUserId: userId,
      type: "FIELD_READINESS",
      decision: "PENDING",
    },
  });
  if (!existing) {
    await prisma.approval.create({
      data: {
        type: "FIELD_READINESS",
        subjectUserId: userId,
        decision: "PENDING",
      },
    });
  }
}
