"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  identityState: string;
  lifecycleState: string;
  isFieldReady: boolean;
  deployments: Array<{ campaign: { name: string }; territory: { name: string } }>;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "JUNIOR_ASSOCIATE" as "JUNIOR_ASSOCIATE" | "ASSOCIATE" | "MANAGING_DIRECTOR",
  });

  async function load() {
    const res = await api.users();
    setUsers(res.users);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createUser(form);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "JUNIOR_ASSOCIATE",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <AppShell
      title="People"
      subtitle="Create identities, assign roles, and track Field Readiness lifecycle state."
    >
      {error ? <div className="error">{error}</div> : null}

      <div className="panel">
        <h2>Invite / create user</h2>
        <form className="form row" onSubmit={onCreate}>
          <label>
            First name
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
          </label>
          <label>
            Last name
            <input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label>
            Role
            <select
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value as typeof form.role,
                })
              }
            >
              <option value="JUNIOR_ASSOCIATE">Junior Associate</option>
              <option value="ASSOCIATE">Associate</option>
              <option value="MANAGING_DIRECTOR">Managing Director</option>
            </select>
          </label>
          <button className="btn primary" type="submit">
            Create user
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>Directory</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Identity</th>
              <th>Lifecycle</th>
              <th>Field Ready</th>
              <th>Deployment</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.firstName} {u.lastName}
                  <div className="muted">{u.email}</div>
                </td>
                <td>{u.role.replaceAll("_", " ")}</td>
                <td>{u.identityState}</td>
                <td>{u.lifecycleState}</td>
                <td>
                  <span className={`badge ${u.isFieldReady ? "ok" : "warn"}`}>
                    {u.isFieldReady ? "Yes" : "No"}
                  </span>
                </td>
                <td>
                  {u.deployments[0]
                    ? `${u.deployments[0].campaign.name} · ${u.deployments[0].territory.name}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
