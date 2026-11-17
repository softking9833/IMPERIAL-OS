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
import { useFocusEffect, router } from "expo-router";
import { api, setToken } from "@/lib/api";
import { colors, gbp } from "@/lib/theme";

export default function MoreScreen() {
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof api.profile>>["profile"] | null>(
    null,
  );
  const [roleplays, setRoleplays] = useState<
    Awaited<ReturnType<typeof api.myRoleplays>>["items"]
  >([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [p, r] = await Promise.all([api.profile(), api.myRoleplays()]);
      setProfile(p.profile);
      setRoleplays(r.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function submit(requirementId: string) {
    const content = drafts[requirementId]?.trim() ?? "";
    if (content.length < 10) {
      setError("Write at least a short script (10+ characters).");
      return;
    }
    try {
      await api.submitRoleplay({ requirementId, content });
      setMessage("Roleplay submitted for review.");
      setDrafts((d) => ({ ...d, [requirementId]: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    }
  }

  async function logout() {
    await setToken(null);
    router.replace("/login");
  }

  if (loading && !profile) {
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
      {message ? <Text style={styles.ok}>{message}</Text> : null}

      {profile ? (
        <View style={styles.card}>
          <Text style={styles.title}>
            {profile.firstName} {profile.lastName}
          </Text>
          <Text style={styles.muted}>{profile.email}</Text>
          <Text style={styles.muted}>
            {profile.role.replaceAll("_", " ")} · {profile.lifecycleState}
          </Text>
          <Text style={styles.muted}>
            Field Ready: {profile.isFieldReady ? "Yes" : "No"} · Day rate:{" "}
            {profile.dayRatePence != null ? gbp(profile.dayRatePence) : "—"}
          </Text>
          {profile.activeDeployment ? (
            <Text style={styles.muted}>
              Deployment: {profile.activeDeployment.campaign.name} /{" "}
              {profile.activeDeployment.territory.name}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.section}>Roleplay</Text>
      {roleplays.map((item) => (
        <View key={item.requirement.id} style={styles.card}>
          <Text style={styles.title}>{item.requirement.title}</Text>
          <Text style={styles.muted}>{item.requirement.brief}</Text>
          {item.latestSubmission ? (
            <Text style={styles.muted}>
              Latest: {item.latestSubmission.status}
              {item.latestSubmission.feedback
                ? ` · ${item.latestSubmission.feedback}`
                : ""}
            </Text>
          ) : null}
          {item.latestSubmission?.status !== "APPROVED" ? (
            <>
              <TextInput
                style={styles.input}
                multiline
                placeholder="Script / practice notes"
                placeholderTextColor={colors.muted}
                value={drafts[item.requirement.id] ?? ""}
                onChangeText={(v) =>
                  setDrafts((d) => ({ ...d, [item.requirement.id]: v }))
                }
              />
              <Pressable style={styles.button} onPress={() => submit(item.requirement.id)}>
                <Text style={styles.buttonText}>Submit for review</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.okInline}>Approved</Text>
          )}
        </View>
      ))}

      <Pressable style={styles.signOut} onPress={logout}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  center: { flex: 1, justifyContent: "center", backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  title: { color: colors.text, fontWeight: "700", fontSize: 16 },
  muted: { color: colors.muted },
  section: { color: colors.accentStrong, fontWeight: "700", marginTop: 8 },
  input: {
    marginTop: 8,
    minHeight: 90,
    textAlignVertical: "top",
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    padding: 12,
  },
  button: {
    marginTop: 10,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "#1A150B", fontWeight: "700" },
  okInline: { color: "#B6EFCF", marginTop: 8, fontWeight: "700" },
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
