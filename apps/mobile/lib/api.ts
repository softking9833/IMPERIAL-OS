import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

type AuthUserSummary = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  identityState: string;
  lifecycleState: string;
  activePerspective: string;
  activeScopeId: string | null;
  activeScopeLabel: string | null;
  isFieldReady: boolean;
};

type LoginResponse = {
  token: string;
  user: AuthUserSummary;
};

const TOKEN_KEY = "imperial_token";

/** Live API used by release APKs (no Expo Go / no localhost). */
export const PRODUCTION_API_URL =
  "https://imperial-os-production.up.railway.app";

function defaultApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // Dev only: talk to a machine-local API.
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    if (Platform.OS === "android") return "http://10.0.2.2:4000";
    return "http://localhost:4000";
  }

  // Release APK / production builds always hit the hosted API.
  return PRODUCTION_API_URL;
}

export const API_URL = defaultApiUrl();

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
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
  home: () =>
    request<{
      home: {
        greeting: string;
        primaryAction: { title: string; detail: string; href: string } | null;
        actions: Array<{ code: string; title: string; detail: string; href: string }>;
        context: {
          isFieldReady: boolean;
          lifecycleState: string;
          deployment: { campaign: string; territory: string } | null;
          eodSubmitted: boolean;
          openCallbacks: number;
          salesToday: number;
          activityToday: { doorsKnocked: number; conversations: number } | null;
        };
        performanceSnapshot: {
          predictedProfitPence: number;
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
      endOfDay: { id: string; status: string } | null;
    }>("/field/today"),
  saveActivity: (body: {
    doorsKnocked: number;
    conversations: number;
    notes?: string;
    clientRef?: string;
  }) => request("/field/activity", { method: "POST", body: JSON.stringify(body) }),
  recordSale: (body: { campaignId: string; notes?: string; clientRef?: string }) =>
    request("/field/sales", { method: "POST", body: JSON.stringify(body) }),
  createCallback: (body: { addressNote: string; notes?: string; clientRef?: string }) =>
    request("/field/callbacks", { method: "POST", body: JSON.stringify(body) }),
  updateCallback: (id: string, body: { status: "COMPLETED" | "CANCELLED" | "OPEN" }) =>
    request(`/field/callbacks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  submitEndOfDay: (body: {
    wins?: string;
    challenges?: string;
    tomorrowFocus?: string;
    clientRef?: string;
  }) => request("/field/end-of-day", { method: "POST", body: JSON.stringify(body) }),
  lessons: () =>
    request<{
      lessons: Array<{
        id: string;
        title: string;
        contentType: string;
        summary: string | null;
        body: string | null;
        progress: { status: string; quizScore: number | null };
        quiz: {
          passScore: number;
          questions: Array<{
            id: string;
            prompt: string;
            options: Array<{ id: string; text: string }>;
          }>;
        } | null;
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
      { method: "POST", body: JSON.stringify({ answers }) },
    ),
  myPerformance: () =>
    request<{
      performance: {
        kpis: {
          doors: number;
          conversations: number;
          sales: number;
          doorToConversationPct: number;
          conversationToSalePct: number;
        };
        profitability: {
          predictedRevenuePence: number;
          actualRevenuePence: number;
          costPence: number;
          predictedProfitPence: number;
          actualProfitPence: number;
          predictedStatus: string;
          actualStatus: string;
        };
        commercials: { dayRatePence: number };
      };
    }>("/performance/me"),
  myRoleplays: () =>
    request<{
      items: Array<{
        requirement: { id: string; title: string; brief: string | null };
        latestSubmission: {
          status: string;
          content: string;
          feedback: string | null;
        } | null;
      }>;
    }>("/roleplay/me"),
  submitRoleplay: (body: { requirementId: string; content: string }) =>
    request("/roleplay/submit", { method: "POST", body: JSON.stringify(body) }),
  profile: () =>
    request<{
      profile: {
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        isFieldReady: boolean;
        lifecycleState: string;
        dayRatePence: number | null;
        activeDeployment: {
          campaign: { name: string };
          territory: { name: string };
        } | null;
      };
    }>("/profile/me"),
};
