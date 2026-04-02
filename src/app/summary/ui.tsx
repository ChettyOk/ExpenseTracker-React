"use client";

import { useMemo, useState } from "react";

import AppShell from "@/components/AppShell";

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

export default function SummaryClient() {
  const [month, setMonth] = useState(yyyyMmNow());
  const [loading, setLoading] = useState(false);
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

  return (
    <AppShell
      contentMaxWidth="max-w-5xl"
      title="Monthly summary & budgets"
      description="Totals by category, plus budget usage warnings at 80%."
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
            onClick={() => void loadAll()}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load"}
          </button>
        </div>
      }
    >
        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950 sm:p-6">

          {error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          ) : null}

          {summary ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Total spending
                </h2>
                <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatMoney(summary.total)}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Category breakdown
                </h2>
                <div className="mt-3 space-y-2">
                  {categories.map((c) => {
                    const entry = summary.perCategory.find((x) => x.category === c.value);
                    const amt = entry?.amount ?? 0;
                    const pct = entry ? Math.round(entry.percentage * 100) : 0;
                    return (
                      <div key={c.value} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-700 dark:text-zinc-300">{c.label}</span>
                        <span className="text-zinc-900 dark:text-zinc-50">
                          {formatMoney(amt)} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Budgets (per category)
            </h2>
            <button
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
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
                  className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
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

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
                    <div
                      className={
                        warn
                          ? "h-full bg-amber-500"
                          : "h-full bg-zinc-900 dark:bg-zinc-50"
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
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-right text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
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

