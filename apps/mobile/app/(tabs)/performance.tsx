import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "@/lib/api";
import { colors, gbp } from "@/lib/theme";

type Perf = Awaited<ReturnType<typeof api.myPerformance>>["performance"];

export default function PerformanceScreen() {
  const [perf, setPerf] = useState<Perf | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.myPerformance();
      setPerf(res.performance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load performance");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading && !perf) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {perf ? (
        <>
          <View style={styles.row}>
            <Stat label="Doors" value={String(perf.kpis.doors)} />
            <Stat label="Convos" value={String(perf.kpis.conversations)} />
            <Stat label="Sales" value={String(perf.kpis.sales)} />
          </View>
          <View style={styles.row}>
            <Stat label="Door→Conv" value={`${perf.kpis.doorToConversationPct}%`} />
            <Stat label="Conv→Sale" value={`${perf.kpis.conversationToSalePct}%`} />
            <Stat label="Day rate" value={gbp(perf.commercials.dayRatePence)} />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Predicted</Text>
            <Text style={styles.value}>{gbp(perf.profitability.predictedProfitPence)}</Text>
            <Text style={styles.muted}>
              Revenue {gbp(perf.profitability.predictedRevenuePence)} · Cost{" "}
              {gbp(perf.profitability.costPence)} · {perf.profitability.predictedStatus}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Actual / Realised</Text>
            <Text style={styles.value}>{gbp(perf.profitability.actualProfitPence)}</Text>
            <Text style={styles.muted}>
              Revenue {gbp(perf.profitability.actualRevenuePence)} ·{" "}
              {perf.profitability.actualStatus}
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, justifyContent: "center", backgroundColor: colors.bg },
  row: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  statValue: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  title: { color: colors.muted },
  value: { color: colors.text, fontSize: 28, fontWeight: "800", marginVertical: 6 },
  muted: { color: colors.muted },
  error: {
    color: "#F0B0B0",
    backgroundColor: "rgba(196,91,91,0.15)",
    borderRadius: 10,
    padding: 10,
  },
});
