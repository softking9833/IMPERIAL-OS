"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

type FieldToday = Awaited<ReturnType<typeof api.fieldToday>>;

export default function FieldPage() {
  const [field, setField] = useState<FieldToday | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [doors, setDoors] = useState(0);
  const [conversations, setConversations] = useState(0);
  const [note, setNote] = useState("");
  const [callbackAddress, setCallbackAddress] = useState("");
  const [callbackNotes, setCallbackNotes] = useState("");
  const [eod, setEod] = useState({ wins: "", challenges: "", tomorrowFocus: "" });

  async function load() {
    const data = await api.fieldToday();
    setField(data);
    if (data.activity) {
      setDoors(data.activity.doorsKnocked);
      setConversations(data.activity.conversations);
      setNote(data.activity.notes ?? "");
    }
    if (data.endOfDay) {
      setEod({
        wins: data.endOfDay.wins ?? "",
        challenges: data.endOfDay.challenges ?? "",
        tomorrowFocus: data.endOfDay.tomorrowFocus ?? "",
      });
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load field"));
  }, []);

  async function saveActivity(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.saveActivity({ doorsKnocked: doors, conversations, notes: note });
      setMessage("Activity saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save activity");
    }
  }

  async function recordSale() {
    if (!field?.deployment) return;
    try {
      await api.recordSale({
        campaignId: field.deployment.campaign.id,
        notes: "Recorded from Field day",
      });
      setMessage("Sale recorded.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record sale");
    }
  }

  async function addCallback(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createCallback({
        addressNote: callbackAddress,
        notes: callbackNotes,
      });
      setCallbackAddress("");
      setCallbackNotes("");
      setMessage("Callback created.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create callback");
    }
  }

  async function completeCallback(id: string) {
    try {
      await api.updateCallback(id, { status: "COMPLETED" });
      setMessage("Callback completed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update callback");
    }
  }

  async function submitEod(e: FormEvent) {
    e.preventDefault();
    try {
      await api.submitEndOfDay(eod);
      setMessage("End of Day submitted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit EOD");
    }
  }

  return (
    <AppShell
      title="Field"
      subtitle="Daily execution — activity, sales, callbacks and End of Day."
    >
      {error ? <div className="error">{error}</div> : null}
      {message ? (
        <div className="card" style={{ marginBottom: 16, borderColor: "rgba(61,154,106,0.45)" }}>
          {message}
        </div>
      ) : null}

      {!field?.isFieldReady ? (
        <div className="panel">
          <p>Associate is not Field Ready yet. Complete Learn + approval first.</p>
        </div>
      ) : !field.deployment ? (
        <div className="panel">
          <p>No active deployment. Ask MD to assign a campaign and territory.</p>
        </div>
      ) : (
        <>
          <div className="panel">
            <h2>
              {field.deployment.campaign.name} · {field.deployment.territory.name}
            </h2>
            <form className="form row" onSubmit={saveActivity}>
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
              <button className="btn primary">Save activity</button>
              <button className="btn" type="button" onClick={recordSale}>
                Record sale (£{(field.deployment.campaign.saleValuePence / 100).toFixed(0)})
              </button>
            </form>
            <p className="muted" style={{ marginTop: 12 }}>
              Sales today: {field.sales.length}
            </p>
          </div>

          <div className="panel">
            <h2>Callbacks</h2>
            <form className="form row" onSubmit={addCallback}>
              <label>
                Address / location note
                <input
                  value={callbackAddress}
                  onChange={(e) => setCallbackAddress(e.target.value)}
                  required
                />
              </label>
              <label>
                Notes
                <input
                  value={callbackNotes}
                  onChange={(e) => setCallbackNotes(e.target.value)}
                />
              </label>
              <button className="btn primary">Add callback</button>
            </form>
            <div className="stack" style={{ marginTop: 12 }}>
              {field.callbacks.map((cb) => (
                <div key={cb.id} className="card">
                  <strong>{cb.addressNote}</strong>
                  <div className="muted">
                    {cb.status}
                    {cb.notes ? ` · ${cb.notes}` : ""}
                  </div>
                  {cb.status === "OPEN" ? (
                    <button className="btn" onClick={() => completeCallback(cb.id)}>
                      Mark completed
                    </button>
                  ) : (
                    <span className="badge ok">Done</span>
                  )}
                </div>
              ))}
              {field.callbacks.length === 0 ? (
                <p className="muted">No open callbacks.</p>
              ) : null}
            </div>
          </div>

          <div className="panel">
            <h2>End of Day</h2>
            {field.endOfDay ? (
              <p className="muted">Submitted — you can update and resubmit below.</p>
            ) : (
              <p className="muted">Not submitted yet.</p>
            )}
            <form className="form" onSubmit={submitEod}>
              <label>
                Wins
                <input
                  value={eod.wins}
                  onChange={(e) => setEod({ ...eod, wins: e.target.value })}
                />
              </label>
              <label>
                Challenges
                <input
                  value={eod.challenges}
                  onChange={(e) => setEod({ ...eod, challenges: e.target.value })}
                />
              </label>
              <label>
                Tomorrow focus
                <input
                  value={eod.tomorrowFocus}
                  onChange={(e) => setEod({ ...eod, tomorrowFocus: e.target.value })}
                />
              </label>
              <button className="btn primary">Submit End of Day</button>
            </form>
          </div>
        </>
      )}
    </AppShell>
  );
}
