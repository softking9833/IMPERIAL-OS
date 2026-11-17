"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

type Readiness = Awaited<ReturnType<typeof api.myReadiness>>;
type FieldToday = Awaited<ReturnType<typeof api.fieldToday>>;

export default function AssociatePage() {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [field, setField] = useState<FieldToday | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doors, setDoors] = useState(0);
  const [conversations, setConversations] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [r, f] = await Promise.all([api.myReadiness(), api.fieldToday()]);
      if (cancelled) return;
      setReadiness(r);
      setField(f);
      if (f.activity) {
        setDoors(f.activity.doorsKnocked);
        setConversations(f.activity.conversations);
        setNote(f.activity.notes ?? "");
      }
    }

    load().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Failed to load associate loop");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function completeRequirement(id: string) {
    try {
      await api.completeRequirement(id);
      const r = await api.myReadiness();
      setReadiness(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete requirement");
    }
  }

  async function saveActivity() {
    try {
      await api.saveActivity({
        doorsKnocked: doors,
        conversations,
        notes: note,
      });
      setField(await api.fieldToday());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save activity");
    }
  }

  async function recordSale() {
    if (!field?.deployment) return;
    try {
      await api.recordSale({
        campaignId: field.deployment.campaign.id,
        notes: "Recorded from Associate Loop preview",
      });
      setField(await api.fieldToday());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record sale");
    }
  }

  return (
    <AppShell
      title="Associate Core Loop"
      subtitle="Field Readiness → deployment → field capture for the currently signed-in user."
    >
      {error ? <div className="error">{error}</div> : null}

      <div className="panel">
        <h2>Field Readiness curriculum</h2>
        <p className="muted">
          Lifecycle: {readiness?.lifecycleState ?? "—"} · Field Ready:{" "}
          {readiness?.isFieldReady ? "Yes" : "No"}
          {readiness?.pendingApproval ? " · Awaiting leader approval" : ""}
        </p>
        <div className="stack">
          {readiness?.requirements.map((item) => (
            <div key={item.id} className="card">
              <strong>{item.requirement.title}</strong>
              <div className="muted">
                {item.requirement.requirementType} · {item.status}
              </div>
              <p>{item.requirement.description}</p>
              {item.status !== "COMPLETED" && item.status !== "APPROVED" ? (
                <button className="btn primary" onClick={() => completeRequirement(item.id)}>
                  Mark complete
                </button>
              ) : (
                <span className="badge ok">Completed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Today&apos;s deployment & field capture</h2>
        {!field?.deployment ? (
          <p className="muted">
            No active deployment. Complete Field Readiness, get MD approval, then assign a campaign
            and territory.
          </p>
        ) : (
          <>
            <p>
              <strong>{field.deployment.campaign.name}</strong> · {field.deployment.territory.name}
            </p>
            <div className="form row" style={{ marginTop: 12 }}>
              <label>
                Doors
                <input
                  type="number"
                  value={doors}
                  onChange={(e) => setDoors(Number(e.target.value))}
                />
              </label>
              <label>
                Conversations
                <input
                  type="number"
                  value={conversations}
                  onChange={(e) => setConversations(Number(e.target.value))}
                />
              </label>
              <label>
                Notes
                <input value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
              <button className="btn primary" onClick={saveActivity}>
                Save activity
              </button>
              <button className="btn" onClick={recordSale}>
                Record sale (£{(field.deployment.campaign.saleValuePence / 100).toFixed(0)})
              </button>
            </div>
            <p className="muted" style={{ marginTop: 12 }}>
              Sales today: {field.sales.length} · Open callbacks: {field.callbacks.length}
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
