import type { AuthUserSummary, LoginResponse } from "@imperial/shared";

/**
 * Resolve API base URL for local + LAN access.
 * - Explicit NEXT_PUBLIC_API_URL always wins
 * - On another PC via http://172.x.x.x:3000, use that same host on :4000
 *   (localhost would point at the *client* machine and cause "Failed to fetch")
 */
function resolveApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:4000`;
    }
  }
  return "http://localhost:4000";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("imperial_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("imperial_token", token);
  else localStorage.removeItem("imperial_token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${resolveApiUrl()}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: AuthUserSummary }>("/auth/me"),
  overview: () =>
    request<{
      overview: Record<string, number>;
      recentAudit: Array<{
        id: string;
        action: string;
        entityType: string;
        createdAt: string;
        actor: { firstName: string; lastName: string; email: string } | null;
      }>;
    }>("/admin/overview"),
  users: () =>
    request<{
      users: Array<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        identityState: string;
        lifecycleState: string;
        isFieldReady: boolean;
        deployments: Array<{
          campaign: { name: string };
          territory: { name: string };
        }>;
      }>;
    }>("/users"),
  createUser: (body: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: "JUNIOR_ASSOCIATE" | "ASSOCIATE" | "MANAGING_DIRECTOR";
  }) => request("/users", { method: "POST", body: JSON.stringify(body) }),
  campaigns: () =>
    request<{
      campaigns: Array<{
        id: string;
        name: string;
        clientName: string | null;
        saleValuePence: number;
        territories: Array<{ id: string; name: string }>;
        funnelStages: Array<{ id: string; name: string; code: string }>;
        _count: { deployments: number };
      }>;
    }>("/campaigns"),
  createCampaign: (body: {
    name: string;
    clientName?: string;
    saleValuePence: number;
  }) => request("/campaigns", { method: "POST", body: JSON.stringify(body) }),
  createTerritory: (campaignId: string, body: { name: string; description?: string }) =>
    request(`/campaigns/${campaignId}/territories`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deploy: (body: { userId: string; campaignId: string; territoryId: string }) =>
    request("/campaigns/deployments", { method: "POST", body: JSON.stringify(body) }),
  readinessQueue: () =>
    request<{
      awaiting: Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        requirementProgress: Array<{
          status: string;
          requirement: { title: string; requirementType: string };
        }>;
      }>;
    }>("/readiness/queue"),
  approveReadiness: (userId: string, decision: "APPROVED" | "RETURNED", feedback?: string) =>
    request(`/readiness/${userId}/approve`, {
      method: "POST",
      body: JSON.stringify({ decision, feedback }),
    }),
  myReadiness: () =>
    request<{
      isFieldReady: boolean;
      lifecycleState: string;
      pendingApproval: boolean;
      requirements: Array<{
        id: string;
        status: string;
        requirement: {
          title: string;
          description: string | null;
          requirementType: string;
          isMandatory: boolean;
        };
      }>;
    }>("/readiness/me"),
  completeRequirement: (progressId: string) =>
    request(`/readiness/me/${progressId}/complete`, { method: "POST" }),
  home: () =>
    request<{
      home: {
        greeting: string;
        role: string;
        primaryAction: {
          code: string;
          title: string;
          detail: string;
          href: string;
        } | null;
        actions: Array<{
          code: string;
          title: string;
          detail: string;
          href: string;
          priority: number;
        }>;
        context: {
          isFieldReady: boolean;
          lifecycleState: string;
          deployment: { campaign: string; territory: string } | null;
          eodSubmitted: boolean;
          openCallbacks: number;
          activityToday: { doorsKnocked: number; conversations: number } | null;
          salesToday: number;
          incompleteLessons: number;
        };
        performanceSnapshot: {
          predictedProfitPence: number;
          actualProfitPence: number;
          predictedStatus: string;
          doors: number;
          sales: number;
        } | null;
      };
    }>("/home"),
  fieldToday: () =>
    request<{
      isFieldReady: boolean;
      deployment: {
        campaign: { id: string; name: string; saleValuePence: number };
        territory: { name: string };
      } | null;
      activity: {
        doorsKnocked: number;
        conversations: number;
        notes: string | null;
      } | null;
      sales: Array<{ id: string; valuePence: number; status: string }>;
      callbacks: Array<{
        id: string;
        status: string;
        addressNote: string | null;
        notes: string | null;
      }>;
      endOfDay: {
        id: string;
        wins: string | null;
        challenges: string | null;
        tomorrowFocus: string | null;
        status: string;
      } | null;
    }>("/field/today"),
  createCallback: (body: { addressNote: string; notes?: string }) =>
    request("/field/callbacks", { method: "POST", body: JSON.stringify(body) }),
  updateCallback: (id: string, body: { status: "OPEN" | "COMPLETED" | "CANCELLED"; notes?: string }) =>
    request(`/field/callbacks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  submitEndOfDay: (body: {
    wins?: string;
    challenges?: string;
    tomorrowFocus?: string;
  }) => request("/field/end-of-day", { method: "POST", body: JSON.stringify(body) }),
  saveActivity: (body: {
    doorsKnocked: number;
    conversations: number;
    notes?: string;
  }) =>
    request("/field/activity", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  recordSale: (body: { campaignId: string; notes?: string }) =>
    request("/field/sales", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  lessons: () =>
    request<{
      lessons: Array<{
        id: string;
        title: string;
        contentType: string;
        summary: string | null;
        body: string | null;
        videoUrl: string | null;
        curriculum: { id: string; name: string; kind: string } | null;
        quiz: {
          passScore: number;
          questions: Array<{
            id: string;
            prompt: string;
            options: Array<{ id: string; text: string }>;
          }>;
        } | null;
        progress: {
          status: string;
          quizScore: number | null;
          quizPassed: boolean | null;
          completedAt: string | null;
        };
      }>;
    }>("/learn/lessons"),
  completeLesson: (lessonId: string) =>
    request(`/learn/lessons/${lessonId}/complete`, { method: "POST" }),
  submitQuiz: (
    lessonId: string,
    answers: Array<{ questionId: string; optionId: string }>,
  ) =>
    request<{ score: number; passed: boolean; passScore: number }>(
      `/learn/lessons/${lessonId}/quiz`,
      {
        method: "POST",
        body: JSON.stringify({ answers }),
      },
    ),
  createLesson: (body: {
    title: string;
    contentType: "LESSON" | "VIDEO" | "QUIZ";
    summary?: string;
    body?: string;
    videoUrl?: string;
  }) => request("/learn", { method: "POST", body: JSON.stringify(body) }),
  myPerformance: () =>
    request<{
      performance: {
        name: string;
        kpis: {
          doors: number;
          conversations: number;
          sales: number;
          daysWorked: number;
          doorToConversationPct: number;
          conversationToSalePct: number;
          doorToSalePct: number;
        };
        commercials: { dayRatePence: number; breakEvenSalesPerDay: number | null };
        profitability: {
          predictedRevenuePence: number;
          actualRevenuePence: number;
          costPence: number;
          predictedProfitPence: number;
          actualProfitPence: number;
          predictedStatus: string;
          actualStatus: string;
        };
        sales: Array<{
          id: string;
          status: string;
          valuePence: number;
          saleDate: string;
          campaignName: string;
          isActual: boolean;
        }>;
      };
    }>("/performance/me"),
  companyPerformance: () =>
    request<{
      company: {
        doors: number;
        conversations: number;
        sales: number;
        predictedRevenuePence: number;
        actualRevenuePence: number;
        costPence: number;
        predictedProfitPence: number;
        actualProfitPence: number;
        associates: number;
      };
      associates: Array<{
        userId: string;
        name: string;
        kpis: { doors: number; conversations: number; sales: number };
        profitability: {
          predictedProfitPence: number;
          actualProfitPence: number;
          predictedStatus: string;
          actualStatus: string;
        };
        sales: Array<{
          id: string;
          status: string;
          valuePence: number;
          campaignName: string;
          isActual: boolean;
        }>;
      }>;
    }>("/performance/company"),
  updateSaleStatus: (
    saleId: string,
    status:
      | "RECORDED"
      | "PROCESSING"
      | "VERIFICATION"
      | "PAYABLE"
      | "PAID"
      | "CANCELLED"
      | "REJECTED",
  ) =>
    request(`/performance/sales/${saleId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  profile: () =>
    request<{
      profile: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        identityState: string;
        lifecycleState: string;
        isFieldReady: boolean;
        activePerspective: string;
        activeScope: { id: string; name: string; type: string } | null;
        authorisedPerspectives: string[];
        dayRatePence: number | null;
        activeDeployment: {
          campaign: { name: string };
          territory: { name: string };
          status: string;
        } | null;
        timeline: Array<{ code: string; label: string; at: string }>;
        roleplays: Array<{
          id: string;
          status: string;
          content: string;
          feedback: string | null;
          requirement: { title: string };
        }>;
        recentLearning: Array<{
          status: string;
          lesson: { title: string; contentType: string };
        }>;
        performance: {
          profitability: {
            predictedProfitPence: number;
            actualProfitPence: number;
            predictedStatus: string;
          };
          kpis: { doors: number; sales: number };
        } | null;
      };
    }>("/profile/me"),
  updateProfile: (body: { firstName?: string; lastName?: string }) =>
    request("/profile/me", { method: "PATCH", body: JSON.stringify(body) }),
  myRoleplays: () =>
    request<{
      items: Array<{
        requirement: {
          id: string;
          title: string;
          brief: string | null;
          isMandatory: boolean;
        };
        latestSubmission: {
          id: string;
          status: string;
          content: string;
          feedback: string | null;
          submittedAt: string;
        } | null;
      }>;
    }>("/roleplay/me"),
  submitRoleplay: (body: { requirementId: string; content: string }) =>
    request("/roleplay/submit", { method: "POST", body: JSON.stringify(body) }),
  roleplayQueue: () =>
    request<{
      queue: Array<{
        id: string;
        content: string;
        submittedAt: string;
        requirement: { title: string; brief: string | null };
        user: { firstName: string; lastName: string; email: string };
      }>;
    }>("/roleplay/queue"),
  reviewRoleplay: (
    submissionId: string,
    body: { decision: "APPROVED" | "RETURNED"; feedback?: string },
  ) =>
    request(`/roleplay/${submissionId}/review`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createRoleplayRequirement: (body: {
    title: string;
    brief?: string;
    isMandatory?: boolean;
  }) => request("/roleplay", { method: "POST", body: JSON.stringify(body) }),
  adminConfig: () =>
    request<{
      curricula: Array<{
        id: string;
        name: string;
        kind: string;
        description: string | null;
        lessons: Array<{ id: string; title: string; contentType: string; sortOrder: number }>;
        requirements: Array<{
          id: string;
          title: string;
          requirementType: string;
          lesson: { id: string; title: string } | null;
        }>;
      }>;
      campaigns: Array<{
        id: string;
        name: string;
        clientName: string | null;
        saleValuePence: number;
        realisedSaleStatuses: string;
        expectedPaymentDays: number | null;
        status: string;
        funnelStages: Array<{ id: string; name: string; code: string; sortOrder: number }>;
      }>;
      associates: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        dayRatePence: number | null;
      }>;
      rules: Array<{
        id: string;
        key: string;
        description: string | null;
        value: unknown;
      }>;
    }>("/admin/config"),
  createCurriculum: (body: {
    name: string;
    kind?: "FIELD_READINESS" | "ONGOING" | "CAMPAIGN";
    description?: string;
  }) => request("/admin/curricula", { method: "POST", body: JSON.stringify(body) }),
  addCurriculumLesson: (
    curriculumId: string,
    body: {
      title: string;
      contentType?: "LESSON" | "VIDEO" | "QUIZ";
      summary?: string;
      body?: string;
      videoUrl?: string;
      sortOrder?: number;
    },
  ) =>
    request(`/admin/curricula/${curriculumId}/lessons`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateCampaignCommercials: (
    campaignId: string,
    body: {
      saleValuePence?: number;
      realisedSaleStatuses?: string;
      expectedPaymentDays?: number | null;
      clientName?: string;
    },
  ) =>
    request(`/admin/campaigns/${campaignId}/commercials`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  updateCampaignFunnel: (
    campaignId: string,
    stages: Array<{ name: string; code: string; sortOrder?: number }>,
  ) =>
    request(`/admin/campaigns/${campaignId}/funnel`, {
      method: "PUT",
      body: JSON.stringify({ stages }),
    }),
  setDayRate: (userId: string, body: { dayRatePence: number }) =>
    request(`/admin/associates/${userId}/day-rate`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  upsertBusinessRule: (key: string, body: { value: unknown; description?: string }) =>
    request(`/admin/business-rules/${key}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};
