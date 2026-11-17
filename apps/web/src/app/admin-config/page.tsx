"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

type Config = Awaited<ReturnType<typeof api.adminConfig>>;

function gbp(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

export default function AdminConfigPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [tab, setTab] = useState<"curriculum" | "commercials" | "kpi" | "rates" | "rules">(
    "curriculum",
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [curriculumForm, setCurriculumForm] = useState({
    name: "",
    kind: "FIELD_READINESS" as "FIELD_READINESS" | "ONGOING" | "CAMPAIGN",
    description: "",
  });
  const [lessonForm, setLessonForm] = useState({
    curriculumId: "",
    title: "",
    contentType: "LESSON" as "LESSON" | "VIDEO" | "QUIZ",
    summary: "",
    body: "",
    videoUrl: "",
  });
  const [commercialEdits, setCommercialEdits] = useState<
    Record<string, { saleValuePence: number; realisedSaleStatuses: string; expectedPaymentDays: string }>
  >({});
  const [funnelText, setFunnelText] = useState<Record<string, string>>({});
  const [rateEdits, setRateEdits] = useState<Record<string, string>>({});
  const [kpiTargets, setKpiTargets] = useState({
    doorsPerDay: 40,
    conversationsPerDay: 15,
    salesPerDay: 2,
  });
  const [eodTime, setEodTime] = useState("20:00");

  async function load() {
    const data = await api.adminConfig();
    setConfig(data);

    const commercials: typeof commercialEdits = {};
    const funnels: Record<string, string> = {};
    for (const c of data.campaigns) {
      commercials[c.id] = {
        saleValuePence: c.saleValuePence,
        realisedSaleStatuses: c.realisedSaleStatuses,
        expectedPaymentDays: c.expectedPaymentDays?.toString() ?? "",
      };
      funnels[c.id] = c.funnelStages.map((s) => `${s.name}|${s.code}`).join("\n");
    }
    setCommercialEdits(commercials);
    setFunnelText(funnels);

    const rates: Record<string, string> = {};
    for (const a of data.associates) {
      rates[a.id] = a.dayRatePence != null ? String(a.dayRatePence) : "8500";
    }
    setRateEdits(rates);

    if (!lessonForm.curriculumId && data.curricula[0]) {
      setLessonForm((f) => ({ ...f, curriculumId: data.curricula[0].id }));
    }

    const kpi = data.rules.find((r) => r.key === "kpi_targets_default");
    if (kpi && typeof kpi.value === "object" && kpi.value) {
      setKpiTargets(kpi.value as typeof kpiTargets);
    }
    const eod = data.rules.find((r) => r.key === "end_of_day_deadline");
    if (eod && typeof eod.value === "object" && eod.value && "time" in (eod.value as object)) {
      setEodTime(String((eod.value as { time: string }).time));
    }
  }

  useEffect(() => {
    load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load admin config"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createCurriculum(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createCurriculum(curriculumForm);
      setCurriculumForm({ name: "", kind: "FIELD_READINESS", description: "" });
      setMessage("Curriculum created.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create curriculum failed");
    }
  }

  async function addLesson(e: FormEvent) {
    e.preventDefault();
    try {
      await api.addCurriculumLesson(lessonForm.curriculumId, {
        title: lessonForm.title,
        contentType: lessonForm.contentType,
        summary: lessonForm.summary,
        body: lessonForm.body,
        videoUrl: lessonForm.videoUrl || undefined,
      });
      setLessonForm((f) => ({ ...f, title: "", summary: "", body: "", videoUrl: "" }));
      setMessage("Lesson added to curriculum.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add lesson failed");
    }
  }

  async function saveCommercials(campaignId: string) {
    const edit = commercialEdits[campaignId];
    if (!edit) return;
    try {
      await api.updateCampaignCommercials(campaignId, {
        saleValuePence: Number(edit.saleValuePence),
        realisedSaleStatuses: edit.realisedSaleStatuses,
        expectedPaymentDays: edit.expectedPaymentDays
          ? Number(edit.expectedPaymentDays)
          : null,
      });
      setMessage("Commercials updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update commercials failed");
    }
  }

  async function saveFunnel(campaignId: string) {
    const lines = (funnelText[campaignId] ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const stages = lines.map((line, i) => {
      const [name, code] = line.split("|").map((p) => p.trim());
      return {
        name: name || `Stage ${i + 1}`,
        code: (code || name || `STAGE_${i + 1}`).toUpperCase().replace(/\s+/g, "_"),
        sortOrder: i,
      };
    });
    try {
      await api.updateCampaignFunnel(campaignId, stages);
      setMessage("Funnel updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update funnel failed");
    }
  }

  async function saveDayRate(userId: string) {
    try {
      await api.setDayRate(userId, { dayRatePence: Number(rateEdits[userId]) });
      setMessage("Day rate updated (effective from now; history preserved).");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Set day rate failed");
    }
  }

  async function saveKpiTargets(e: FormEvent) {
    e.preventDefault();
    try {
      await api.upsertBusinessRule("kpi_targets_default", {
        value: kpiTargets,
        description: "Default daily KPI targets used for coaching guidance.",
      });
      setMessage("KPI targets saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save KPI targets failed");
    }
  }

  async function saveEod(e: FormEvent) {
    e.preventDefault();
    try {
      await api.upsertBusinessRule("end_of_day_deadline", {
        value: { time: eodTime, timezone: "Europe/London" },
        description: "Associates should submit End of Day by this time.",
      });
      setMessage("End of Day rule saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save EOD rule failed");
    }
  }

  return (
    <AppShell
      title="Admin Config"
      subtitle="Configure curriculum, commercials, KPI / funnel and rules without code changes."
    >
      {error ? <div className="error">{error}</div> : null}
      {message ? (
        <div className="card" style={{ marginBottom: 16, borderColor: "rgba(61,154,106,0.45)" }}>
          {message}
        </div>
      ) : null}

      <div className="admin-page">
        <div className="admin-tabs">
          {(
            [
              ["curriculum", "Curriculum"],
              ["commercials", "Commercials"],
              ["kpi", "KPI / Funnel"],
              ["rates", "Day rates"],
              ["rules", "Business rules"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`admin-tab ${tab === id ? "active" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {!config ? <p className="muted">Loading configuration…</p> : null}

        {config && tab === "curriculum" ? (
          <div className="admin-stack">
            <section className="admin-card">
              <div className="ops-card-head">
                <h2>Create curriculum</h2>
                <p>Add a new curriculum to your training library.</p>
              </div>
              <form className="ops-card-form" onSubmit={createCurriculum}>
                <label>
                  Name
                  <input
                    value={curriculumForm.name}
                    onChange={(e) =>
                      setCurriculumForm({ ...curriculumForm, name: e.target.value })
                    }
                    placeholder="Enter curriculum name…"
                    required
                  />
                </label>
                <label>
                  Kind
                  <select
                    value={curriculumForm.kind}
                    onChange={(e) =>
                      setCurriculumForm({
                        ...curriculumForm,
                        kind: e.target.value as typeof curriculumForm.kind,
                      })
                    }
                  >
                    <option value="FIELD_READINESS">Field Readiness</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="CAMPAIGN">Campaign</option>
                  </select>
                </label>
                <label>
                  Description
                  <input
                    value={curriculumForm.description}
                    onChange={(e) =>
                      setCurriculumForm({ ...curriculumForm, description: e.target.value })
                    }
                    placeholder="Enter description…"
                  />
                </label>
                <button className="btn primary ops-card-cta" type="submit">
                  Create
                </button>
              </form>
            </section>

            <section className="admin-card">
              <div className="ops-card-head">
                <h2>Add lesson to curriculum</h2>
                <p>
                  Attach lessons, videos or quizzes. Only Managing Directors can add content —
                  video is a URL (no file upload in V1).
                </p>
              </div>
              <form className="admin-lesson-row" onSubmit={addLesson}>
                <label>
                  Curriculum
                  <select
                    value={lessonForm.curriculumId}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, curriculumId: e.target.value })
                    }
                  >
                    {config.curricula.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Title
                  <input
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    placeholder="Enter lesson title…"
                    required
                  />
                </label>
                <label className="admin-lesson-type">
                  Type
                  <select
                    value={lessonForm.contentType}
                    onChange={(e) =>
                      setLessonForm({
                        ...lessonForm,
                        contentType: e.target.value as typeof lessonForm.contentType,
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
                    value={lessonForm.summary}
                    onChange={(e) => setLessonForm({ ...lessonForm, summary: e.target.value })}
                    placeholder="Enter summary…"
                  />
                </label>
                {lessonForm.contentType === "VIDEO" ? (
                  <label className="admin-lesson-video">
                    Video URL
                    <input
                      type="url"
                      value={lessonForm.videoUrl}
                      onChange={(e) =>
                        setLessonForm({ ...lessonForm, videoUrl: e.target.value })
                      }
                      placeholder="https://…"
                    />
                  </label>
                ) : null}
                <button className="btn primary ops-card-cta admin-lesson-submit" type="submit">
                  Add lesson
                </button>
              </form>
            </section>

            {config.curricula.map((c) => {
              const lessonCount = c.lessons.length;
              const videoCount = c.lessons.filter((l) => l.contentType === "VIDEO").length;
              return (
                <section key={c.id} className="admin-card admin-curriculum-card">
                  <div className="admin-curriculum-top">
                    <div>
                      <div className="admin-curriculum-title">
                        <h2>{c.name}</h2>
                        <span className="badge ok">Active</span>
                      </div>
                      <p className="muted">
                        {c.description || "Configure curriculum details, lessons and requirements."}
                      </p>
                    </div>
                    <span className="badge">{c.kind.replaceAll("_", " ")}</span>
                  </div>
                  <div className="admin-curriculum-stats">
                    <div>
                      <span className="muted">Lessons</span>
                      <strong>{lessonCount}</strong>
                    </div>
                    <div>
                      <span className="muted">Videos</span>
                      <strong>{videoCount}</strong>
                    </div>
                    <div>
                      <span className="muted">Requirements</span>
                      <strong>{c.requirements.length}</strong>
                    </div>
                  </div>
                  <p className="admin-curriculum-reqs">
                    Requirements:{" "}
                    {c.requirements.length
                      ? c.requirements.map((r) => r.title).join(", ")
                      : "None"}
                  </p>
                  <p className="muted" style={{ marginTop: 8, fontSize: "0.82rem" }}>
                    Lessons:{" "}
                    {c.lessons.length
                      ? c.lessons.map((l) => `${l.title} (${l.contentType})`).join(", ")
                      : "None"}
                  </p>
                </section>
              );
            })}
          </div>
        ) : null}

        {config && tab === "commercials" ? (
          <div className="admin-stack">
            {config.campaigns.map((c) => (
              <section key={c.id} className="admin-card">
                <div className="ops-card-head">
                  <h2>{c.name}</h2>
                  <p>
                    {c.clientName ?? "No client"} · {c.status}
                  </p>
                </div>
                <div className="ops-card-form">
                  <label>
                    Sale value (pence)
                    <input
                      type="number"
                      value={commercialEdits[c.id]?.saleValuePence ?? c.saleValuePence}
                      onChange={(e) =>
                        setCommercialEdits({
                          ...commercialEdits,
                          [c.id]: {
                            ...commercialEdits[c.id],
                            saleValuePence: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    Realised statuses
                    <input
                      value={
                        commercialEdits[c.id]?.realisedSaleStatuses ?? c.realisedSaleStatuses
                      }
                      onChange={(e) =>
                        setCommercialEdits({
                          ...commercialEdits,
                          [c.id]: {
                            ...commercialEdits[c.id],
                            realisedSaleStatuses: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    Payment days
                    <input
                      value={commercialEdits[c.id]?.expectedPaymentDays ?? ""}
                      onChange={(e) =>
                        setCommercialEdits({
                          ...commercialEdits,
                          [c.id]: {
                            ...commercialEdits[c.id],
                            expectedPaymentDays: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <button
                    className="btn primary ops-card-cta"
                    type="button"
                    onClick={() => saveCommercials(c.id)}
                  >
                    Save
                  </button>
                </div>
                <p className="muted" style={{ marginTop: 8 }}>
                  Current sale value: {gbp(c.saleValuePence)}
                </p>
              </section>
            ))}
          </div>
        ) : null}

        {config && tab === "kpi" ? (
          <div className="admin-stack">
            <section className="admin-card">
              <div className="ops-card-head">
                <h2>Default KPI targets</h2>
                <p>Daily coaching targets used across associates.</p>
              </div>
              <form className="ops-card-form" onSubmit={saveKpiTargets}>
                <label>
                  Doors / day
                  <input
                    type="number"
                    value={kpiTargets.doorsPerDay}
                    onChange={(e) =>
                      setKpiTargets({ ...kpiTargets, doorsPerDay: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Conversations / day
                  <input
                    type="number"
                    value={kpiTargets.conversationsPerDay}
                    onChange={(e) =>
                      setKpiTargets({
                        ...kpiTargets,
                        conversationsPerDay: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Sales / day
                  <input
                    type="number"
                    value={kpiTargets.salesPerDay}
                    onChange={(e) =>
                      setKpiTargets({ ...kpiTargets, salesPerDay: Number(e.target.value) })
                    }
                  />
                </label>
                <button className="btn primary ops-card-cta" type="submit">
                  Save targets
                </button>
              </form>
            </section>

            {config.campaigns.map((c) => (
              <section key={c.id} className="admin-card">
                <div className="ops-card-head">
                  <h2>Funnel — {c.name}</h2>
                  <p>One stage per line as Name|CODE</p>
                </div>
                <textarea
                  className="admin-textarea"
                  rows={5}
                  value={funnelText[c.id] ?? ""}
                  onChange={(e) => setFunnelText({ ...funnelText, [c.id]: e.target.value })}
                />
                <button
                  className="btn primary ops-card-cta"
                  style={{ marginTop: 10, width: "auto" }}
                  type="button"
                  onClick={() => saveFunnel(c.id)}
                >
                  Save funnel
                </button>
              </section>
            ))}
          </div>
        ) : null}

        {config && tab === "rates" ? (
          <div className="admin-stack">
            {config.associates.map((a) => (
              <section key={a.id} className="admin-card">
                <div className="ops-card-head">
                  <h2>{a.name}</h2>
                  <p>
                    {a.email} · {a.role.replaceAll("_", " ")} · Current{" "}
                    {a.dayRatePence != null ? gbp(a.dayRatePence) : "not set"}
                  </p>
                </div>
                <div className="ops-card-form ops-card-form-2">
                  <label>
                    New day rate (pence)
                    <input
                      type="number"
                      value={rateEdits[a.id] ?? ""}
                      onChange={(e) => setRateEdits({ ...rateEdits, [a.id]: e.target.value })}
                    />
                  </label>
                  <button
                    className="btn primary ops-card-cta"
                    type="button"
                    onClick={() => saveDayRate(a.id)}
                  >
                    Set day rate
                  </button>
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {config && tab === "rules" ? (
          <div className="admin-stack">
            <section className="admin-card">
              <div className="ops-card-head">
                <h2>End of Day deadline</h2>
                <p>Associates should submit End of Day by this time.</p>
              </div>
              <form className="ops-card-form ops-card-form-2" onSubmit={saveEod}>
                <label>
                  Time (HH:MM)
                  <input value={eodTime} onChange={(e) => setEodTime(e.target.value)} />
                </label>
                <button className="btn primary ops-card-cta" type="submit">
                  Save
                </button>
              </form>
            </section>
            <section className="admin-card">
              <div className="ops-card-head">
                <h2>All business rules</h2>
                <p>Stored configuration keys used by the operating system.</p>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Description</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {config.rules.map((r) => (
                    <tr key={r.id}>
                      <td>{r.key}</td>
                      <td>{r.description}</td>
                      <td>
                        <code>{JSON.stringify(r.value)}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
