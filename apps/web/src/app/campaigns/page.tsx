"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

type Campaign = {
  id: string;
  name: string;
  clientName: string | null;
  saleValuePence: number;
  territories: Array<{ id: string; name: string }>;
  funnelStages: Array<{ id: string; name: string; code: string }>;
  _count: { deployments: number };
};

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  isFieldReady: boolean;
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    clientName: "",
    saleValuePence: 10000,
  });
  const [territoryForm, setTerritoryForm] = useState({
    campaignId: "",
    name: "",
  });
  const [deployForm, setDeployForm] = useState({
    userId: "",
    campaignId: "",
    territoryId: "",
  });

  async function load() {
    const [c, u] = await Promise.all([api.campaigns(), api.users()]);
    setCampaigns(c.campaigns);
    setUsers(u.users);
    if (!territoryForm.campaignId && c.campaigns[0]) {
      setTerritoryForm((f) => ({ ...f, campaignId: c.campaigns[0].id }));
    }
    if (!deployForm.campaignId && c.campaigns[0]) {
      setDeployForm((f) => ({
        ...f,
        campaignId: c.campaigns[0].id,
        territoryId: c.campaigns[0].territories[0]?.id ?? "",
      }));
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createCampaign(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createCampaign(campaignForm);
      setCampaignForm({ name: "", clientName: "", saleValuePence: 10000 });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create campaign failed");
    }
  }

  async function createTerritory(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createTerritory(territoryForm.campaignId, {
        name: territoryForm.name,
      });
      setTerritoryForm((f) => ({ ...f, name: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create territory failed");
    }
  }

  async function deploy(e: FormEvent) {
    e.preventDefault();
    try {
      await api.deploy(deployForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed");
    }
  }

  const selectedCampaign = campaigns.find((c) => c.id === deployForm.campaignId);
  const fieldReadyUsers = users.filter((u) => u.isFieldReady);

  return (
    <AppShell
      title="Campaigns & Territories"
      subtitle="Business-configurable commercials, funnel stages, territories and deployments."
    >
      {error ? <div className="error">{error}</div> : null}

      <div className="campaigns-page">
        <div className="campaigns-forms">
          <section className="ops-card">
            <div className="ops-card-head">
              <h2>Create campaign</h2>
              <p>Set commercials and launch a new client programme.</p>
            </div>
            <form className="ops-card-form" onSubmit={createCampaign}>
              <label>
                Name
                <input
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  placeholder="Campaign name"
                  required
                />
              </label>
              <label>
                Client
                <input
                  value={campaignForm.clientName}
                  onChange={(e) => setCampaignForm({ ...campaignForm, clientName: e.target.value })}
                  placeholder="Client name"
                />
              </label>
              <label>
                Sale value (pence)
                <input
                  type="number"
                  value={campaignForm.saleValuePence}
                  onChange={(e) =>
                    setCampaignForm({
                      ...campaignForm,
                      saleValuePence: Number(e.target.value),
                    })
                  }
                  required
                />
              </label>
              <button className="btn primary ops-card-cta" type="submit">
                Create campaign
              </button>
            </form>
          </section>

          <section className="ops-card">
            <div className="ops-card-head">
              <h2>Add territory</h2>
              <p>Define where Field Ready associates can be deployed.</p>
            </div>
            <form className="ops-card-form ops-card-form-2" onSubmit={createTerritory}>
              <label>
                Campaign
                <select
                  value={territoryForm.campaignId}
                  onChange={(e) =>
                    setTerritoryForm({ ...territoryForm, campaignId: e.target.value })
                  }
                >
                  {campaigns.length === 0 ? <option value="">No campaigns yet</option> : null}
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Territory name
                <input
                  value={territoryForm.name}
                  onChange={(e) => setTerritoryForm({ ...territoryForm, name: e.target.value })}
                  placeholder="e.g. North London — Zone A"
                  required
                />
              </label>
              <button className="btn primary ops-card-cta" type="submit">
                Add territory
              </button>
            </form>
          </section>

          <section className="ops-card">
            <div className="ops-card-head">
              <h2>Deploy Field Ready associate</h2>
              <p>Assign a ready associate to campaign territory for field work.</p>
            </div>
            <form className="ops-card-form" onSubmit={deploy}>
              <label>
                Associate
                <select
                  value={deployForm.userId}
                  onChange={(e) => setDeployForm({ ...deployForm, userId: e.target.value })}
                  required
                >
                  <option value="">Select…</option>
                  {fieldReadyUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Campaign
                <select
                  value={deployForm.campaignId}
                  onChange={(e) => {
                    const campaign = campaigns.find((c) => c.id === e.target.value);
                    setDeployForm({
                      ...deployForm,
                      campaignId: e.target.value,
                      territoryId: campaign?.territories[0]?.id ?? "",
                    });
                  }}
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Territory
                <select
                  value={deployForm.territoryId}
                  onChange={(e) => setDeployForm({ ...deployForm, territoryId: e.target.value })}
                  required
                >
                  <option value="">Select…</option>
                  {(selectedCampaign?.territories ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn primary ops-card-cta" type="submit">
                Assign deployment
              </button>
            </form>
          </section>
        </div>

        <section className="campaigns-directory-block">
          <h2>Campaign directory</h2>
          <p>Live commercials, funnel stages, territories and deployments.</p>
          <div className="campaign-directory">
            {campaigns.map((c) => (
              <article key={c.id} className="campaign-dir-item">
                <div className="campaign-dir-top">
                  <strong>{c.name}</strong>
                  <p className="campaign-dir-meta">
                    {c.clientName ?? "No client"} · £{(c.saleValuePence / 100).toFixed(2)} / sale
                  </p>
                </div>
                <div className="campaign-funnel">
                  {(c.funnelStages.length
                    ? c.funnelStages.map((s) => s.name)
                    : ["Doors", "Conversations", "Sale"]
                  ).map((name, i, arr) => (
                    <span key={`${c.id}-${name}-${i}`}>
                      {name}
                      {i < arr.length - 1 ? <span className="campaign-funnel-sep">→</span> : null}
                    </span>
                  ))}
                </div>
                <div className="campaign-dir-side">
                  <span className="badge">{c._count.deployments} deployments</span>
                  <p className="campaign-territories">
                    {c.territories.length
                      ? c.territories.map((t) => t.name).join(", ")
                      : "No territories"}
                  </p>
                </div>
              </article>
            ))}
            {campaigns.length === 0 ? (
              <p className="muted">No campaigns yet — create one above.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
