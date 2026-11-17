"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

type MyItems = Awaited<ReturnType<typeof api.myRoleplays>>["items"];
type Queue = Awaited<ReturnType<typeof api.roleplayQueue>>["queue"];

export default function RoleplayPage() {
  const [role, setRole] = useState<string | null>(null);
  const [items, setItems] = useState<MyItems>([]);
  const [queue, setQueue] = useState<Queue>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newReq, setNewReq] = useState({ title: "", brief: "" });

  const isMd = role === "MANAGING_DIRECTOR";

  async function load() {
    setError(null);
    const me = await api.me();
    setRole(me.user.role);
    if (me.user.role === "MANAGING_DIRECTOR") {
      const res = await api.roleplayQueue();
      setQueue(res.queue);
      setItems([]);
    } else {
      const res = await api.myRoleplays();
      setItems(res.items);
      setQueue([]);
    }
  }

  useEffect(() => {
    load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load roleplays"),
    );
  }, []);

  async function submit(requirementId: string) {
    setError(null);
    setMessage(null);
    const content = drafts[requirementId]?.trim() ?? "";
    if (content.length < 10) {
      setError("Write at least a short script/notes (10+ characters).");
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

  async function review(id: string, decision: "APPROVED" | "RETURNED") {
    try {
      await api.reviewRoleplay(id, {
        decision,
        feedback:
          decision === "APPROVED"
            ? "Strong structure — approved."
            : "Tighten the opening and try again.",
      });
      setMessage(`Marked ${decision}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    }
  }

  async function createRequirement(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createRoleplayRequirement(newReq);
      setNewReq({ title: "", brief: "" });
      setMessage("Roleplay requirement created.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <AppShell
      title="Roleplay"
      subtitle="Practice → submit → leader review → improve — the Roleplay Loop."
    >
      {error ? <div className="error">{error}</div> : null}
      {message ? (
        <div className="card" style={{ marginBottom: 16, borderColor: "rgba(61,154,106,0.45)" }}>
          {message}
        </div>
      ) : null}

      {!isMd ? (
        <div className="section-stack">
          {items.map((item) => (
            <div key={item.requirement.id} className="panel">
              <h2>{item.requirement.title}</h2>
              <p className="muted">
                {item.requirement.isMandatory ? "Mandatory" : "Optional"}
              </p>
              <p>{item.requirement.brief}</p>

              {item.latestSubmission ? (
                <div className="card" style={{ marginBottom: 12 }}>
                  <strong>Latest: {item.latestSubmission.status}</strong>
                  <p>{item.latestSubmission.content}</p>
                  {item.latestSubmission.feedback ? (
                    <p className="muted">Feedback: {item.latestSubmission.feedback}</p>
                  ) : null}
                </div>
              ) : null}

              {item.latestSubmission?.status === "APPROVED" ? (
                <span className="badge ok">Approved</span>
              ) : (
                <>
                  <label>
                    Your script / practice notes
                    <textarea
                      value={drafts[item.requirement.id] ?? ""}
                      onChange={(e) =>
                        setDrafts((d) => ({
                          ...d,
                          [item.requirement.id]: e.target.value,
                        }))
                      }
                      rows={5}
                      style={{
                        width: "100%",
                        marginTop: 6,
                        background: "var(--bg)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: 12,
                      }}
                    />
                  </label>
                  <button
                    className="btn primary"
                    style={{ marginTop: 10 }}
                    onClick={() => submit(item.requirement.id)}
                  >
                    Submit for review
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="section-stack">
          <div className="panel">
            <h2>Create roleplay requirement</h2>
            <form className="form" onSubmit={createRequirement}>
              <label>
                Title
                <input
                  value={newReq.title}
                  onChange={(e) => setNewReq({ ...newReq, title: e.target.value })}
                  required
                />
              </label>
              <label>
                Brief
                <input
                  value={newReq.brief}
                  onChange={(e) => setNewReq({ ...newReq, brief: e.target.value })}
                />
              </label>
              <button className="btn primary">Create</button>
            </form>
          </div>

          <div className="panel">
            <h2>Awaiting review</h2>
            {queue.length === 0 ? (
              <p className="muted">No roleplays waiting.</p>
            ) : (
              <div className="stack">
                {queue.map((item) => (
                  <div key={item.id} className="card">
                    <strong>{item.requirement.title}</strong>
                    <div className="muted">
                      {item.user.firstName} {item.user.lastName} ·{" "}
                      {new Date(item.submittedAt).toLocaleString()}
                    </div>
                    <p>{item.content}</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn primary" onClick={() => review(item.id, "APPROVED")}>
                        Approve
                      </button>
                      <button className="btn danger" onClick={() => review(item.id, "RETURNED")}>
                        Return
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
