"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

type Lesson = Awaited<ReturnType<typeof api.lessons>>["lessons"][number];
type DetailTab = "overview" | "content";

function statusLabel(status: string) {
  if (status === "COMPLETED") return "Published";
  if (status === "IN_PROGRESS") return "In progress";
  return "Draft";
}

function statusClass(status: string) {
  if (status === "COMPLETED") return "ok";
  if (status === "IN_PROGRESS") return "warn";
  return "";
}

export default function LearnPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<DetailTab>("overview");
  const [isMd, setIsMd] = useState(false);
  const [form, setForm] = useState({
    title: "",
    contentType: "LESSON" as "LESSON" | "VIDEO" | "QUIZ",
    summary: "",
    body: "",
  });

  async function loadAsCurrentUser() {
    const [me, res] = await Promise.all([api.me(), api.lessons()]);
    setIsMd(me.user.role === "MANAGING_DIRECTOR");
    setLessons(res.lessons);
    if (!selectedId && res.lessons[0]) setSelectedId(res.lessons[0].id);
  }

  useEffect(() => {
    loadAsCurrentUser().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load lessons"),
    );
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lessons;
    return lessons.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        (l.curriculum?.name ?? "").toLowerCase().includes(q) ||
        l.contentType.toLowerCase().includes(q),
    );
  }, [lessons, query]);

  const selected = lessons.find((l) => l.id === selectedId) ?? null;

  async function completeLesson() {
    if (!selected) return;
    setError(null);
    setMessage(null);
    try {
      await api.completeLesson(selected.id);
      setMessage(`Completed: ${selected.title}`);
      await loadAsCurrentUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete lesson");
    }
  }

  async function submitQuiz() {
    if (!selected?.quiz) return;
    setError(null);
    setMessage(null);
    try {
      const payload = selected.quiz.questions.map((q) => ({
        questionId: q.id,
        optionId: answers[q.id],
      }));
      if (payload.some((p) => !p.optionId)) {
        setError("Answer every question before submitting.");
        return;
      }
      const result = await api.submitQuiz(selected.id, payload);
      setMessage(
        result.passed
          ? `Passed with ${result.score}% (pass mark ${result.passScore}%).`
          : `Score ${result.score}%. Need ${result.passScore}% to pass — try again.`,
      );
      await loadAsCurrentUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quiz submit failed");
    }
  }

  async function createLesson(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await api.createLesson(form);
      setForm({ title: "", contentType: "LESSON", summary: "", body: "" });
      setMessage("Lesson created.");
      await loadAsCurrentUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create lesson failed");
    }
  }

  return (
    <AppShell
      title="Learn"
      subtitle="Build skills. Master processes. Drive performance."
    >
      {error ? <div className="error">{error}</div> : null}
      {message ? (
        <div className="card" style={{ marginBottom: 16, borderColor: "rgba(61,154,106,0.45)" }}>
          {message}
        </div>
      ) : null}

      <div className="learn-page">
        {isMd ? (
          <section className="learn-create">
            <div className="ops-card-head">
              <h2>Create lesson</h2>
              <p>Quick authoring. Prefer Admin Config → Curriculum to attach readiness requirements.</p>
            </div>
            <form className="ops-card-form learn-create-form" onSubmit={createLesson}>
              <label>
                Title
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Enter lesson title…"
                  required
                />
              </label>
              <label>
                Type
                <select
                  value={form.contentType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contentType: e.target.value as typeof form.contentType,
                    })
                  }
                >
                  <option value="LESSON">Lesson</option>
                  <option value="VIDEO">Video</option>
                  <option value="QUIZ">Quiz</option>
                </select>
              </label>
              <label>
                Summary
                <input
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  placeholder="Brief description…"
                />
              </label>
              <label>
                Body
                <input
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Lesson content…"
                />
              </label>
              <button className="btn primary ops-card-cta" type="submit">
                Create lesson
              </button>
            </form>
          </section>
        ) : null}

        <section className="learn-workspace">
          <aside className="learn-list">
            <div className="learn-search">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search lessons…"
              />
            </div>
            <div className="learn-list-scroll">
              {filtered.map((lesson) => (
                <button
                  key={lesson.id}
                  type="button"
                  className={`learn-list-item ${selectedId === lesson.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedId(lesson.id);
                    setAnswers({});
                    setTab("overview");
                  }}
                >
                  <div className="learn-list-copy">
                    <strong>{lesson.title}</strong>
                    <span>
                      {lesson.curriculum?.name ?? "General"} · {lesson.contentType}
                    </span>
                  </div>
                  <span className={`badge ${statusClass(lesson.progress.status)}`}>
                    {statusLabel(lesson.progress.status)}
                  </span>
                </button>
              ))}
              {filtered.length === 0 ? (
                <p className="muted" style={{ padding: "8px 4px" }}>
                  No lessons match.
                </p>
              ) : null}
            </div>
          </aside>

          <div className="learn-detail">
            {!selected ? (
              <p className="muted">Select a lesson.</p>
            ) : (
              <>
                <div className="learn-detail-head">
                  <div>
                    <h2>{selected.title}</h2>
                    <p className="muted">
                      {selected.curriculum?.name ?? "General"} · {selected.contentType}
                      {selected.progress.quizScore != null
                        ? ` · Score ${selected.progress.quizScore}%`
                        : ""}
                    </p>
                  </div>
                  <span className={`badge ${statusClass(selected.progress.status)}`}>
                    {statusLabel(selected.progress.status)}
                  </span>
                </div>

                <div className="learn-tabs">
                  {(
                    [
                      ["overview", "Overview"],
                      ["content", "Content"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`learn-tab ${tab === id ? "active" : ""}`}
                      onClick={() => setTab(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {tab === "overview" ? (
                  <div className="learn-overview">
                    <div className="learn-meta-grid">
                      <div>
                        <span className="muted">Type</span>
                        <strong>{selected.contentType}</strong>
                      </div>
                      <div>
                        <span className="muted">Progress</span>
                        <strong>{selected.progress.status.replaceAll("_", " ")}</strong>
                      </div>
                      <div>
                        <span className="muted">Curriculum</span>
                        <strong>{selected.curriculum?.name ?? "General"}</strong>
                      </div>
                    </div>
                    {selected.summary ? <p>{selected.summary}</p> : (
                      <p className="muted">No summary yet.</p>
                    )}
                    {selected.videoUrl ? (
                      <a
                        className="learn-media"
                        href={selected.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span>Open video</span>
                        <small>{selected.videoUrl}</small>
                      </a>
                    ) : (
                      <div className="learn-media muted">No video attached</div>
                    )}
                  </div>
                ) : null}

                {tab === "content" ? (
                  <div className="learn-content stack">
                    {selected.body ? (
                      <div className="card" style={{ whiteSpace: "pre-wrap" }}>
                        {selected.body}
                      </div>
                    ) : (
                      <p className="muted">No lesson body yet.</p>
                    )}

                    {selected.quiz ? (
                      <div className="stack">
                        {selected.quiz.questions.map((q) => (
                          <div key={q.id} className="card">
                            <strong>{q.prompt}</strong>
                            <div className="stack" style={{ marginTop: 8 }}>
                              {q.options.map((opt) => (
                                <label key={opt.id} style={{ color: "var(--text)" }}>
                                  <input
                                    type="radio"
                                    name={q.id}
                                    checked={answers[q.id] === opt.id}
                                    onChange={() =>
                                      setAnswers({ ...answers, [q.id]: opt.id })
                                    }
                                  />{" "}
                                  {opt.text}
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                        <button className="btn primary" onClick={submitQuiz}>
                          Submit quiz
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn primary"
                        onClick={completeLesson}
                        disabled={selected.progress.status === "COMPLETED"}
                      >
                        {selected.progress.status === "COMPLETED"
                          ? "Already completed"
                          : "Mark lesson complete"}
                      </button>
                    )}
                  </div>
                ) : null}

              </>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
