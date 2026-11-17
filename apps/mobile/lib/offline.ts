import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { api } from "./api";

const QUEUE_KEY = "imperial_field_queue";
const CACHE_KEY = "imperial_field_cache";
const SIM_OFFLINE_KEY = "imperial_simulate_offline";

export type SyncStatus =
  | "SAVED_LOCAL"
  | "PENDING"
  | "SYNCING"
  | "SYNCED"
  | "FAILED";

export type FieldCache = Awaited<ReturnType<typeof api.fieldToday>>;

export type QueueItem =
  | {
      id: string;
      type: "activity";
      status: SyncStatus;
      error?: string;
      createdAt: string;
      payload: {
        doorsKnocked: number;
        conversations: number;
        notes?: string;
        clientRef: string;
      };
    }
  | {
      id: string;
      type: "sale";
      status: SyncStatus;
      error?: string;
      createdAt: string;
      payload: { campaignId: string; notes?: string; clientRef: string };
    }
  | {
      id: string;
      type: "callback_create";
      status: SyncStatus;
      error?: string;
      createdAt: string;
      payload: { addressNote: string; notes?: string; clientRef: string };
    }
  | {
      id: string;
      type: "callback_update";
      status: SyncStatus;
      error?: string;
      createdAt: string;
      payload: {
        idOrRef: string;
        status: "COMPLETED" | "CANCELLED" | "OPEN";
        clientRef: string;
      };
    }
  | {
      id: string;
      type: "eod";
      status: SyncStatus;
      error?: string;
      createdAt: string;
      payload: {
        wins?: string;
        challenges?: string;
        tomorrowFocus?: string;
        clientRef: string;
      };
    };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function newClientRef(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function dayClientRef(prefix: "day" | "eod") {
  return `${prefix}-${todayKey()}`;
}

export async function getSimulateOffline() {
  return (await AsyncStorage.getItem(SIM_OFFLINE_KEY)) === "1";
}

export async function setSimulateOffline(value: boolean) {
  await AsyncStorage.setItem(SIM_OFFLINE_KEY, value ? "1" : "0");
}

export async function isOnline() {
  if (await getSimulateOffline()) return false;
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export async function getQueue(): Promise<QueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueueItem[];
  } catch {
    return [];
  }
}

async function saveQueue(items: QueueItem[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function getCachedField(): Promise<FieldCache | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FieldCache;
  } catch {
    return null;
  }
}

export async function setCachedField(data: FieldCache) {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

export async function enqueue(
  item: Omit<QueueItem, "id" | "status" | "createdAt" | "error"> & {
    id?: string;
  },
): Promise<QueueItem> {
  const queue = await getQueue();
  const full = {
    ...item,
    id: item.id ?? newClientRef("q"),
    status: "PENDING" as const,
    createdAt: new Date().toISOString(),
  } as QueueItem;

  // Activity/EOD: keep one pending item per day clientRef (latest wins).
  if (full.type === "activity" || full.type === "eod") {
    const filtered = queue.filter(
      (q) =>
        !(
          q.type === full.type &&
          q.payload.clientRef === full.payload.clientRef &&
          (q.status === "PENDING" || q.status === "FAILED" || q.status === "SAVED_LOCAL")
        ),
    );
    filtered.push(full);
    await saveQueue(filtered);
    return full;
  }

  queue.push(full);
  await saveQueue(queue);
  return full;
}

export function pendingCount(queue: QueueItem[]) {
  return queue.filter((q) => q.status === "PENDING" || q.status === "FAILED" || q.status === "SAVED_LOCAL")
    .length;
}

async function mark(
  id: string,
  status: SyncStatus,
  error?: string,
) {
  const queue = await getQueue();
  const next = queue.map((q) =>
    q.id === id ? { ...q, status, error: error ?? undefined } : q,
  );
  await saveQueue(next);
}

export async function clearSynced() {
  const queue = await getQueue();
  await saveQueue(queue.filter((q) => q.status !== "SYNCED"));
}

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  if (!(await isOnline())) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const queue = await getQueue();

  for (const item of queue) {
    if (item.status === "SYNCED") continue;
    await mark(item.id, "SYNCING");
    try {
      if (item.type === "activity") {
        await api.saveActivity(item.payload);
      } else if (item.type === "sale") {
        await api.recordSale(item.payload);
      } else if (item.type === "callback_create") {
        await api.createCallback(item.payload);
      } else if (item.type === "callback_update") {
        await api.updateCallback(item.payload.idOrRef, {
          status: item.payload.status,
        });
      } else if (item.type === "eod") {
        await api.submitEndOfDay(item.payload);
      }
      await mark(item.id, "SYNCED");
      synced += 1;
    } catch (err) {
      await mark(
        item.id,
        "FAILED",
        err instanceof Error ? err.message : "Sync failed",
      );
      failed += 1;
    }
  }

  await clearSynced();
  return { synced, failed };
}

export async function loadFieldWithOffline(): Promise<{
  data: FieldCache;
  offline: boolean;
  fromCache: boolean;
}> {
  const online = await isOnline();
  if (online) {
    try {
      const data = await api.fieldToday();
      await setCachedField(data);
      await syncQueue();
      const refreshed = await api.fieldToday();
      await setCachedField(refreshed);
      return { data: refreshed, offline: false, fromCache: false };
    } catch {
      const cached = await getCachedField();
      if (cached) return { data: cached, offline: true, fromCache: true };
      throw new Error("Unable to load Field and no offline cache yet.");
    }
  }

  const cached = await getCachedField();
  if (!cached) {
    throw new Error(
      "Offline and no cached campaign/territory yet. Open Field once while online first.",
    );
  }
  return { data: cached, offline: true, fromCache: true };
}

export async function saveFieldAction<T extends QueueItem["type"]>(
  type: T,
  payload: Extract<QueueItem, { type: T }>["payload"],
): Promise<{ queued: boolean; offline: boolean }> {
  const online = await isOnline();
  if (!online) {
    await enqueue({ type, payload } as Omit<QueueItem, "id" | "status" | "createdAt" | "error">);
    // Keep local cache optimistic for sales/callbacks counts.
    const cached = await getCachedField();
    if (cached) {
      if (type === "activity") {
        const p = payload as Extract<QueueItem, { type: "activity" }>["payload"];
        cached.activity = {
          doorsKnocked: p.doorsKnocked,
          conversations: p.conversations,
          notes: p.notes ?? null,
        };
      } else if (type === "sale") {
        cached.sales = [
          {
            id: (payload as Extract<QueueItem, { type: "sale" }>["payload"]).clientRef,
            valuePence: cached.deployment?.campaign.saleValuePence ?? 0,
            status: "RECORDED",
          },
          ...cached.sales,
        ];
      } else if (type === "callback_create") {
        const p = payload as Extract<QueueItem, { type: "callback_create" }>["payload"];
        cached.callbacks = [
          {
            id: p.clientRef,
            status: "OPEN",
            addressNote: p.addressNote,
            notes: p.notes ?? null,
          },
          ...cached.callbacks,
        ];
      } else if (type === "callback_update") {
        const p = payload as Extract<QueueItem, { type: "callback_update" }>["payload"];
        cached.callbacks = cached.callbacks.map((cb) =>
          cb.id === p.idOrRef ? { ...cb, status: p.status } : cb,
        );
      } else if (type === "eod") {
        cached.endOfDay = { id: (payload as Extract<QueueItem, { type: "eod" }>["payload"]).clientRef, status: "SUBMITTED" };
      }
      await setCachedField(cached);
    }
    return { queued: true, offline: true };
  }

  try {
    if (type === "activity") await api.saveActivity(payload as Extract<QueueItem, { type: "activity" }>["payload"]);
    else if (type === "sale") await api.recordSale(payload as Extract<QueueItem, { type: "sale" }>["payload"]);
    else if (type === "callback_create")
      await api.createCallback(payload as Extract<QueueItem, { type: "callback_create" }>["payload"]);
    else if (type === "callback_update") {
      const p = payload as Extract<QueueItem, { type: "callback_update" }>["payload"];
      await api.updateCallback(p.idOrRef, { status: p.status });
    } else if (type === "eod")
      await api.submitEndOfDay(payload as Extract<QueueItem, { type: "eod" }>["payload"]);
    return { queued: false, offline: false };
  } catch (err) {
    await enqueue({
      type,
      payload,
    } as Omit<QueueItem, "id" | "status" | "createdAt" | "error">);
    return { queued: true, offline: true };
  }
}
