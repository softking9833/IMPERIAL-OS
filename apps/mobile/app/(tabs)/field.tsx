import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { colors, gbp } from "@/lib/theme";
import {
  dayClientRef,
  getQueue,
  getSimulateOffline,
  loadFieldWithOffline,
  newClientRef,
  pendingCount,
  saveFieldAction,
  setSimulateOffline,
  syncQueue,
  type FieldCache,
  type QueueItem,
} from "@/lib/offline";

export default function FieldScreen() {
  const [field, setField] = useState<FieldCache | null>(null);
  const [doors, setDoors] = useState("0");
  const [conversations, setConversations] = useState("0");
  const [notes, setNotes] = useState("");
  const [callbackAddress, setCallbackAddress] = useState("");
  const [eod, setEod] = useState({ wins: "", challenges: "", tomorrowFocus: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [simulateOffline, setSimulate] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const refreshQueue = useCallback(async () => {
    setQueue(await getQueue());
    setSimulate(await getSimulateOffline());
  }, []);

  const applyField = useCallback((data: FieldCache) => {
    setField(data);
    setDoors(String(data.activity?.doorsKnocked ?? 0));
    setConversations(String(data.activity?.conversations ?? 0));
    setNotes(data.activity?.notes ?? "");
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await loadFieldWithOffline();
      applyField(result.data);
      setOffline(result.offline);
      if (result.fromCache) {
        setMessage("Offline — showing last loaded Field data. New entries stay on device until sync.");
      }
      await refreshQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load field");
    } finally {
      setLoading(false);
    }
  }, [applyField, refreshQueue]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function toggleSimulateOffline() {
    const next = !simulateOffline;
    await setSimulateOffline(next);
    setSimulate(next);
    setMessage(
      next
        ? "Simulate offline ON — Field actions save locally."
        : "Simulate offline OFF — syncing if online.",
    );
    await load();
  }

  async function onSyncNow() {
    if (await getSimulateOffline()) {
      setError("Turn off Simulate offline before syncing.");
      return;
    }
    setMessage("Syncing…");
    const result = await syncQueue();
    await refreshQueue();
    await load();
    setMessage(
      result.failed
        ? `Synced ${result.synced}, failed ${result.failed}.`
        : result.synced
          ? `Synced ${result.synced} pending item(s).`
          : "Nothing pending to sync.",
    );
  }

  async function saveActivity() {
    try {
      const result = await saveFieldAction("activity", {
        doorsKnocked: Number(doors) || 0,
        conversations: Number(conversations) || 0,
        notes,
        clientRef: dayClientRef("day"),
      });
      setMessage(
        result.queued
          ? "Activity saved locally — pending sync."
          : "Activity synced.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function recordSale() {
    if (!field?.deployment) return;
    try {
      const result = await saveFieldAction("sale", {
        campaignId: field.deployment.campaign.id,
        notes: "Mobile field sale",
        clientRef: newClientRef("sale"),
      });
      setMessage(result.queued ? "Sale saved locally — pending sync." : "Sale synced.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sale failed");
    }
  }

  async function addCallback() {
    if (!callbackAddress.trim()) {
      setError("Enter a callback address / location.");
      return;
    }
    try {
      const result = await saveFieldAction("callback_create", {
        addressNote: callbackAddress.trim(),
        clientRef: newClientRef("cb"),
      });
      setCallbackAddress("");
      setMessage(
        result.queued ? "Callback saved locally — pending sync." : "Callback synced.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Callback failed");
    }
  }

  async function completeCallback(id: string) {
    try {
      const result = await saveFieldAction("callback_update", {
        idOrRef: id,
        status: "COMPLETED",
        clientRef: newClientRef("cbupd"),
      });
      setMessage(
        result.queued ? "Callback update saved locally — pending sync." : "Callback updated.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function submitEod() {
    try {
      const result = await saveFieldAction("eod", {
        ...eod,
        clientRef: dayClientRef("eod"),
      });
      setMessage(
        result.queued
          ? "End of Day saved locally — pending sync."
          : "End of Day synced.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "EOD failed");
    }
  }

  if (loading && !field) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const pending = pendingCount(queue);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
      }
    >
      <View style={[styles.banner, offline ? styles.bannerOffline : styles.bannerOnline]}>
        <Text style={styles.bannerText}>
          {offline ? "Offline / local save mode" : "Online"}
          {pending ? ` · ${pending} pending sync` : ""}
        </Text>
        <View style={styles.bannerActions}>
          <Pressable style={styles.bannerBtn} onPress={toggleSimulateOffline}>
            <Text style={styles.bannerBtnText}>
              {simulateOffline ? "Stop simulate offline" : "Simulate offline"}
            </Text>
          </Pressable>
          {pending > 0 ? (
            <Pressable style={styles.bannerBtn} onPress={onSyncNow}>
              <Text style={styles.bannerBtnText}>Sync now</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.ok}>{message}</Text> : null}

      {queue.filter((q) => q.status !== "SYNCED").length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sync queue</Text>
          {queue
            .filter((q) => q.status !== "SYNCED")
            .map((q) => (
              <Text key={q.id} style={styles.muted}>
                {q.type} · {q.status}
                {q.error ? ` · ${q.error}` : ""}
              </Text>
            ))}
        </View>
      ) : null}

      {!field?.isFieldReady ? (
        <Text style={styles.muted}>Complete Field Readiness before entering Field.</Text>
      ) : !field.deployment ? (
        <Text style={styles.muted}>No active deployment yet.</Text>
      ) : (
        <>
          <Text style={styles.title}>
            {field.deployment.campaign.name} · {field.deployment.territory.name}
          </Text>

          <Text style={styles.label}>Doors</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={doors}
            onChangeText={setDoors}
          />
          <Text style={styles.label}>Conversations</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={conversations}
            onChangeText={setConversations}
          />
          <Text style={styles.label}>Notes</Text>
          <TextInput style={styles.input} value={notes} onChangeText={setNotes} />

          <Pressable style={styles.button} onPress={saveActivity}>
            <Text style={styles.buttonText}>Save activity</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={recordSale}>
            <Text style={styles.secondaryText}>
              Record sale ({gbp(field.deployment.campaign.saleValuePence)})
            </Text>
          </Pressable>
          <Text style={styles.muted}>Sales today: {field.sales.length}</Text>

          <Text style={styles.section}>Callbacks</Text>
          <TextInput
            style={styles.input}
            placeholder="Address / location"
            placeholderTextColor={colors.muted}
            value={callbackAddress}
            onChangeText={setCallbackAddress}
          />
          <Pressable style={styles.button} onPress={addCallback}>
            <Text style={styles.buttonText}>Add callback</Text>
          </Pressable>
          {field.callbacks.map((cb) => (
            <View key={cb.id} style={styles.card}>
              <Text style={styles.cardTitle}>{cb.addressNote}</Text>
              <Text style={styles.muted}>{cb.status}</Text>
              {cb.status === "OPEN" ? (
                <Pressable style={styles.secondary} onPress={() => completeCallback(cb.id)}>
                  <Text style={styles.secondaryText}>Mark completed</Text>
                </Pressable>
              ) : null}
            </View>
          ))}

          <Text style={styles.section}>End of Day</Text>
          <TextInput
            style={styles.input}
            placeholder="Wins"
            placeholderTextColor={colors.muted}
            value={eod.wins}
            onChangeText={(v) => setEod({ ...eod, wins: v })}
          />
          <TextInput
            style={styles.input}
            placeholder="Challenges"
            placeholderTextColor={colors.muted}
            value={eod.challenges}
            onChangeText={(v) => setEod({ ...eod, challenges: v })}
          />
          <TextInput
            style={styles.input}
            placeholder="Tomorrow focus"
            placeholderTextColor={colors.muted}
            value={eod.tomorrowFocus}
            onChangeText={(v) => setEod({ ...eod, tomorrowFocus: v })}
          />
          <Pressable style={styles.button} onPress={submitEod}>
            <Text style={styles.buttonText}>
              {field.endOfDay ? "Update End of Day" : "Submit End of Day"}
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40, gap: 8 },
  center: { flex: 1, justifyContent: "center", backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  section: { color: colors.accentStrong, marginTop: 14, fontWeight: "700" },
  label: { color: colors.muted, marginTop: 6 },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "#1A150B", fontWeight: "700" },
  secondary: {
    marginTop: 8,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  secondaryText: { color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  cardTitle: { color: colors.text, fontWeight: "700" },
  muted: { color: colors.muted },
  error: {
    color: "#F0B0B0",
    backgroundColor: "rgba(196,91,91,0.15)",
    borderRadius: 10,
    padding: 10,
  },
  ok: {
    color: "#B6EFCF",
    backgroundColor: "rgba(61,154,106,0.15)",
    borderRadius: 10,
    padding: 10,
  },
  banner: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  bannerOnline: {
    backgroundColor: "rgba(61,154,106,0.12)",
    borderColor: "rgba(61,154,106,0.35)",
  },
  bannerOffline: {
    backgroundColor: "rgba(196,163,90,0.12)",
    borderColor: "rgba(196,163,90,0.45)",
  },
  bannerText: { color: colors.text, fontWeight: "700" },
  bannerActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bannerBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerBtnText: { color: colors.text, fontSize: 12, fontWeight: "600" },
});
