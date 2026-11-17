import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { writeAudit } from "../lib/audit.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const fieldRouter = Router();
fieldRouter.use(requireAuth);

fieldRouter.get("/today", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });

  const deployment = await prisma.deployment.findFirst({
    where: { userId: req.user.id, status: "ACTIVE" },
    include: {
      campaign: { include: { funnelStages: { orderBy: { sortOrder: "asc" } } } },
      territory: true,
    },
  });

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const [activity, sales, callbacks] = await Promise.all([
    prisma.fieldActivity.findFirst({
      where: {
        userId: req.user.id,
        activityDate: { gte: start, lte: end },
      },
    }),
    prisma.sale.findMany({
      where: { userId: req.user.id, saleDate: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.callback.findMany({
      where: { userId: req.user.id, status: "OPEN" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const eod = await prisma.endOfDayReport.findFirst({
    where: {
      userId: req.user.id,
      reportDate: { gte: start, lte: end },
    },
  });

  return res.json({
    isFieldReady: req.user.isFieldReady,
    deployment,
    activity,
    sales,
    callbacks,
    endOfDay: eod,
  });
});

fieldRouter.post("/callbacks", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });
  if (!req.user.isFieldReady) {
    return res.status(403).json({ error: "Field Ready status required" });
  }

  const parsed = z
    .object({
      addressNote: z.string().min(1),
      notes: z.string().optional(),
      scheduledAt: z.string().datetime().optional(),
      clientRef: z.string().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid callback payload" });
  }

  const clientRef = parsed.data.clientRef ?? `cb-${Date.now()}`;

  const existing = await prisma.callback.findUnique({
    where: {
      userId_clientRef: {
        userId: req.user.id,
        clientRef,
      },
    },
  });
  if (existing) {
    return res.status(200).json({ callback: existing, deduped: true });
  }

  const callback = await prisma.callback.create({
    data: {
      userId: req.user.id,
      addressNote: parsed.data.addressNote,
      notes: parsed.data.notes,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      clientRef,
      status: "OPEN",
      syncStatus: "SYNCED",
    },
  });

  await writeAudit({
    actorId: req.user.id,
    action: "CALLBACK_CREATE",
    entityType: "Callback",
    entityId: callback.id,
  });

  return res.status(201).json({ callback });
});

fieldRouter.patch("/callbacks/:id", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });

  const parsed = z
    .object({
      status: z.enum(["OPEN", "COMPLETED", "CANCELLED"]),
      notes: z.string().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid callback update" });
  }

  // Accept server id or clientRef so offline-created callbacks can sync updates.
  const existing = await prisma.callback.findFirst({
    where: {
      userId: req.user.id,
      OR: [{ id: req.params.id }, { clientRef: req.params.id }],
    },
  });
  if (!existing) return res.status(404).json({ error: "Callback not found" });

  const callback = await prisma.callback.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      notes: parsed.data.notes ?? existing.notes,
    },
  });

  await writeAudit({
    actorId: req.user.id,
    action: "CALLBACK_UPDATE",
    entityType: "Callback",
    entityId: callback.id,
    meta: { status: parsed.data.status },
  });

  return res.json({ callback });
});

fieldRouter.post("/end-of-day", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });
  if (!req.user.isFieldReady) {
    return res.status(403).json({ error: "Field Ready status required" });
  }

  const parsed = z
    .object({
      wins: z.string().optional(),
      challenges: z.string().optional(),
      tomorrowFocus: z.string().optional(),
      clientRef: z.string().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid end of day payload" });
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const reportDate = new Date();
  reportDate.setHours(12, 0, 0, 0);

  const [activity, salesCount, callbacksOpen] = await Promise.all([
    prisma.fieldActivity.findFirst({
      where: {
        userId: req.user.id,
        activityDate: { gte: start, lte: end },
      },
    }),
    prisma.sale.count({
      where: { userId: req.user.id, saleDate: { gte: start, lte: end } },
    }),
    prisma.callback.count({ where: { userId: req.user.id, status: "OPEN" } }),
  ]);

  const clientRef =
    parsed.data.clientRef ?? `eod-${reportDate.toISOString().slice(0, 10)}`;

  const endOfDay = await prisma.endOfDayReport.upsert({
    where: {
      userId_clientRef: {
        userId: req.user.id,
        clientRef,
      },
    },
    create: {
      userId: req.user.id,
      reportDate,
      doorsKnocked: activity?.doorsKnocked ?? 0,
      conversations: activity?.conversations ?? 0,
      salesCount,
      callbacksOpen,
      wins: parsed.data.wins,
      challenges: parsed.data.challenges,
      tomorrowFocus: parsed.data.tomorrowFocus,
      clientRef,
      status: "SUBMITTED",
      syncStatus: "SYNCED",
    },
    update: {
      doorsKnocked: activity?.doorsKnocked ?? 0,
      conversations: activity?.conversations ?? 0,
      salesCount,
      callbacksOpen,
      wins: parsed.data.wins,
      challenges: parsed.data.challenges,
      tomorrowFocus: parsed.data.tomorrowFocus,
      status: "SUBMITTED",
      syncStatus: "SYNCED",
    },
  });

  await writeAudit({
    actorId: req.user.id,
    action: "EOD_SUBMIT",
    entityType: "EndOfDayReport",
    entityId: endOfDay.id,
  });

  return res.json({ endOfDay });
});

fieldRouter.post("/activity", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });
  if (!req.user.isFieldReady) {
    return res.status(403).json({ error: "Field Ready status required" });
  }

  const parsed = z
    .object({
      doorsKnocked: z.number().int().nonnegative(),
      conversations: z.number().int().nonnegative(),
      notes: z.string().optional(),
      clientRef: z.string().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid activity payload" });
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const activity = await prisma.fieldActivity.upsert({
    where: {
      userId_clientRef: {
        userId: req.user.id,
        clientRef: parsed.data.clientRef ?? `day-${today.toISOString().slice(0, 10)}`,
      },
    },
    create: {
      userId: req.user.id,
      activityDate: today,
      doorsKnocked: parsed.data.doorsKnocked,
      conversations: parsed.data.conversations,
      notes: parsed.data.notes,
      clientRef: parsed.data.clientRef ?? `day-${today.toISOString().slice(0, 10)}`,
      syncStatus: "SYNCED",
    },
    update: {
      doorsKnocked: parsed.data.doorsKnocked,
      conversations: parsed.data.conversations,
      notes: parsed.data.notes,
      syncStatus: "SYNCED",
    },
  });

  await writeAudit({
    actorId: req.user.id,
    action: "FIELD_ACTIVITY_UPSERT",
    entityType: "FieldActivity",
    entityId: activity.id,
  });

  return res.json({ activity });
});

fieldRouter.post("/sales", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });
  if (!req.user.isFieldReady) {
    return res.status(403).json({ error: "Field Ready status required" });
  }

  const parsed = z
    .object({
      campaignId: z.string().min(1),
      notes: z.string().optional(),
      clientRef: z.string().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid sale payload" });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: parsed.data.campaignId },
  });
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }

  const clientRef = parsed.data.clientRef ?? `sale-${Date.now()}`;

  const existingSale = await prisma.sale.findUnique({
    where: {
      userId_clientRef: {
        userId: req.user.id,
        clientRef,
      },
    },
  });
  if (existingSale) {
    return res.status(200).json({ sale: existingSale, deduped: true });
  }

  const sale = await prisma.sale.create({
    data: {
      userId: req.user.id,
      campaignId: campaign.id,
      status: "RECORDED",
      valuePence: campaign.saleValuePence,
      notes: parsed.data.notes,
      clientRef,
      syncStatus: "SYNCED",
    },
  });

  await writeAudit({
    actorId: req.user.id,
    action: "SALE_RECORDED",
    entityType: "Sale",
    entityId: sale.id,
  });

  return res.status(201).json({ sale });
});
