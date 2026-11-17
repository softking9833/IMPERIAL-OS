"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

type Overview = Record<string, number>;
type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  actor: { firstName: string; lastName: string } | null;
};

const metrics: Array<{
  key: keyof Overview | string;
  label: string;
  icon: "people" | "ready" | "awaiting" | "campaigns" | "territories" | "deployments";
}> = [
  { key: "users", label: "People", icon: "people" },
  { key: "fieldReady", label: "Field Ready", icon: "ready" },
  { key: "awaitingApproval", label: "Awaiting Approval", icon: "awaiting" },
  { key: "campaigns", label: "Campaigns", icon: "campaigns" },
  { key: "territories", label: "Territories", icon: "territories" },
  { key: "activeDeployments", label: "Active Deployments", icon: "deployments" },
];

function MetricIcon({ name }: { name: (typeof metrics)[number]["icon"] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "people":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.2" />
          <path d="M3 19c.7-3 2.8-4.5 6-4.5s5.3 1.5 6 4.5" />
          <path d="M14.2 14.8c1.6-.4 3.1 0 4.6 1.5.5.5.8 1.1 1 1.7" />
        </svg>
      );
    case "ready":
      return (
        <svg {...common}>
          <path d="M12 3.5 5 6.2v5.3c0 4.2 2.9 7.4 7 8.5 4.1-1.1 7-4.3 7-8.5V6.2L12 3.5z" />
          <path d="m9 12 2.1 2.1L15.5 9.7" />
        </svg>
      );
    case "awaiting":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4.5L15 15" />
        </svg>
      );
    case "campaigns":
      return (
        <svg {...common}>
          <path d="M3 10v4h2l6 3V7L5 10H3z" />
          <path d="M14 9.5a4.5 4.5 0 0 1 0 5" />
        </svg>
      );
    case "territories":
      return (
        <svg {...common}>
          <path d="M12 21s6.5-5.2 6.5-10.2A6.5 6.5 0 0 0 12 4.3a6.5 6.5 0 0 0-6.5 6.5C5.5 15.8 12 21 12 21z" />
          <circle cx="12" cy="10.8" r="2.2" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M4 19h16" />
          <path d="M7 16V10M12 16V6M17 16v-4" />
        </svg>
      );
  }
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .overview()
      .then((res) => {
        setOverview(res.overview);
        setAudit(res.recentAudit);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  return (
    <AppShell
      title="Company Overview"
      subtitle="Foundation milestone — Identity, Field Readiness, Campaigns & audit trail."
    >
      {error ? <div className="error">{error}</div> : null}

      <div className="overview-page">
        <section className="overview-metrics">
          {metrics.map((m) => {
            const value = overview?.[m.key];
            return (
              <article className="overview-metric" key={m.key}>
                <div className="overview-metric-top">
                  <span>{m.label}</span>
                  <span className="overview-metric-icon">
                    <MetricIcon name={m.icon} />
                  </span>
                </div>
                <div className="overview-metric-value">{value ?? "—"}</div>
              </article>
            );
          })}
        </section>

        <section className="overview-audit panel">
          <div className="actions-head">
            <h2>Recent audit activity</h2>
            <Link href="/dashboard">View all →</Link>
          </div>
          <table className="table overview-audit-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="overview-when">
                      <span className="overview-when-dot" aria-hidden />
                      {new Date(row.createdAt).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    {row.actor
                      ? `${row.actor.firstName} ${row.actor.lastName}`
                      : "System"}
                  </td>
                  <td>
                    <code className="overview-action">{row.action}</code>
                  </td>
                  <td className="muted">{row.entityType}</td>
                </tr>
              ))}
              {audit.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No audit events yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
