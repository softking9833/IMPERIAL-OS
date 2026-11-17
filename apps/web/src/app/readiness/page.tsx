"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

type Awaiting = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  requirementProgress: Array<{
    status: string;
    requirement: { title: string; requirementType: string };
  }>;
};

export default function ReadinessPage() {
  const [awaiting, setAwaiting] = useState<Awaiting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await api.readinessQueue();
    setAwaiting(res.awaiting);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  async function decide(userId: string, decision: "APPROVED" | "RETURNED") {
    setError(null);
    setMessage(null);
    try {
      await api.approveReadiness(
        userId,
        decision,
        decision === "RETURNED" ? "Please revise outstanding requirements." : undefined,
      );
      setMessage(
        decision === "APPROVED"
          ? "Associate marked Field Ready and eligible for deployment."
          : "Associate returned to learning.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    }
  }

  return (
    <AppShell
      title="Field Readiness Approvals"
      subtitle="Mandatory curriculum completion unlocks leader approval before deployment."
    >
      {error ? <div className="error">{error}</div> : null}
      {message ? (
        <div className="card" style={{ marginBottom: 16, borderColor: "rgba(61,154,106,0.45)" }}>
          {message}
        </div>
      ) : null}

      <div className="panel">
        <h2>Awaiting manager review</h2>
        {awaiting.length === 0 ? (
          <p className="muted">No Associates currently awaiting Field Readiness approval.</p>
        ) : (
          <div className="stack">
            {awaiting.map((person) => (
              <div key={person.id} className="card">
                <strong>
                  {person.firstName} {person.lastName}
                </strong>
                <div className="muted">
                  {person.email} · {person.role.replaceAll("_", " ")}
                </div>
                <ul>
                  {person.requirementProgress.map((p, idx) => (
                    <li key={idx}>
                      {p.requirement.title}{" "}
                      <span className="badge ok">{p.status}</span>
                    </li>
                  ))}
                </ul>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="btn primary" onClick={() => decide(person.id, "APPROVED")}>
                    Approve Field Ready
                  </button>
                  <button className="btn danger" onClick={() => decide(person.id, "RETURNED")}>
                    Return
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
