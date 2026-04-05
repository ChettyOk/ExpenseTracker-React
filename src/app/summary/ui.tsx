"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/AppShell";
import { shiftCalendarMonth } from "@/lib/month";

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

function formatMonthReadable(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return yyyyMm;
  const d = new Date(y, m - 1, 1);
  if (Number.isNaN(d.getTime())) return yyyyMm;
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

export default function SummaryClient() {
  const [month, setMonth] = useState(yyyyMmNow());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    total: number;
    perCategory: { category: ExpenseCategory; amount: number; percentage: number }[];
  } | null>(null);

  const [budgets, setBudgets] = useState<Record<ExpenseCategory, string>>(() => {
    const init: Record<ExpenseCategory, string> = {
      FOOD: "",
      RENT: "",
      TRANSPORT: "",
      UTILITIES: "",
      SUBSCRIPTIONS: "",
      SCHOOL: "",
      OTHER: "",
    };
    return init;
  });

  const usageByCategory = useMemo(() => {
    const map = new Map(summary?.perCategory.map((x) => [x.category, x.amount]) ?? []);
    return (cat: ExpenseCategory) => map.get(cat) ?? 0;
  }, [summary]);

  async function loadAll() {
    setLoading(true);
    setError(null);

    const fetchOpts = { cache: "no-store" as RequestCache };
    const [sRes, bRes] = await Promise.all([
      fetch(`/api/analytics/monthly-summary?month=${month}`, fetchOpts),
      fetch(`/api/budgets?month=${month}`, fetchOpts),
    ]);

    if (!sRes.ok) {
      setError("Failed to load monthly summary.");
      setLoading(false);
      return;
    }
    if (!bRes.ok) {
      setError("Failed to load budgets.");
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

    const bData = (await bRes.json()) as {
      budgets: { category: ExpenseCategory; limit: string | number }[];
    };
    const next = { ...budgets };
    for (const row of bData.budgets) next[row.category] = String(row.limit);
    setBudgets(next);

    setLoading(false);
  }

  async function saveBudgets() {
    setLoading(true);
    setError(null);

    const payload = {
      month,
      budgets: categories.map((c) => ({
        category: c.value,
        limit: Number(budgets[c.value] || 0),
      })),
    };

    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setError("Failed to save budgets.");
      setLoading(false);
      return;
    }

    await loadAll();
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  return (
    <AppShell
      contentMaxWidth="max-w-5xl"
      title="Monthly summary & budgets"
      description="Totals by category, plus budget usage warnings at 80%."
      headerExtra={
        <div className="flex w-full max-w-full flex-col items-center gap-3 sm:w-auto sm:items-end">
          <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:max-w-none sm:justify-end">
            <button
              type="button"
              className="ui-btn-secondary !px-3 !py-2 transition active:scale-95"
              onClick={() => setMonth((m) => shiftCalendarMonth(m, -1))}
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className="min-w-[10.5rem] text-center text-base font-bold tabular-nums text-slate-900 sm:min-w-[11rem] dark:text-zinc-100">
              {formatMonthReadable(month)}
            </span>
            <button
              type="button"
              className="ui-btn-secondary !px-3 !py-2 transition active:scale-95"
              onClick={() => setMonth((m) => shiftCalendarMonth(m, 1))}
              aria-label="Next month"
            >
              ›
            </button>
            <input
              className="ui-input w-full min-w-[12rem] max-w-[14rem] shrink-0 sm:w-auto dark:[&::-webkit-calendar-picker-indicator]:opacity-90 dark:[&::-webkit-calendar-picker-indicator]:invert"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label="Jump to month"
            />
          </div>
          <button
            className="ui-btn-secondary self-center disabled:pointer-events-none disabled:opacity-50 sm:self-end"
            type="button"
            onClick={() => void loadAll()}
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      }
    >
        <section className="ui-card">
          {error ? (
            <p className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              {error}
            </p>
          ) : null}

          {loading && !summary ? (
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="ui-skeleton h-36 rounded-2xl" />
              <div className="ui-skeleton h-36 rounded-2xl" />
            </div>
          ) : null}

          {summary ? (
            <div className="mt-2 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-5 dark:border-zinc-800 dark:bg-zinc-900/35">
                <p className="ui-label-cap">Total spending</p>
                <p className="ui-muted mt-1 text-xs font-medium normal-case tracking-normal">
                  {formatMonthReadable(month)}
                </p>
                <p className="ui-stat-hero ui-stat-hero-accent mt-3">{formatMoney(summary.total)}</p>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-5 dark:border-zinc-800 dark:bg-zinc-900/35">
                <p className="ui-label-cap">Category breakdown</p>
                <p className="ui-muted mt-1 text-xs font-medium normal-case tracking-normal">
                  Share of spending
                </p>
                <div className="mt-4 space-y-2.5">
                  {categories.map((c) => {
                    const entry = summary.perCategory.find((x) => x.category === c.value);
                    const amt = entry?.amount ?? 0;
                    const pct = entry ? Math.round(entry.percentage * 100) : 0;
                    return (
                      <div
                        key={c.value}
                        className="flex items-center justify-between border-b border-slate-200/60 pb-2 text-sm last:border-0 dark:border-zinc-800"
                      >
                        <span className="text-slate-600 dark:text-zinc-400">{c.label}</span>
                        <span className="font-semibold tabular-nums text-slate-900 dark:text-zinc-50">
                          {formatMoney(amt)}{" "}
                          <span className="text-xs font-normal text-slate-500 dark:text-zinc-500">
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : !loading ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
              <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">No summary loaded</p>
              <p className="ui-muted mt-1 text-xs">Choose a month and press Refresh, or add expenses first.</p>
              <Link href="/expenses" className="ui-btn-primary mt-4 inline-flex text-sm">
                Go to expenses
              </Link>
            </div>
          ) : null}
        </section>

        <section className="ui-card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="ui-card-header normal-case">Budgets (per category)</h2>
              <p className="ui-muted mt-1 text-xs font-normal">Enter limits and save — warnings show at 80% usage.</p>
            </div>
            <button
              className="ui-btn-primary shrink-0 disabled:opacity-50"
              type="button"
              onClick={saveBudgets}
              disabled={loading}
            >
              Save budgets
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {categories.map((c) => {
              const spent = usageByCategory(c.value);
              const limit = Number(budgets[c.value] || 0);
              const usage = limit > 0 ? spent / limit : 0;
              const pct = Math.min(1, usage);
              const warn = limit > 0 && usage >= 0.8;

              return (
                <div
                  key={c.value}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 transition hover:border-teal-200/50 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:border-teal-900/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900 dark:text-zinc-50">
                      {c.label}
                    </div>
                    <div
                      className={
                        warn
                          ? "text-xs font-medium text-amber-700 dark:text-amber-300"
                          : "text-xs text-zinc-600 dark:text-zinc-400"
                      }
                    >
                      {limit > 0 ? `${Math.round(usage * 100)}% used` : "No budget set"}
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                    <div
                      className={
                        warn
                          ? "h-full bg-amber-500 transition-all duration-300"
                          : "h-full bg-teal-600 transition-all duration-300 dark:bg-teal-500"
                      }
                      style={{ width: `${Math.round(pct * 100)}%` }}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Spent:{" "}
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {formatMoney(spent)}
                      </span>
                    </div>
                    <label className="block text-right">
                      <span className="sr-only">Limit</span>
                      <input
                        className="ui-input py-2 text-right text-sm"
                        inputMode="decimal"
                        placeholder="0"
                        value={budgets[c.value]}
                        onChange={(e) =>
                          setBudgets((prev) => ({ ...prev, [c.value]: e.target.value }))
                        }
                      />
                    </label>
                  </div>

                  {warn ? (
                    <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                      Warning: you’ve exceeded 80% of this category budget.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
    </AppShell>
  );
}

