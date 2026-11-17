import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { api, setToken } from "@/lib/api";
import { colors, gbp } from "@/lib/theme";

type HomeData = Awaited<ReturnType<typeof api.home>>["home"];

function mapHref(href: string) {
  if (href.includes("field")) return "/(tabs)/field";
  if (href.includes("learn")) return "/(tabs)/learn";
  if (href.includes("performance")) return "/(tabs)/performance";
  if (href.includes("roleplay") || href.includes("profile")) return "/(tabs)/more";
  return "/(tabs)/home";
}

export default function HomeScreen() {
  const [home, setHome] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.home();
      setHome(res.home);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load home");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function logout() {
    await setToken(null);
    router.replace("/login");
  }

  if (loading && !home) {
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
      {home ? (
        <>
          <Text style={styles.greeting}>{home.greeting}</Text>
          <Text style={styles.muted}>
            {home.context.lifecycleState}
            {home.context.deployment
              ? ` · ${home.context.deployment.campaign} / ${home.context.deployment.territory}`
              : ""}
          </Text>

          {home.primaryAction ? (
            <View style={[styles.card, styles.primaryCard]}>
              <Text style={styles.cardLabel}>Primary action</Text>
              <Text style={styles.cardTitle}>{home.primaryAction.title}</Text>
              <Text style={styles.muted}>{home.primaryAction.detail}</Text>
              <Pressable
                style={styles.button}
                onPress={() => router.push(mapHref(home.primaryAction!.href))}
              >
                <Text style={styles.buttonText}>Go</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Field Ready</Text>
              <Text style={styles.statValue}>{home.context.isFieldReady ? "Yes" : "No"}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Doors</Text>
              <Text style={styles.statValue}>
                {home.context.activityToday?.doorsKnocked ?? 0}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Sales</Text>
              <Text style={styles.statValue}>{home.context.salesToday}</Text>
            </View>
          </View>

          {home.performanceSnapshot ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Profitability</Text>
              <Text style={styles.muted}>
                Predicted {gbp(home.performanceSnapshot.predictedProfitPence)} ·{" "}
                {home.performanceSnapshot.predictedStatus}
              </Text>
            </View>
          ) : null}

          <Text style={styles.section}>Today&apos;s actions</Text>
          {home.actions.map((action) => (
            <Pressable
              key={action.code}
              style={styles.card}
              onPress={() => router.push(mapHref(action.href))}
            >
              <Text style={styles.cardTitle}>{action.title}</Text>
              <Text style={styles.muted}>{action.detail}</Text>
            </Pressable>
          ))}

          <Pressable style={styles.signOut} onPress={logout}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, justifyContent: "center", backgroundColor: colors.bg },
  greeting: { color: colors.text, fontSize: 24, fontWeight: "700" },
  muted: { color: colors.muted, marginTop: 4 },
  section: {
    color: colors.accentStrong,
    marginTop: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  primaryCard: { borderColor: "rgba(196,163,90,0.55)" },
  cardLabel: { color: colors.muted, marginBottom: 4 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  button: {
    marginTop: 12,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonText: { color: "#1A150B", fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  statLabel: { color: colors.muted, fontSize: 12 },
  statValue: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 4 },
  error: {
    color: "#F0B0B0",
    backgroundColor: "rgba(196,91,91,0.15)",
    borderRadius: 10,
    padding: 10,
  },
  signOut: {
    marginTop: 8,
    borderColor: "rgba(196,163,90,0.5)",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  signOutText: { color: colors.text },
});
