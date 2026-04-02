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
    return <p className="text-zinc-600 dark:text-zinc-400">Loading users…</p>;
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={createUser}
        className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Create user
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="block text-xs text-zinc-500">
            Email
            <input
              className="mt-1 w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Name
            <input
              className="mt-1 w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Role
            <select
              className="mt-1 w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "USER" | "ADMIN")}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
          <label className="block text-xs text-zinc-500">
            Password
            <input
              className="mt-1 w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
        </div>
        {createError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {createError}
          </p>
        )}
        <button
          type="submit"
          disabled={creating}
          className="mt-3 rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {creating ? "Creating..." : "Create user"}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  Email
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  Name
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  Role
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  Expenses
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  Recurring
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  Created
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-zinc-100 dark:border-zinc-800"
                >
                  {editingId === u.id ? (
                    <td className="px-4 py-3" colSpan={7}>
                      <div className="space-y-3 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="text-xs text-zinc-500">Email</span>
                            <input
                              className="mt-0.5 w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs text-zinc-500">Name</span>
                            <input
                              className="mt-0.5 w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">Role</span>
                            <select
                              className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                              value={editRole}
                              onChange={(e) =>
                                setEditRole(e.target.value as "USER" | "ADMIN")
                              }
                            >
                              <option value="USER">USER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </label>
                          <label className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">
                              New password (optional)
                            </span>
                            <input
                              className="w-40 rounded border border-zinc-200 bg-white px-2 py-1.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                              type="password"
                              placeholder="Leave blank to keep"
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                            />
                          </label>
                        </div>
                        {saveError && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {saveError}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                            onClick={() => void saveEdit()}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                        {u.email}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {u.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            u.role === "ADMIN"
                              ? "rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                              : "text-zinc-600 dark:text-zinc-400"
                          }
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {u.expenseCount}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {u.recurringCount}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="mr-3 text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                        >
                          View data
                        </Link>
                        <button
                          type="button"
                          className="mr-2 text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                          onClick={() => startEdit(u)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-600 underline hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          onClick={() => void deleteUser(u.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <p className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">
            No users yet.
          </p>
        )}
      </div>
    </div>
  );
}

