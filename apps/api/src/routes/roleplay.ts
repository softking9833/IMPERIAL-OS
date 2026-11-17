import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { writeAudit } from "../lib/audit.js";
import { requireAuth, requireRoles, type AuthedRequest } from "../middleware/auth.js";

export const roleplayRouter = Router();
roleplayRouter.use(requireAuth);

roleplayRouter.get("/requirements", async (_req, res) => {
  const requirements = await prisma.roleplayRequirement.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return res.json({ requirements });
});

roleplayRouter.get("/me", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });

  const requirements = await prisma.roleplayRequirement.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      submissions: {
        where: { userId: req.user.id },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  return res.json({
    items: requirements.map((r) => ({
      requirement: {
        id: r.id,
        title: r.title,
        brief: r.brief,
        isMandatory: r.isMandatory,
        sortOrder: r.sortOrder,
      },
      latestSubmission: r.submissions[0] ?? null,
      history: r.submissions,
    })),
  });
});

roleplayRouter.post("/submit", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });

  const parsed = z
    .object({
      requirementId: z.string().min(1),
      content: z.string().min(10),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid roleplay submission" });
  }

  const requirement = await prisma.roleplayRequirement.findFirst({
    where: { id: parsed.data.requirementId, isActive: true },
  });
  if (!requirement) {
    return res.status(404).json({ error: "Roleplay requirement not found" });
  }

  const submission = await prisma.roleplaySubmission.create({
    data: {
      requirementId: requirement.id,
      userId: req.user.id,
      content: parsed.data.content,
      status: "AWAITING_REVIEW",
      submittedAt: new Date(),
    },
    include: { requirement: true },
  });

  await writeAudit({
    actorId: req.user.id,
    action: "ROLEPLAY_SUBMIT",
    entityType: "RoleplaySubmission",
    entityId: submission.id,
  });

  return res.status(201).json({ submission });
});

roleplayRouter.get("/queue", requireRoles("MANAGING_DIRECTOR"), async (_req, res) => {
  const queue = await prisma.roleplaySubmission.findMany({
    where: { status: "AWAITING_REVIEW" },
    include: {
      requirement: true,
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
    },
    orderBy: { submittedAt: "asc" },
  });
  return res.json({ queue });
});

roleplayRouter.post(
  "/:submissionId/review",
  requireRoles("MANAGING_DIRECTOR"),
  async (req: AuthedRequest, res) => {
    const parsed = z
      .object({
        decision: z.enum(["APPROVED", "RETURNED"]),
        feedback: z.string().optional(),
      })
      .safeParse(req.body);

    if (!parsed.success || !req.user) {
      return res.status(400).json({ error: "Invalid review payload" });
    }

    const existing = await prisma.roleplaySubmission.findUnique({
      where: { id: req.params.submissionId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Submission not found" });
    }
    if (existing.status !== "AWAITING_REVIEW") {
      return res.status(400).json({ error: "Submission is not awaiting review" });
    }

    const submission = await prisma.roleplaySubmission.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.decision,
        feedback: parsed.data.feedback,
        reviewerId: req.user.id,
        reviewedAt: new Date(),
      },
      include: {
        requirement: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    await writeAudit({
      actorId: req.user.id,
      action: "ROLEPLAY_REVIEW",
      entityType: "RoleplaySubmission",
      entityId: submission.id,
      meta: { decision: parsed.data.decision },
    });

    return res.json({ submission });
  },
);

roleplayRouter.post("/", requireRoles("MANAGING_DIRECTOR"), async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      title: z.string().min(1),
      brief: z.string().optional(),
      isMandatory: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success || !req.user) {
    return res.status(400).json({ error: "Invalid roleplay requirement" });
  }

  const org = await prisma.organisation.findFirstOrThrow();
  const requirement = await prisma.roleplayRequirement.create({
    data: {
      organisationId: org.id,
      title: parsed.data.title,
      brief: parsed.data.brief,
      isMandatory: parsed.data.isMandatory ?? true,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });

  await writeAudit({
    actorId: req.user.id,
    action: "ROLEPLAY_REQUIREMENT_CREATE",
    entityType: "RoleplayRequirement",
    entityId: requirement.id,
  });

  return res.status(201).json({ requirement });
});
