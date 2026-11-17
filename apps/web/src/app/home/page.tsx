"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

type HomeData = Awaited<ReturnType<typeof api.home>>["home"];
type HomeAction = HomeData["actions"][number];

function ActionIcon({ code }: { code: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (code) {
    case "REVIEW_PERFORMANCE":
      return (
        <svg {...common}>
          <path d="M4 19h16" />
          <path d="M7 16V10M12 16V7M17 16v-3" />
        </svg>
      );
    case "MANAGE_CAMPAIGNS":
      return (
        <svg {...common}>
          <path d="M3 10v4h2l6 3V7L5 10H3z" />
          <path d="M14 9.5a4.5 4.5 0 0 1 0 5" />
        </svg>
      );
    case "ADMIN_CONFIG":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.4l1.6 1.6M17.5 16l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.6l1.6-1.6" />
        </svg>
      );
    case "APPROVE_FIELD_READINESS":
      return (
        <svg {...common}>
          <path d="M12 3.5 5 6.2v5.3c0 4.2 2.9 7.4 7 8.5 4.1-1.1 7-4.3 7-8.5V6.2L12 3.5z" />
          <path d="m9 12 2.1 2.1L15.5 9.7" />
        </svg>
      );
    case "REVIEW_ROLEPLAYS":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="11" rx="2.5" />
          <path d="M8 17.5 6.5 20.5M16 17.5l1.5 3" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M13 3 5 13h6l-1 8 9-12h-6V3z" />
        </svg>
      );
  }
}

export default function HomePage() {
  const [home, setHome] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await api.home();
    setHome(res.home);
  }

  useEffect(() => {
    load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load home"),
    );
  }, []);

  const actions: HomeAction[] = home?.actions ?? [];
  const primary = home?.primaryAction ?? null;
  const secondaryActions = primary
    ? actions.filter((a) => a.code !== primary.code).slice(0, 3)
    : actions.slice(0, 3);
  const listActions = secondaryActions.length > 0 ? secondaryActions : actions.slice(0, 3);

  return (
    <AppShell
      title="Home"
      subtitle="Direction first — always know the next best action."
    >
      {error ? <div className="error">{error}</div> : null}

      {home ? (
        <div className="section-stack home-dashboard">
          <section className="home-hero">
            <div className="home-hero-copy">
              <h2>{home.greeting}</h2>
              <p className="home-hero-meta">
                <span>Role: {home.role.replaceAll("_", " ")}</span>
                <span>·</span>
                <span>Lifecycle:</span>
                <span className="lifecycle-pill">
                  {home.context.lifecycleState.replaceAll("_", " ")}
                </span>
                {home.context.deployment ? (
                  <>
                    <span>·</span>
                    <span>
                      {home.context.deployment.campaign} / {home.context.deployment.territory}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
            <div className="home-hero-mark">
              <strong>IMPERIAL</strong>
            </div>
          </section>

          {primary ? (
            <section className="primary-action">
              <div className="primary-action-main">
                <div className="primary-action-copy">
                  <div className="primary-action-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M13 3 5 13h6l-1 8 9-12h-6V3z"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3>Primary action</h3>
                    <strong>{primary.title}</strong>
                    <p>{primary.detail}</p>
                  </div>
                </div>
                <Link className="btn primary primary-go" href={primary.href}>
                  Go →
                </Link>
              </div>
            </section>
          ) : null}

          <section className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-card-top">
                <span>Field Ready</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="9" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="16" cy="9" r="2" stroke="currentColor" strokeWidth="1.6" />
                  <path
                    d="M3.5 18.5c.6-2.6 2.4-3.9 5.5-3.9s4.9 1.3 5.5 3.9"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className={`value row ${home.context.isFieldReady ? "ok" : ""}`}>
                {home.context.isFieldReady ? "Yes" : "No"}
                {home.context.isFieldReady ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="m6.5 12.2 3.2 3.2 7.2-7.4"
                      stroke="#3d9a6a"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-top">
                <span>Today doors</span>
              </div>
              <div className="value">{home.context.activityToday?.doorsKnocked ?? 0}</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-top">
                <span>Sales today</span>
              </div>
              <div className="value">{home.context.salesToday}</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-top">
                <span>Open callbacks</span>
              </div>
              <div className="value">{home.context.openCallbacks}</div>
            </div>
          </section>

          <section>
            <div className="actions-head">
              <h2>Today&apos;s actions</h2>
              <Link href={primary?.href ?? "/performance"}>View all →</Link>
            </div>
            <div className="stack">
              {listActions.map((action) => (
                <Link key={action.code} className="action-row" href={action.href}>
                  <div className="action-row-icon">
                    <ActionIcon code={action.code} />
                  </div>
                  <div className="action-row-copy">
                    <strong>{action.title}</strong>
                    <p>{action.detail}</p>
                  </div>
                  <span className="action-row-chevron" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="m9 6 6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
