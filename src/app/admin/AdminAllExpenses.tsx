"use client";

import { useCallback, useEffect, useState } from "react";

type UserOption = { id: string; email: string; name: string | null };
type ExpenseRow = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  amount: string;
  category: string;
  date: string;
  description: string | null;
};

const categories = [
  "FOOD",
  "RENT",
  "TRANSPORT",
  "UTILITIES",
  "SUBSCRIPTIONS",
  "SCHOOL",
  "OTHER",
];

function formatMoney(s: string) {
  const n = Number(s);
  if (Number.isNaN(n)) return s;
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function AdminAllExpenses() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const PAGE = 200;
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const load = useCallback(
    async (off: number) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("limit", String(PAGE));
      params.set("offset", String(off));
      if (userId) params.set("userId", userId);
      if (category) params.set("category", category);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const [uRes, eRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch(`/api/admin/expenses?${params.toString()}`),
      ]);
      if (!uRes.ok || !eRes.ok) {
        setError("Failed to load data.");
        setLoading(false);
        return;
      }
      const uData = (await uRes.json()) as {
        users: { id: string; email: string; name: string | null }[];
      };
      const eData = (await eRes.json()) as {
        expenses: ExpenseRow[];
        totalCount: number;
        offset: number;
      };
      setUsers(
        uData.users.map((u) => ({ id: u.id, email: u.email, name: u.name })),
      );
      setExpenses(eData.expenses);
      setTotalCount(eData.totalCount);
      setOffset(eData.offset);
      setLoading(false);
    },
    [userId, category, from, to],
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="ui-card">
        <h2 className="ui-card-header normal-case">Filters</h2>
        <p className="ui-muted mt-1 text-sm font-normal">Narrow the global expense list before exporting or reviewing.</p>
        <div className="mt-5 flex flex-wrap items-end gap-4">
          <label className="block min-w-44">
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">User</span>
            <select className="ui-input mt-1.5" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">All</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-36">
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Category</span>
            <select className="ui-input mt-1.5" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-40">
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">From</span>
            <input
              type="date"
              className="ui-input mt-1.5 dark:[&::-webkit-calendar-picker-indicator]:opacity-80"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="block min-w-40">
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">To</span>
            <input
              type="date"
              className="ui-input mt-1.5 dark:[&::-webkit-calendar-picker-indicator]:opacity-80"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-[var(--surface-elevated)] shadow-sm ring-1 ring-slate-900/[0.02] dark:border-white/[0.07] dark:bg-zinc-950 dark:ring-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                  User
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                  Amount
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                  Category
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                  Date
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8">
                    <div className="space-y-2">
                      <div className="ui-skeleton h-10 w-full rounded-lg" />
                      <div className="ui-skeleton h-10 w-full rounded-lg" />
                      <div className="ui-skeleton h-10 w-full rounded-lg" />
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12">
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">No expenses match</p>
                      <p className="ui-muted mt-1 text-xs">Adjust filters or pick another user.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50/50 dark:border-zinc-800 dark:hover:bg-zinc-900/40"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-zinc-50">
                      {e.userName || e.userEmail}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-slate-900 dark:text-zinc-50">
                      {formatMoney(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-zinc-400">{e.category}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-zinc-400">{e.date}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600 dark:text-zinc-400">
                      {e.description ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && totalCount > PAGE ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 px-4 py-3 text-sm dark:border-zinc-800">
            <span className="text-slate-600 dark:text-zinc-400">
              {totalCount === 0 ? 0 : offset + 1}–{Math.min(offset + expenses.length, totalCount)} of{" "}
              {totalCount.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0}
                className="ui-btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
                onClick={() => void load(Math.max(0, offset - PAGE))}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={offset + PAGE >= totalCount}
                className="ui-btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
                onClick={() => void load(offset + PAGE)}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
