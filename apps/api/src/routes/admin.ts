import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { writeAudit } from "../lib/audit.js";
import { requireAuth, requireRoles, type AuthedRequest } from "../middleware/auth.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRoles("MANAGING_DIRECTOR"));

adminRouter.get("/overview", async (_req, res) => {
  const [
    users,
    fieldReady,
    awaitingApproval,
    campaigns,
    territories,
    activeDeployments,
    pendingApprovals,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isFieldReady: true } }),
    prisma.user.count({ where: { lifecycleState: "AWAITING_MANAGER_REVIEW" } }),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.territory.count({ where: { status: "ACTIVE" } }),
    prisma.deployment.count({ where: { status: "ACTIVE" } }),
    prisma.approval.count({ where: { decision: "PENDING" } }),
  ]);

  const recentAudit = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      actor: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return res.json({
    overview: {
      users,
      fieldReady,
      awaitingApproval,
      campaigns,
      territories,
      activeDeployments,
      pendingApprovals,
    },
    recentAudit,
  });
});

adminRouter.get("/config", async (_req, res) => {
  const org = await prisma.organisation.findFirstOrThrow();

  const [curricula, campaigns, associates, rules] = await Promise.all([
    prisma.curriculum.findMany({
      where: { organisationId: org.id },
      orderBy: { createdAt: "desc" },
      include: {
        lessons: { orderBy: { sortOrder: "asc" } },
        requirements: {
          orderBy: { sortOrder: "asc" },
          include: { lesson: { select: { id: true, title: true } } },
        },
      },
    }),
    prisma.campaign.findMany({
      where: { organisationId: org.id },
      orderBy: { createdAt: "desc" },
      include: {
        funnelStages: { orderBy: { sortOrder: "asc" } },
        territories: true,
      },
    }),
    prisma.user.findMany({
      where: {
        organisationId: org.id,
        role: { in: ["JUNIOR_ASSOCIATE", "ASSOCIATE", "SENIOR_ASSOCIATE"] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        dayRates: { orderBy: { effectiveFrom: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.businessRule.findMany({
      where: { organisationId: org.id },
      orderBy: { key: "asc" },
    }),
  ]);

  return res.json({
    curricula,
    campaigns,
    associates: associates.map((a) => ({
      id: a.id,
      name: `${a.firstName} ${a.lastName}`,
      email: a.email,
      role: a.role,
      dayRatePence: a.dayRates[0]?.dayRatePence ?? null,
      dayRateEffectiveFrom: a.dayRates[0]?.effectiveFrom ?? null,
    })),
    rules: rules.map((r) => ({
      id: r.id,
      key: r.key,
      description: r.description,
      value: JSON.parse(r.valueJson),
    })),
  });
});

adminRouter.post("/curricula", async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      name: z.string().min(1),
      kind: z.enum(["FIELD_READINESS", "ONGOING", "CAMPAIGN"]).default("FIELD_READINESS"),
      description: z.string().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success || !req.user) {
    return res.status(400).json({ error: "Invalid curriculum payload" });
  }

  const org = await prisma.organisation.findFirstOrThrow();
  const curriculum = await prisma.curriculum.create({
    data: {
      organisationId: org.id,
      name: parsed.data.name,
      kind: parsed.data.kind,
      description: parsed.data.description,
    },
  });

  await writeAudit({
    actorId: req.user.id,
    action: "CURRICULUM_CREATE",
    entityType: "Curriculum",
    entityId: curriculum.id,
  });

  return res.status(201).json({ curriculum });
});

adminRouter.post("/curricula/:id/lessons", async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      title: z.string().min(1),
      contentType: z.enum(["LESSON", "VIDEO", "QUIZ"]).default("LESSON"),
      summary: z.string().optional(),
      body: z.string().optional(),
      videoUrl: z.string().url().optional().or(z.literal("")),
      sortOrder: z.number().int().optional(),
      linkAsRequirement: z.boolean().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success || !req.user) {
    return res.status(400).json({ error: "Invalid lesson payload" });
  }

  const curriculum = await prisma.curriculum.findUnique({
    where: { id: req.params.id },
  });
  if (!curriculum) return res.status(404).json({ error: "Curriculum not found" });

  const lesson = await prisma.lesson.create({
    data: {
      organisationId: curriculum.organisationId,
      curriculumId: curriculum.id,
      title: parsed.data.title,
      contentType: parsed.data.contentType,
      summary: parsed.data.summary,
      body: parsed.data.body,
      videoUrl: parsed.data.videoUrl || null,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });

  let requirement = null;
  if (parsed.data.linkAsRequirement !== false) {
    requirement = await prisma.fieldReadinessRequirement.create({
      data: {
        curriculumId: curriculum.id,
        lessonId: lesson.id,
        title: lesson.title,
        description: lesson.summary,
        requirementType: lesson.contentType,
        sortOrder: lesson.sortOrder,
      },
    });
  }

  await writeAudit({
    actorId: req.user.id,
    action: "CURRICULUM_LESSON_ADD",
    entityType: "Lesson",
    entityId: lesson.id,
  });

  return res.status(201).json({ lesson, requirement });
});

adminRouter.patch("/campaigns/:id/commercials", async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      saleValuePence: z.number().int().positive().optional(),
      realisedSaleStatuses: z.string().min(1).optional(),
      expectedPaymentDays: z.number().int().positive().nullable().optional(),
      clientName: z.string().optional(),
      status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
    })
    .safeParse(req.body);

  if (!parsed.success || !req.user) {
    return res.status(400).json({ error: "Invalid commercials payload" });
  }

  const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Campaign not found" });

  const campaign = await prisma.campaign.update({
    where: { id: existing.id },
    data: parsed.data,
    include: { funnelStages: { orderBy: { sortOrder: "asc" } } },
  });

  await writeAudit({
    actorId: req.user.id,
    action: "CAMPAIGN_COMMERCIALS_UPDATE",
    entityType: "Campaign",
    entityId: campaign.id,
    meta: parsed.data,
  });

  return res.json({ campaign });
});

adminRouter.put("/campaigns/:id/funnel", async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      stages: z
        .array(
          z.object({
            name: z.string().min(1),
            code: z.string().min(1),
            sortOrder: z.number().int().optional(),
          }),
        )
        .min(1),
    })
    .safeParse(req.body);

  if (!parsed.success || !req.user) {
    return res.status(400).json({ error: "Invalid funnel payload" });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });

  await prisma.funnelStage.deleteMany({ where: { campaignId: campaign.id } });
  await prisma.funnelStage.createMany({
    data: parsed.data.stages.map((s, i) => ({
      campaignId: campaign.id,
      name: s.name,
      code: s.code.toUpperCase(),
      sortOrder: s.sortOrder ?? i,
    })),
  });

  const stages = await prisma.funnelStage.findMany({
    where: { campaignId: campaign.id },
    orderBy: { sortOrder: "asc" },
  });

  await writeAudit({
    actorId: req.user.id,
    action: "CAMPAIGN_FUNNEL_UPDATE",
    entityType: "Campaign",
    entityId: campaign.id,
  });

  return res.json({ stages });
});

adminRouter.post("/associates/:userId/day-rate", async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      dayRatePence: z.number().int().positive(),
      effectiveFrom: z.string().datetime().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success || !req.user) {
    return res.status(400).json({ error: "Invalid day rate payload" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const effectiveFrom = parsed.data.effectiveFrom
    ? new Date(parsed.data.effectiveFrom)
    : new Date();

  // Close previous open-ended rate
  await prisma.associateDayRate.updateMany({
    where: { userId: user.id, effectiveTo: null },
    data: { effectiveTo: new Date(effectiveFrom.getTime() - 1000) },
  });

  const dayRate = await prisma.associateDayRate.create({
    data: {
      organisationId: user.organisationId,
      userId: user.id,
      dayRatePence: parsed.data.dayRatePence,
      effectiveFrom,
    },
  });

  await writeAudit({
    actorId: req.user.id,
    action: "DAY_RATE_SET",
    entityType: "AssociateDayRate",
    entityId: dayRate.id,
    meta: { userId: user.id, dayRatePence: parsed.data.dayRatePence },
  });

  return res.status(201).json({ dayRate });
});

adminRouter.put("/business-rules/:key", async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      value: z.unknown(),
      description: z.string().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success || !req.user) {
    return res.status(400).json({ error: "Invalid business rule payload" });
  }

  const org = await prisma.organisation.findFirstOrThrow();
  const rule = await prisma.businessRule.upsert({
    where: {
      organisationId_key: {
        organisationId: org.id,
        key: req.params.key,
      },
    },
    create: {
      organisationId: org.id,
      key: req.params.key,
      valueJson: JSON.stringify(parsed.data.value),
      description: parsed.data.description,
    },
    update: {
      valueJson: JSON.stringify(parsed.data.value),
      description: parsed.data.description,
    },
  });

  await writeAudit({
    actorId: req.user.id,
    action: "BUSINESS_RULE_UPSERT",
    entityType: "BusinessRule",
    entityId: rule.id,
    meta: { key: rule.key },
  });

  return res.json({
    rule: {
      id: rule.id,
      key: rule.key,
      description: rule.description,
      value: JSON.parse(rule.valueJson),
    },
  });
});

adminRouter.get("/business-rules", async (_req, res) => {
  const org = await prisma.organisation.findFirstOrThrow();
  const rules = await prisma.businessRule.findMany({
    where: { organisationId: org.id },
    orderBy: { key: "asc" },
  });
  return res.json({
    rules: rules.map((r) => ({
      ...r,
      value: JSON.parse(r.valueJson),
    })),
  });
});
