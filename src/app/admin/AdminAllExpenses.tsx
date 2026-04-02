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
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Filters
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">User</span>
            <select
              className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">All</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Category</span>
            <select
              className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">From</span>
            <input
              type="date"
              className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">To</span>
            <input
              type="date"
              className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  User
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  Amount
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  Category
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  Date
                </th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                    Loading…
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                    No expenses match your filters.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                      {e.userName || e.userEmail}
                    </td>
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                      {formatMoney(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {e.category}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {e.date}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {e.description ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && totalCount > PAGE ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
            <span className="text-zinc-600 dark:text-zinc-400">
              {totalCount === 0 ? 0 : offset + 1}–{Math.min(offset + expenses.length, totalCount)} of{" "}
              {totalCount.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0}
                className="rounded border border-zinc-300 px-3 py-1 text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                onClick={() => void load(Math.max(0, offset - PAGE))}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={offset + PAGE >= totalCount}
                className="rounded border border-zinc-300 px-3 py-1 text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
