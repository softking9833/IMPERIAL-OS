import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type Lesson = Awaited<ReturnType<typeof api.lessons>>["lessons"][number];

export default function LearnScreen() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.lessons();
      const next = Array.isArray(res?.lessons) ? res.lessons : [];
      setLessons(next);
      if (!selectedIdRef.current && next[0]) setSelectedId(next[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lessons");
      setLessons((prev) => (Array.isArray(prev) ? prev : []));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const safeLessons = Array.isArray(lessons) ? lessons : [];
  const selected = safeLessons.find((l) => l.id === selectedId) ?? null;
  const questions = selected?.quiz?.questions ?? [];

  async function completeLesson() {
    if (!selected || submitting) return;
    if (selected.progress?.status === "COMPLETED") return;
    setSubmitting(true);
    setError(null);
    try {
      await api.completeLesson(selected.id);
      setMessage(`Completed: ${selected.title}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Complete failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitQuiz() {
    if (!selected?.quiz || submitting) return;
    setError(null);
    const payload = questions.map((q) => ({
      questionId: q.id,
      optionId: answers[q.id],
    }));
    if (payload.some((p) => !p.optionId)) {
      setError("Answer every question.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.submitQuiz(selected.id, payload);
      setMessage(
        result.passed
          ? `Passed ${result.score}%`
          : `Score ${result.score}% — need ${result.passScore}%`,
      );
      setAnswers({});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quiz failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && safeLessons.length === 0) {
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
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
      }
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.ok}>{message}</Text> : null}

      {safeLessons.map((lesson) => (
        <Pressable
          key={lesson.id}
          style={[styles.card, selectedId === lesson.id && styles.selected]}
          onPress={() => {
            setSelectedId(lesson.id);
            setAnswers({});
            setError(null);
          }}
        >
          <Text style={styles.cardTitle}>{lesson.title}</Text>
          <Text style={styles.muted}>
            {lesson.contentType} · {lesson.progress?.status ?? "NOT_STARTED"}
            {lesson.progress?.quizScore != null ? ` · ${lesson.progress.quizScore}%` : ""}
          </Text>
        </Pressable>
      ))}

      {selected ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selected.title}</Text>
          {selected.summary ? <Text style={styles.muted}>{selected.summary}</Text> : null}
          {selected.body ? <Text style={styles.body}>{selected.body}</Text> : null}

          {selected.quiz && questions.length > 0 ? (
            <>
              {questions.map((q) => (
                <View key={q.id} style={{ marginTop: 12 }}>
                  <Text style={styles.cardTitle}>{q.prompt}</Text>
                  {(q.options ?? []).map((opt) => (
                    <Pressable
                      key={opt.id}
                      style={[
                        styles.option,
                        answers[q.id] === opt.id && styles.optionActive,
                      ]}
                      onPress={() => setAnswers({ ...answers, [q.id]: opt.id })}
                      disabled={submitting}
                    >
                      <Text style={styles.optionText}>{opt.text}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
              <Pressable
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={submitQuiz}
                disabled={submitting}
              >
                <Text style={styles.buttonText}>
                  {submitting ? "Submitting…" : "Submit quiz"}
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={completeLesson}
              disabled={submitting || selected.progress?.status === "COMPLETED"}
            >
              <Text style={styles.buttonText}>
                {selected.progress?.status === "COMPLETED"
                  ? "Already completed"
                  : submitting
                    ? "Saving…"
                    : "Mark complete"}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}
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
  },
  selected: { borderColor: colors.accent },
  cardTitle: { color: colors.text, fontWeight: "700" },
  muted: { color: colors.muted, marginTop: 4 },
  body: { color: colors.text, marginTop: 10, lineHeight: 20 },
  option: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
  },
  optionActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(196,163,90,0.12)",
  },
  optionText: { color: colors.text },
  button: {
    marginTop: 14,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#1A150B", fontWeight: "700" },
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
});
