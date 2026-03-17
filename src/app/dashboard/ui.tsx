"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ExpenseCategory =
  | "FOOD"
  | "RENT"
  | "TRANSPORT"
  | "UTILITIES"
  | "SUBSCRIPTIONS"
  | "SCHOOL"
  | "OTHER";

const categories: { value: ExpenseCategory; label: string }[] = [
  { value: "FOOD", label: "Food" },
  { value: "RENT", label: "Rent" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "SUBSCRIPTIONS", label: "Subscriptions" },
  { value: "SCHOOL", label: "School" },
  { value: "OTHER", label: "Other" },
];

function yyyyMmNow() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function DashboardClient() {
  const { data: session } = useSession();
  const [month, setMonth] = useState(yyyyMmNow());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<{
    total: number;
    perCategory: { category: ExpenseCategory; amount: number; percentage: number }[];
  } | null>(null);

  const [trends, setTrends] = useState<{ month: string; total: number }[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

  const pieData = useMemo(() => {
    if (!summary) return [];
    return categories.map((c) => {
      const entry = summary.perCategory.find((x) => x.category === c.value);
      return { name: c.label, value: entry?.amount ?? 0 };
    });
  }, [summary]);

  async function load() {
    setLoading(true);
    setError(null);

    const [sRes, tRes, iRes] = await Promise.all([
      fetch(`/api/analytics/monthly-summary?month=${month}`),
      fetch("/api/analytics/trends?range=12m"),
      fetch(`/api/analytics/insights?month=${month}`),
    ]);

    if (!sRes.ok || !tRes.ok || !iRes.ok) {
      setError("Failed to load dashboard data.");
      setLoading(false);
      return;
    }

    const sData = (await sRes.json()) as {
      total: string | number;
      perCategory: { category: ExpenseCategory; amount: string | number; percentage: number }[];
    };
    setSummary({
      total: Number(sData.total),
      perCategory: sData.perCategory.map((x) => ({
        category: x.category,
        amount: Number(x.amount),
        percentage: x.percentage,
      })),
    });

    const tData = (await tRes.json()) as { points: { month: string; total: number }[] };
    setTrends(tData.points);

    const iData = (await iRes.json()) as { insights: string[] };
    setInsights(iData.insights ?? []);

    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-black">
      <main className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Category distribution, trends, and quick insights.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Month
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </label>
            <button
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
              type="button"
              onClick={load}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <details className="relative">
              <summary className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {session?.user?.name?.[0]?.toUpperCase() ??
                    session?.user?.email?.[0]?.toUpperCase() ??
                    "U"}
                </span>
                <span className="hidden sm:inline">
                  {session?.user?.name ?? session?.user?.email ?? "Profile"}
                </span>
              </summary>
              <div className="absolute right-0 z-10 mt-2 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                <a
                  href="/profile"
                  className="block px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Profile settings
                </a>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="block w-full px-3 py-2 text-left text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Log out
                </button>
              </div>
            </details>
          </div>
        </header>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Total spending ({month})
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {summary ? formatMoney(summary.total) : "—"}
            </div>
            <div className="mt-4 flex gap-3 text-sm">
              <a className="underline text-zinc-900 dark:text-zinc-50" href="/expenses">
                Expenses
              </a>
              <a className="underline text-zinc-900 dark:text-zinc-50" href="/summary">
                Summary & budgets
              </a>
              <a className="underline text-zinc-900 dark:text-zinc-50" href="/recurring">
                Recurring
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950 lg:col-span-2">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Monthly spending trend (12m)
            </div>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <XAxis dataKey="month" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Category distribution ({month})
            </div>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Key insights
            </div>
            <div className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              {loading ? (
                <p className="text-zinc-600 dark:text-zinc-400">Loading…</p>
              ) : insights.length === 0 ? (
                <p className="text-zinc-600 dark:text-zinc-400">
                  Add more data to see insights.
                </p>
              ) : (
                insights.slice(0, 6).map((x, idx) => (
                  <p key={idx} className="rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    {x}
                  </p>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

