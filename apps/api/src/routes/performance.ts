import { Router } from "express";
import { z } from "zod";
import { SALE_STATUSES } from "@imperial/shared";
import { prisma } from "../lib/prisma.js";
import { writeAudit } from "../lib/audit.js";
import { param } from "../lib/params.js";
import { buildPerformanceSummary } from "../lib/performance.js";
import { requireAuth, requireRoles, type AuthedRequest } from "../middleware/auth.js";

export const performanceRouter = Router();
performanceRouter.use(requireAuth);

performanceRouter.get("/me", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });
  const summary = await buildPerformanceSummary(req.user.id);
  return res.json({ performance: summary });
});

performanceRouter.get(
  "/users/:userId",
  requireRoles("MANAGING_DIRECTOR"),
  async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: param(req.params.userId) } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const summary = await buildPerformanceSummary(user.id);
    return res.json({ performance: summary });
  },
);

performanceRouter.get("/company", requireRoles("MANAGING_DIRECTOR"), async (_req, res) => {
  const associates = await prisma.user.findMany({
    where: {
      role: { in: ["JUNIOR_ASSOCIATE", "ASSOCIATE", "SENIOR_ASSOCIATE"] },
    },
    select: { id: true },
  });

  const rows = [];
  for (const associate of associates) {
    rows.push(await buildPerformanceSummary(associate.id));
  }

  const totals = rows.reduce(
    (acc, row) => {
      acc.doors += row.kpis.doors;
      acc.conversations += row.kpis.conversations;
      acc.sales += row.kpis.sales;
      acc.predictedRevenuePence += row.profitability.predictedRevenuePence;
      acc.actualRevenuePence += row.profitability.actualRevenuePence;
      acc.costPence += row.profitability.costPence;
      return acc;
    },
    {
      doors: 0,
      conversations: 0,
      sales: 0,
      predictedRevenuePence: 0,
      actualRevenuePence: 0,
      costPence: 0,
    },
  );

  return res.json({
    company: {
      ...totals,
      predictedProfitPence: totals.predictedRevenuePence - totals.costPence,
      actualProfitPence: totals.actualRevenuePence - totals.costPence,
      associates: rows.length,
    },
    associates: rows,
  });
});

performanceRouter.patch(
  "/sales/:saleId/status",
  requireRoles("MANAGING_DIRECTOR"),
  async (req: AuthedRequest, res) => {
    const parsed = z
      .object({
        status: z.enum(
          SALE_STATUSES as unknown as [string, ...string[]],
        ),
      })
      .safeParse(req.body);

    if (!parsed.success || !req.user) {
      return res.status(400).json({ error: "Invalid sale status" });
    }

    const sale = await prisma.sale.findUnique({ where: { id: param(req.params.saleId) } });
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const updated = await prisma.sale.update({
      where: { id: sale.id },
      data: { status: parsed.data.status },
    });

    await writeAudit({
      actorId: req.user.id,
      action: "SALE_STATUS_UPDATE",
      entityType: "Sale",
      entityId: sale.id,
      meta: { from: sale.status, to: parsed.data.status },
    });

    const performance = await buildPerformanceSummary(sale.userId);
    return res.json({ sale: updated, performance });
  },
);
