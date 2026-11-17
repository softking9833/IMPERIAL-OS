import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { writeAudit } from "../lib/audit.js";
import { param } from "../lib/params.js";
import { requireAuth, requireRoles, type AuthedRequest } from "../middleware/auth.js";

export const campaignsRouter = Router();
campaignsRouter.use(requireAuth);

campaignsRouter.get("/", async (_req, res) => {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      territories: true,
      funnelStages: { orderBy: { sortOrder: "asc" } },
      _count: { select: { deployments: true } },
    },
  });
  return res.json({ campaigns });
});

campaignsRouter.post("/", requireRoles("MANAGING_DIRECTOR"), async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      name: z.string().min(1),
      clientName: z.string().optional(),
      saleValuePence: z.number().int().positive().default(10000),
      realisedSaleStatuses: z.string().default("PAID"),
      expectedPaymentDays: z.number().int().positive().optional(),
      funnelStages: z
        .array(z.object({ name: z.string(), code: z.string() }))
        .optional(),
    })
    .safeParse(req.body);

  if (!parsed.success || !req.user) {
    return res.status(400).json({ error: "Invalid campaign payload" });
  }

  const org = await prisma.organisation.findFirstOrThrow();
  const stages =
    parsed.data.funnelStages ??
    [
      { name: "Doors", code: "DOORS" },
      { name: "Conversations", code: "CONVERSATIONS" },
      { name: "Qualified", code: "QUALIFIED" },
      { name: "Sale", code: "SALE" },
    ];

  const campaign = await prisma.campaign.create({
    data: {
      organisationId: org.id,
      name: parsed.data.name,
      clientName: parsed.data.clientName,
      saleValuePence: parsed.data.saleValuePence,
      realisedSaleStatuses: parsed.data.realisedSaleStatuses,
      expectedPaymentDays: parsed.data.expectedPaymentDays,
      funnelStages: {
        create: stages.map((s, i) => ({
          name: s.name,
          code: s.code,
          sortOrder: i,
        })),
      },
    },
    include: { funnelStages: true },
  });

  await writeAudit({
    actorId: req.user.id,
    action: "CAMPAIGN_CREATE",
    entityType: "Campaign",
    entityId: campaign.id,
  });

  return res.status(201).json({ campaign });
});

campaignsRouter.post(
  "/:campaignId/territories",
  requireRoles("MANAGING_DIRECTOR"),
  async (req: AuthedRequest, res) => {
    const parsed = z
      .object({
        name: z.string().min(1),
        description: z.string().optional(),
      })
      .safeParse(req.body);

    if (!parsed.success || !req.user) {
      return res.status(400).json({ error: "Invalid territory payload" });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: param(req.params.campaignId) },
    });
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const territory = await prisma.territory.create({
      data: {
        organisationId: campaign.organisationId,
        campaignId: campaign.id,
        name: parsed.data.name,
        description: parsed.data.description,
      },
    });

    await writeAudit({
      actorId: req.user.id,
      action: "TERRITORY_CREATE",
      entityType: "Territory",
      entityId: territory.id,
    });

    return res.status(201).json({ territory });
  },
);

campaignsRouter.post(
  "/deployments",
  requireRoles("MANAGING_DIRECTOR"),
  async (req: AuthedRequest, res) => {
    const parsed = z
      .object({
        userId: z.string().min(1),
        campaignId: z.string().min(1),
        territoryId: z.string().min(1),
      })
      .safeParse(req.body);

    if (!parsed.success || !req.user) {
      return res.status(400).json({ error: "Invalid deployment payload" });
    }

    const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!target.isFieldReady) {
      return res.status(400).json({
        error: "Associate must be Field Ready before deployment",
      });
    }

    await prisma.deployment.updateMany({
      where: { userId: parsed.data.userId, status: "ACTIVE" },
      data: { status: "ENDED", endDate: new Date() },
    });

    const deployment = await prisma.deployment.create({
      data: {
        userId: parsed.data.userId,
        campaignId: parsed.data.campaignId,
        territoryId: parsed.data.territoryId,
        status: "ACTIVE",
      },
      include: {
        campaign: true,
        territory: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    await writeAudit({
      actorId: req.user.id,
      action: "DEPLOYMENT_ASSIGN",
      entityType: "Deployment",
      entityId: deployment.id,
      meta: parsed.data,
    });

    return res.status(201).json({ deployment });
  },
);
