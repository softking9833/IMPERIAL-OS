"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

function gbp(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function statusBadgeClass(status: string) {
  const s = status.toUpperCase();
  if (s === "PROFITABLE") return "ok";
  if (s === "UNPROFITABLE") return "warn";
  return "";
}

type Company = Awaited<ReturnType<typeof api.companyPerformance>>;
type Mine = Awaited<ReturnType<typeof api.myPerformance>>["performance"];

export default function PerformancePage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isMd, setIsMd] = useState(false);

  async function load() {
    setError(null);
    const me = await api.me();
    const md = me.user.role === "MANAGING_DIRECTOR";
    setIsMd(md);
    if (md) {
      const data = await api.companyPerformance();
      setCompany(data);
      setMine(null);
    } else {
      const data = await api.myPerformance();
      setMine(data.performance);
      setCompany(null);
    }
  }

  useEffect(() => {
    load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load performance"),
    );
  }, []);

  async function markPaid(saleId: string) {
    setError(null);
    setMessage(null);
    try {
      await api.updateSaleStatus(saleId, "PAID");
      setMessage("Sale marked PAID — actual/realised profitability updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update sale");
    }
  }

  return (
    <AppShell
      title="Performance"
      subtitle="KPIs plus Predicted vs Actual profitability from field activity and sales."
    >
      {error ? <div className="error">{error}</div> : null}
      {message ? (
        <div className="card" style={{ marginBottom: 16, borderColor: "rgba(61,154,106,0.45)" }}>
          {message}
        </div>
      ) : null}

      {company ? (
        <div className="perf-page">
          <section className="perf-kpis">
            {[
              { label: "Doors", value: String(company.company.doors) },
              { label: "Conversations", value: String(company.company.conversations) },
              { label: "Sales", value: String(company.company.sales) },
              { label: "Predicted profit", value: gbp(company.company.predictedProfitPence) },
              { label: "Actual profit", value: gbp(company.company.actualProfitPence) },
            ].map((m) => (
              <article key={m.label} className="perf-kpi">
                <span className="perf-kpi-label">{m.label}</span>
                <strong className="perf-kpi-value">{m.value}</strong>
              </article>
            ))}
          </section>

          <section className="perf-associates">
            <div className="perf-associates-head">
              <div>
                <h2>Associates performance</h2>
                <p>Track associate performance and activity.</p>
              </div>
              <span className="perf-range">All time</span>
            </div>

            <div className="perf-table-wrap">
              <table className="table perf-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Activity</th>
                    <th>Predicted</th>
                    <th>Actual</th>
                    <th>Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {company.associates.map((row) => (
                    <tr key={row.userId}>
                      <td>
                        <div className="perf-person">
                          <span className="perf-avatar">{initials(row.name)}</span>
                          <div>
                            <strong>{row.name}</strong>
                            <span className="muted">Associate</span>
                          </div>
                        </div>
                      </td>
                      <td className="muted">
                        {row.kpis.doors} doors / {row.kpis.conversations} conv / {row.kpis.sales}{" "}
                        sales
                      </td>
                      <td>
                        <div className="perf-money">
                          <strong>{gbp(row.profitability.predictedProfitPence)}</strong>
                          <span
                            className={`badge ${statusBadgeClass(row.profitability.predictedStatus)}`}
                          >
                            {row.profitability.predictedStatus}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="perf-money">
                          <strong>{gbp(row.profitability.actualProfitPence)}</strong>
                          <span
                            className={`badge ${statusBadgeClass(row.profitability.actualStatus)}`}
                          >
                            {row.profitability.actualStatus}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="perf-sales">
                          {row.sales.slice(0, 5).map((sale) => (
                            <div key={sale.id} className="perf-sale-row">
                              <span>
                                {sale.campaignName} · {gbp(sale.valuePence)} · {sale.status}
                              </span>
                              {!sale.isActual && sale.status !== "CANCELLED" && isMd ? (
                                <button
                                  className="btn perf-mark-paid"
                                  onClick={() => markPaid(sale.id)}
                                >
                                  Mark Paid
                                </button>
                              ) : null}
                            </div>
                          ))}
                          {row.sales.length === 0 ? (
                            <span className="muted">No sales</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {mine ? (
        <div className="perf-page">
          <section className="perf-kpis">
            {[
              { label: "Doors", value: String(mine.kpis.doors) },
              { label: "Conversations", value: String(mine.kpis.conversations) },
              { label: "Sales", value: String(mine.kpis.sales) },
              { label: "Door → Conv", value: `${mine.kpis.doorToConversationPct}%` },
              { label: "Conv → Sale", value: `${mine.kpis.conversationToSalePct}%` },
            ].map((m) => (
              <article key={m.label} className="perf-kpi">
                <span className="perf-kpi-label">{m.label}</span>
                <strong className="perf-kpi-value">{m.value}</strong>
              </article>
            ))}
          </section>

          <section className="perf-associates">
            <div className="perf-associates-head">
              <div>
                <h2>My profitability</h2>
                <p>
                  Day rate {gbp(mine.commercials.dayRatePence)} · Days worked{" "}
                  {mine.kpis.daysWorked} · Cost {gbp(mine.profitability.costPence)}
                </p>
              </div>
            </div>
            <div className="perf-kpis perf-kpis-mine">
              <article className="perf-kpi">
                <span className="perf-kpi-label">Predicted revenue</span>
                <strong className="perf-kpi-value">
                  {gbp(mine.profitability.predictedRevenuePence)}
                </strong>
              </article>
              <article className="perf-kpi">
                <span className="perf-kpi-label">Predicted profit</span>
                <strong className="perf-kpi-value">
                  {gbp(mine.profitability.predictedProfitPence)}
                </strong>
                <span className={`badge ${statusBadgeClass(mine.profitability.predictedStatus)}`}>
                  {mine.profitability.predictedStatus}
                </span>
              </article>
              <article className="perf-kpi">
                <span className="perf-kpi-label">Actual revenue</span>
                <strong className="perf-kpi-value">
                  {gbp(mine.profitability.actualRevenuePence)}
                </strong>
              </article>
              <article className="perf-kpi">
                <span className="perf-kpi-label">Actual profit</span>
                <strong className="perf-kpi-value">
                  {gbp(mine.profitability.actualProfitPence)}
                </strong>
                <span className={`badge ${statusBadgeClass(mine.profitability.actualStatus)}`}>
                  {mine.profitability.actualStatus}
                </span>
              </article>
            </div>
            <p className="muted" style={{ marginTop: 12 }}>
              Predicted counts sales when recorded. Actual counts only sales that reach the
              campaign&apos;s realised status (usually PAID).
            </p>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
