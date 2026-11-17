import { prisma } from "./prisma.js";
import { buildPerformanceSummary } from "./performance.js";

export type HomeAction = {
  code: string;
  title: string;
  detail: string;
  href: string;
  priority: number;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function buildHome(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      deployments: {
        where: { status: "ACTIVE" },
        include: { campaign: true, territory: true },
        take: 1,
      },
    },
  });

  const actions: HomeAction[] = [];
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  if (user.role === "MANAGING_DIRECTOR") {
    const [awaiting, associates, roleplayQueue] = await Promise.all([
      prisma.user.count({
        where: { lifecycleState: "AWAITING_MANAGER_REVIEW", isFieldReady: false },
      }),
      prisma.user.count({
        where: { role: { in: ["JUNIOR_ASSOCIATE", "ASSOCIATE", "SENIOR_ASSOCIATE"] } },
      }),
      prisma.roleplaySubmission.count({ where: { status: "AWAITING_REVIEW" } }),
    ]);

    if (awaiting > 0) {
      actions.push({
        code: "APPROVE_FIELD_READINESS",
        title: "Approve Field Readiness",
        detail: `${awaiting} Associate(s) waiting for leader approval.`,
        href: "/readiness",
        priority: 1,
      });
    }

    if (roleplayQueue > 0) {
      actions.push({
        code: "REVIEW_ROLEPLAYS",
        title: "Review roleplay submissions",
        detail: `${roleplayQueue} roleplay(s) awaiting assessment.`,
        href: "/roleplay",
        priority: 2,
      });
    }

    actions.push({
      code: "REVIEW_PERFORMANCE",
      title: "Review company performance",
      detail: `Track profitability across ${associates} associate(s).`,
      href: "/performance",
      priority: 3,
    });

    actions.push({
      code: "MANAGE_CAMPAIGNS",
      title: "Manage campaigns & deployments",
      detail: "Assign Field Ready associates to territories.",
      href: "/campaigns",
      priority: 4,
    });

    actions.push({
      code: "ADMIN_CONFIG",
      title: "Configure business settings",
      detail: "Curriculum, commercials, KPI funnel and day rates.",
      href: "/admin-config",
      priority: 5,
    });

    const sorted = actions.sort((a, b) => a.priority - b.priority);
    return {
      greeting: `Good day, ${user.firstName}`,
      role: user.role,
      primaryAction: sorted[0] ?? null,
      actions: sorted,
      context: {
        isFieldReady: user.isFieldReady,
        lifecycleState: user.lifecycleState,
        deployment: null,
        eodSubmitted: false,
        openCallbacks: 0,
        activityToday: null,
        salesToday: 0,
        incompleteLessons: 0,
        pendingRoleplays: roleplayQueue,
      },
      performanceSnapshot: null,
    };
  }

  const [openCallbacks, activity, salesToday, eod, lessons, progress, roleplayReqs, roleplaySubs] =
    await Promise.all([
      prisma.callback.count({ where: { userId, status: "OPEN" } }),
      prisma.fieldActivity.findFirst({
        where: { userId, activityDate: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.sale.count({
        where: { userId, saleDate: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.endOfDayReport.findFirst({
        where: { userId, reportDate: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.lesson.findMany({ where: { isPublished: true } }),
      prisma.lessonProgress.findMany({ where: { userId } }),
      prisma.roleplayRequirement.findMany({ where: { isActive: true, isMandatory: true } }),
      prisma.roleplaySubmission.findMany({
        where: { userId },
        orderBy: { submittedAt: "desc" },
      }),
    ]);

  const completedLessonIds = new Set(
    progress.filter((p) => p.status === "COMPLETED").map((p) => p.lessonId),
  );
  const incompleteLessons = lessons.filter((l) => !completedLessonIds.has(l.id)).length;

  const approvedRoleplayIds = new Set(
    roleplaySubs.filter((s) => s.status === "APPROVED").map((s) => s.requirementId),
  );
  const awaitingRoleplay = roleplaySubs.filter((s) => s.status === "AWAITING_REVIEW").length;
  const pendingRoleplays = roleplayReqs.filter((r) => !approvedRoleplayIds.has(r.id)).length;

  if (!user.isFieldReady) {
    if (user.lifecycleState === "AWAITING_MANAGER_REVIEW") {
      actions.push({
        code: "WAIT_APPROVAL",
        title: "Waiting for Field Readiness approval",
        detail: "Your leader will review and approve before deployment.",
        href: "/readiness",
        priority: 1,
      });
    } else {
      actions.push({
        code: "COMPLETE_LEARNING",
        title: "Complete Field Readiness learning",
        detail:
          incompleteLessons > 0
            ? `${incompleteLessons} lesson(s) still outstanding.`
            : "Finish mandatory curriculum, then await approval.",
        href: "/learn",
        priority: 1,
      });
    }
  } else if (!user.deployments[0]) {
    actions.push({
      code: "AWAIT_DEPLOYMENT",
      title: "You are Field Ready — awaiting deployment",
      detail: "Your MD will assign a campaign and territory.",
      href: "/associate",
      priority: 1,
    });
  } else {
    const deployment = user.deployments[0];
    actions.push({
      code: "ENTER_FIELD",
      title: "Continue field execution",
      detail: `${deployment.campaign.name} · ${deployment.territory.name}`,
      href: "/field",
      priority: 1,
    });

    if (!activity || (activity.doorsKnocked === 0 && activity.conversations === 0)) {
      actions.push({
        code: "RECORD_ACTIVITY",
        title: "Record today's doors & conversations",
        detail: "Capture field activity so Performance can update.",
        href: "/field",
        priority: 2,
      });
    }

    if (openCallbacks > 0) {
      actions.push({
        code: "MANAGE_CALLBACKS",
        title: "Work open callbacks",
        detail: `${openCallbacks} callback(s) still open.`,
        href: "/field",
        priority: 3,
      });
    }

    if (!eod) {
      actions.push({
        code: "SUBMIT_EOD",
        title: "Submit End of Day report",
        detail: "Close the day with wins, challenges and tomorrow's focus.",
        href: "/field",
        priority: 4,
      });
    }
  }

  if (pendingRoleplays > 0) {
    actions.push({
      code: "SUBMIT_ROLEPLAY",
      title: awaitingRoleplay > 0 ? "Roleplay awaiting review" : "Complete roleplay practice",
      detail:
        awaitingRoleplay > 0
          ? `${awaitingRoleplay} submission(s) waiting for leader feedback.`
          : `${pendingRoleplays} mandatory roleplay(s) still outstanding.`,
      href: "/roleplay",
      priority: 2,
    });
  }

  if (incompleteLessons > 0 && user.isFieldReady) {
    actions.push({
      code: "DAILY_LEARNING",
      title: "Complete remaining learning",
      detail: `${incompleteLessons} lesson(s) available.`,
      href: "/learn",
      priority: 5,
    });
  }

  actions.push({
    code: "VIEW_PERFORMANCE",
    title: "Check your performance",
    detail: "See KPIs and predicted vs actual profitability.",
    href: "/performance",
    priority: 6,
  });

  actions.push({
    code: "VIEW_PROFILE",
    title: "Review your profile",
    detail: "Identity, timeline, deployments and progression.",
    href: "/profile",
    priority: 7,
  });

  let performanceSnapshot = null;
  try {
    const summary = await buildPerformanceSummary(userId);
    performanceSnapshot = {
      predictedProfitPence: summary.profitability.predictedProfitPence,
      actualProfitPence: summary.profitability.actualProfitPence,
      predictedStatus: summary.profitability.predictedStatus,
      doors: summary.kpis.doors,
      sales: summary.kpis.sales,
    };
  } catch {
    performanceSnapshot = null;
  }

  const sorted = actions.sort((a, b) => a.priority - b.priority);
  return {
    greeting: `Good day, ${user.firstName}`,
    role: user.role,
    primaryAction: sorted[0] ?? null,
    actions: sorted,
    context: {
      isFieldReady: user.isFieldReady,
      lifecycleState: user.lifecycleState,
      deployment: user.deployments[0]
        ? {
            campaign: user.deployments[0].campaign.name,
            territory: user.deployments[0].territory.name,
          }
        : null,
      eodSubmitted: Boolean(eod),
      openCallbacks,
      activityToday: activity
        ? {
            doorsKnocked: activity.doorsKnocked,
            conversations: activity.conversations,
          }
        : null,
      salesToday,
      incompleteLessons,
      pendingRoleplays,
    },
    performanceSnapshot,
  };
}
