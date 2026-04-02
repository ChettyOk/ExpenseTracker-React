"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/AppShell";
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
  const [month, setMonth] = useState(yyyyMmNow());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<{
    total: number;
    perCategory: { category: ExpenseCategory; amount: number; percentage: number }[];
  } | null>(null);

  const [trends, setTrends] = useState<{ month: string; total: number }[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

  const [budgetRows, setBudgetRows] = useState<
    { category: ExpenseCategory; limit: number }[]
  >([]);
  const [recurringVs, setRecurringVs] = useState<{
    expectedRecurringTotal: number;
    actualFromRecurring: number;
    monthTotalSpend: number;
  } | null>(null);

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

    const fetchOpts = { cache: "no-store" as RequestCache };
    const [sRes, tRes, iRes, bRes, rRes] = await Promise.all([
      fetch(`/api/analytics/monthly-summary?month=${month}`, fetchOpts),
      fetch("/api/analytics/trends?range=12m", fetchOpts),
      fetch(`/api/analytics/insights?month=${month}`, fetchOpts),
      fetch(`/api/budgets?month=${month}`, fetchOpts),
      fetch(`/api/analytics/recurring-vs-actual?month=${month}`, fetchOpts),
    ]);

    if (!sRes.ok || !tRes.ok || !iRes.ok || !bRes.ok || !rRes.ok) {
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

    const bData = (await bRes.json()) as {
      budgets: { category: ExpenseCategory; limit: string | number }[];
    };
    setBudgetRows(
      bData.budgets.map((b) => ({
        category: b.category,
        limit: Number(b.limit),
      })),
    );

    const rData = (await rRes.json()) as {
      expectedRecurringTotal: number;
      actualFromRecurring: number;
      monthTotalSpend: number;
    };
    setRecurringVs(rData);

    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  return (
    <AppShell
      title="Dashboard"
      description="Category distribution, trends, and quick insights."
      headerExtra={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Month</span>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:[&::-webkit-calendar-picker-indicator]:opacity-90 dark:[&::-webkit-calendar-picker-indicator]:invert"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
          <button
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            type="button"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      }
    >
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
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Quick links
            </p>
            <nav
              className="mt-2 grid grid-cols-2 gap-2"
              aria-label="Quick navigation"
            >
              <Link
                href="/expenses"
                className="flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-center text-sm font-medium text-zinc-900 transition hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
              >
                Expenses
              </Link>
              <Link
                href="/summary"
                className="flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-center text-sm font-medium text-zinc-900 transition hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
              >
                Summary
              </Link>
              <Link
                href="/recurring"
                className="flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-center text-sm font-medium text-zinc-900 transition hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
              >
                Recurring
              </Link>
              <Link
                href="/settings/rules"
                className="flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-center text-sm font-medium leading-snug text-zinc-900 transition hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
              >
                Import &amp; rules
              </Link>
            </nav>
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
              Budgets vs spending ({month})
            </div>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Set limits on{" "}
              <a className="underline text-zinc-900 dark:text-zinc-50" href="/summary">
                Summary & budgets
              </a>
              .
            </p>
            <div className="mt-3 space-y-2 text-sm">
              {loading ? (
                <p className="text-zinc-600 dark:text-zinc-400">Loading…</p>
              ) : budgetRows.length === 0 ? (
                <p className="text-zinc-600 dark:text-zinc-400">
                  No budgets for this month.
                </p>
              ) : (
                budgetRows.map((b) => {
                  const spent =
                    summary?.perCategory.find((x) => x.category === b.category)?.amount ?? 0;
                  const pct = b.limit > 0 ? spent / b.limit : 0;
                  const over = spent > b.limit;
                  const warn = !over && pct >= 0.8;
                  return (
                    <div
                      key={b.category}
                      className="rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                    >
                      <div className="flex justify-between gap-2 font-medium text-zinc-900 dark:text-zinc-50">
                        <span>{categories.find((c) => c.value === b.category)?.label}</span>
                        <span className="tabular-nums">
                          {formatMoney(spent)} / {formatMoney(b.limit)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className={`h-full rounded-full ${over ? "bg-red-500" : warn ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(100, pct * 100)}%` }}
                        />
                      </div>
                      {over ? (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                          Over budget by {formatMoney(spent - b.limit)}.
                        </p>
                      ) : warn ? (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                          At or above 80% of budget.
                        </p>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Recurring vs actual ({month})
            </div>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Expected total from active recurring rules vs expenses generated from those rules this
              month.
            </p>
            <dl className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              <div className="flex justify-between gap-2">
                <dt>Expected (active rules)</dt>
                <dd className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                  {recurringVs ? formatMoney(recurringVs.expectedRecurringTotal) : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Logged from recurring</dt>
                <dd className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                  {recurringVs ? formatMoney(recurringVs.actualFromRecurring) : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-zinc-200 pt-2 dark:border-zinc-800">
                <dt>Total spend (month)</dt>
                <dd className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                  {recurringVs ? formatMoney(recurringVs.monthTotalSpend) : "—"}
                </dd>
              </div>
            </dl>
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
    </AppShell>
  );
}

