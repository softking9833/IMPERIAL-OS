"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

type Profile = Awaited<ReturnType<typeof api.profile>>["profile"];

function gbp(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await api.profile();
    setProfile(res.profile);
    setFirstName(res.profile.firstName);
    setLastName(res.profile.lastName);
  }

  useEffect(() => {
    load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load profile"),
    );
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await api.updateProfile({ firstName, lastName });
      setMessage("Profile updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <AppShell
      title="Profile"
      subtitle="One identity — role, timeline, deployments and progression."
    >
      {error ? <div className="error">{error}</div> : null}
      {message ? (
        <div className="card" style={{ marginBottom: 16, borderColor: "rgba(61,154,106,0.45)" }}>
          {message}
        </div>
      ) : null}

      {profile ? (
        <div className="section-stack">
          <div className="panel">
            <h2>
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="muted">
              {profile.email} · {profile.role.replaceAll("_", " ")} · {profile.lifecycleState}
            </p>
            <div className="grid stats" style={{ marginTop: 12 }}>
              <div className="card">
                <h3>Field Ready</h3>
                <div className="value">{profile.isFieldReady ? "Yes" : "No"}</div>
              </div>
              <div className="card">
                <h3>Perspective</h3>
                <div className="value" style={{ fontSize: "1rem" }}>
                  {profile.activePerspective.replaceAll("_", " ")}
                </div>
              </div>
              <div className="card">
                <h3>Scope</h3>
                <div className="value" style={{ fontSize: "1rem" }}>
                  {profile.activeScope?.name ?? "—"}
                </div>
              </div>
              <div className="card">
                <h3>Day rate</h3>
                <div className="value" style={{ fontSize: "1.2rem" }}>
                  {profile.dayRatePence != null ? gbp(profile.dayRatePence) : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>Edit details</h2>
            <form className="form row" onSubmit={save}>
              <label>
                First name
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </label>
              <label>
                Last name
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </label>
              <button className="btn primary">Save</button>
            </form>
          </div>

          <div className="panel">
            <h2>Active deployment</h2>
            {profile.activeDeployment ? (
              <p>
                {profile.activeDeployment.campaign.name} ·{" "}
                {profile.activeDeployment.territory.name}
              </p>
            ) : (
              <p className="muted">No active deployment.</p>
            )}
          </div>

          <div className="panel">
            <h2>Career timeline</h2>
            <div className="stack">
              {profile.timeline.map((item) => (
                <div key={item.code} className="card">
                  <strong>{item.label}</strong>
                  <div className="muted">{new Date(item.at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {profile.performance ? (
            <div className="panel">
              <h2>Performance snapshot</h2>
              <p>
                Predicted profit: {gbp(profile.performance.profitability.predictedProfitPence)}{" "}
                <span className="badge">
                  {profile.performance.profitability.predictedStatus}
                </span>
                {" · "}
                Doors: {profile.performance.kpis.doors} · Sales: {profile.performance.kpis.sales}
              </p>
            </div>
          ) : null}

          <div className="panel">
            <h2>Recent roleplays</h2>
            {profile.roleplays.length === 0 ? (
              <p className="muted">No roleplay submissions yet.</p>
            ) : (
              <div className="stack">
                {profile.roleplays.map((r) => (
                  <div key={r.id} className="card">
                    <strong>{r.requirement.title}</strong>
                    <div className="muted">{r.status}</div>
                    <p>{r.content}</p>
                    {r.feedback ? <p className="muted">Feedback: {r.feedback}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
