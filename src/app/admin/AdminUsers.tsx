"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  expenseCount: number;
  recurringCount: number;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"USER" | "ADMIN">("USER");
  const [editPassword, setEditPassword] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"USER" | "ADMIN">("USER");
  const [newPassword, setNewPassword] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/users");
    if (!res.ok) {
      setError("Failed to load users.");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { users: UserRow[] };
    setUsers(data.users);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail,
        name: newName || undefined,
        role: newRole,
        password: newPassword,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setCreateError(data.error ?? "Failed to create user.");
      return;
    }
    setNewEmail("");
    setNewName("");
    setNewRole("USER");
    setNewPassword("");
    void load();
  }

  function startEdit(u: UserRow) {
    setEditingId(u.id);
    setEditEmail(u.email);
    setEditName(u.name ?? "");
    setEditRole(u.role as "USER" | "ADMIN");
    setEditPassword("");
    setSaveError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditEmail("");
    setEditName("");
    setEditRole("USER");
    setEditPassword("");
    setSaveError(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaveError(null);
    const body: {
      email?: string;
      name?: string;
      role?: "USER" | "ADMIN";
      password?: string;
    } = {
      email: editEmail,
      name: editName || undefined,
      role: editRole,
    };
    if (editPassword.trim()) body.password = editPassword;
    const res = await fetch(`/api/admin/users/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSaveError(data.error ?? "Failed to update user.");
      return;
    }
    cancelEdit();
    void load();
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user? Their expenses and data will be removed.")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Failed to delete user.");
      return;
    }
    void load();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="ui-card space-y-3">
          <div className="ui-skeleton h-5 w-32" />
          <div className="grid gap-3 md:grid-cols-4">
            <div className="ui-skeleton h-20 rounded-xl" />
            <div className="ui-skeleton h-20 rounded-xl" />
            <div className="ui-skeleton h-20 rounded-xl" />
            <div className="ui-skeleton h-20 rounded-xl" />
          </div>
        </div>
        <div className="ui-skeleton h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createUser} className="ui-card">
        <h2 className="ui-card-header normal-case">Create user</h2>
        <p className="ui-muted mt-1 text-sm font-normal">Add credentials and role. Password must be at least 8 characters.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Email</span>
            <input
              className="ui-input mt-1.5"
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Name</span>
            <input className="ui-input mt-1.5" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Role</span>
            <select
              className="ui-input mt-1.5"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "USER" | "ADMIN")}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Password</span>
            <input
              className="ui-input mt-1.5"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
        </div>
        {createError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{createError}</p>
        ) : null}
        <button type="submit" disabled={creating} className="ui-btn-primary mt-4 disabled:opacity-50">
          {creating ? "Creating…" : "Create user"}
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-[var(--surface-elevated)] shadow-sm ring-1 ring-slate-900/[0.02] dark:border-white/[0.07] dark:bg-zinc-950 dark:ring-white/[0.03]">
        <div className="border-b border-slate-200/80 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-50">All users</h2>
          <p className="ui-muted mt-0.5 text-xs">{users.length.toLocaleString()} accounts</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                  Email
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                  Name
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                  Role
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                  Expenses
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                  Recurring
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                  Created
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 transition hover:bg-slate-50/50 dark:border-zinc-800 dark:hover:bg-zinc-900/40">
                  {editingId === u.id ? (
                    <td className="px-4 py-4" colSpan={7}>
                      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">Email</span>
                            <input className="ui-input mt-1" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                          </label>
                          <label className="block">
                            <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">Name</span>
                            <input className="ui-input mt-1" value={editName} onChange={(e) => setEditName(e.target.value)} />
                          </label>
                        </div>
                        <div className="flex flex-wrap items-end gap-4">
                          <label className="block">
                            <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">Role</span>
                            <select
                              className="ui-input mt-1"
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value as "USER" | "ADMIN")}
                            >
                              <option value="USER">USER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </label>
                          <label className="block flex-1 min-w-48">
                            <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                              New password (optional)
                            </span>
                            <input
                              className="ui-input mt-1"
                              type="password"
                              placeholder="Leave blank to keep"
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                            />
                          </label>
                        </div>
                        {saveError ? (
                          <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="ui-btn-primary"
                            onClick={() => void saveEdit()}
                          >
                            Save
                          </button>
                          <button type="button" className="ui-btn-secondary" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-zinc-50">{u.email}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-zinc-400">{u.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            u.role === "ADMIN"
                              ? "rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                              : "text-slate-600 dark:text-zinc-400"
                          }
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-zinc-400">{u.expenseCount}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-zinc-400">{u.recurringCount}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-zinc-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Link href={`/admin/users/${u.id}`} className="ui-link text-sm no-underline hover:underline">
                            View data
                          </Link>
                          <button
                            type="button"
                            className="text-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2 hover:text-teal-800 dark:text-teal-400"
                            onClick={() => startEdit(u)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-sm font-medium text-red-600 underline underline-offset-2 hover:text-red-700 dark:text-red-400"
                            onClick={() => void deleteUser(u.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 ? (
          <div className="border-t border-dashed border-slate-200 px-4 py-10 text-center dark:border-zinc-800">
            <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">No users yet</p>
            <p className="ui-muted mt-1 text-xs">Create the first account with the form above.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
