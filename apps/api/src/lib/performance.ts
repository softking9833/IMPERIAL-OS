import { prisma } from "./prisma.js";

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseRealisedStatuses(raw: string | null | undefined) {
  return (raw ?? "PAID")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export async function buildPerformanceSummary(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      dayRates: { orderBy: { effectiveFrom: "desc" } },
      fieldActivities: true,
      sales: { include: { campaign: true } },
    },
  });

  const excluded = new Set(["CANCELLED", "REJECTED"]);
  const activeSales = user.sales.filter((s) => !excluded.has(s.status.toUpperCase()));

  const predictedRevenuePence = activeSales.reduce((sum, s) => sum + s.valuePence, 0);

  const actualRevenuePence = activeSales
    .filter((s) => {
      const realised = parseRealisedStatuses(s.campaign.realisedSaleStatuses);
      return realised.includes(s.status.toUpperCase());
    })
    .reduce((sum, s) => sum + s.valuePence, 0);

  const workedDays = new Set(
    user.fieldActivities
      .filter((a) => a.doorsKnocked > 0 || a.conversations > 0)
      .map((a) => dayKey(a.activityDate)),
  );

  let costPence = 0;
  for (const day of workedDays) {
    const dayDate = new Date(`${day}T12:00:00.000Z`);
    const rate =
      user.dayRates.find(
        (r) =>
          r.effectiveFrom <= dayDate &&
          (r.effectiveTo == null || r.effectiveTo >= dayDate),
      ) ?? user.dayRates[0];
    costPence += rate?.dayRatePence ?? 0;
  }

  const doors = user.fieldActivities.reduce((sum, a) => sum + a.doorsKnocked, 0);
  const conversations = user.fieldActivities.reduce((sum, a) => sum + a.conversations, 0);
  const salesCount = activeSales.length;

  const doorToConversation =
    doors > 0 ? Number(((conversations / doors) * 100).toFixed(1)) : 0;
  const conversationToSale =
    conversations > 0 ? Number(((salesCount / conversations) * 100).toFixed(1)) : 0;
  const doorToSale = doors > 0 ? Number(((salesCount / doors) * 100).toFixed(1)) : 0;

  const currentDayRatePence = user.dayRates[0]?.dayRatePence ?? 0;
  const breakEvenSales =
    currentDayRatePence > 0 && activeSales[0]
      ? Math.ceil(currentDayRatePence / (activeSales[0].valuePence || 10000))
      : null;

  return {
    userId: user.id,
    name: `${user.firstName} ${user.lastName}`,
    kpis: {
      doors,
      conversations,
      sales: salesCount,
      daysWorked: workedDays.size,
      doorToConversationPct: doorToConversation,
      conversationToSalePct: conversationToSale,
      doorToSalePct: doorToSale,
    },
    commercials: {
      dayRatePence: currentDayRatePence,
      breakEvenSalesPerDay: breakEvenSales,
    },
    profitability: {
      predictedRevenuePence,
      actualRevenuePence,
      costPence,
      predictedProfitPence: predictedRevenuePence - costPence,
      actualProfitPence: actualRevenuePence - costPence,
      predictedStatus:
        predictedRevenuePence - costPence >= 0 ? "PROFITABLE" : "UNPROFITABLE",
      actualStatus: actualRevenuePence - costPence >= 0 ? "PROFITABLE" : "UNPROFITABLE",
    },
    sales: user.sales
      .slice()
      .sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime())
      .map((s) => ({
        id: s.id,
        status: s.status,
        valuePence: s.valuePence,
        saleDate: s.saleDate,
        campaignName: s.campaign.name,
        isActual: parseRealisedStatuses(s.campaign.realisedSaleStatuses).includes(
          s.status.toUpperCase(),
        ),
      })),
  };
}
