"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/AppShell";
import { shiftCalendarMonth } from "@/lib/month";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = [
  "#0d9488",
  "#14b8a6",
  "#0f766e",
  "#2dd4bf",
  "#115e59",
  "#5eead4",
  "#94a3b8",
];

const CHART_GRID = "rgb(148 163 184 / 0.35)";

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

const quickActions = [
  {
    href: "/expenses",
    icon: "💳",
    title: "Expenses",
    desc: "Track and manage your spending.",
  },
  {
    href: "/summary",
    icon: "📈",
    title: "Summary",
    desc: "Totals by category and budget limits.",
  },
  {
    href: "/recurring",
    icon: "🔁",
    title: "Recurring",
    desc: "Automate subscriptions and fixed bills.",
  },
  {
    href: "/settings/rules",
    icon: "📥",
    title: "Import & rules",
    desc: "CSV/PDF import and smart categorization.",
  },
];

function yyyyMmNow() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

function formatMonthReadable(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return yyyyMm;
  const d = new Date(y, m - 1, 1);
  if (Number.isNaN(d.getTime())) return yyyyMm;
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function shortTrendMonth(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return yyyyMm;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString(undefined, { month: "short", year: "2-digit" });
}

function categoryTitle(c: ExpenseCategory) {
  return categories.find((x) => x.value === c)?.label ?? c;
}

function RefreshGlyph(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  );
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

  const pieDisplay = useMemo(() => pieData.filter((p) => p.value > 0), [pieData]);
  const pieEmpty = pieDisplay.length === 0;

  const trendsNumeric = useMemo(
    () => trends.map((t) => ({ ...t, total: Number(t.total) })),
    [trends],
  );
  const trendsAllZero = trendsNumeric.length === 0 || trendsNumeric.every((t) => t.total === 0);

  const barData = useMemo(() => {
    return budgetRows.map((b) => ({
      name: categories.find((c) => c.value === b.category)?.label ?? b.category,
      budget: b.limit,
      spent: summary?.perCategory.find((x) => x.category === b.category)?.amount ?? 0,
    }));
  }, [budgetRows, summary]);

  const insightCards = useMemo(() => {
    if (loading || !summary) return [];
    if (insights.length > 0) return insights.slice(0, 6);

    if (summary.total === 0) {
      return [
        "No spending recorded this month yet.",
        "Import a bank CSV or add an expense to see trends and charts fill in.",
        "Tip: set budgets on Summary so you can track progress at a glance.",
      ];
    }

    const sorted = [...summary.perCategory].sort((a, b) => b.amount - a.amount);
    const top = sorted[0];
    const lines: string[] = [];
    if (top && top.amount > 0) {
      lines.push(
        `You typically spend the most on ${categoryTitle(top.category)} (${formatMoney(top.amount)}) this month.`,
      );
    }
    if (budgetRows.length === 0) {
      lines.push("Set a budget on Summary to compare actual spending against your plan.");
    } else {
      lines.push("Review the budget vs actual chart to spot categories nearing their limit.");
    }
    return lines;
  }, [insights, summary, loading, budgetRows.length]);

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
            <span
              className="min-w-[10.5rem] text-center text-base font-bold tabular-nums text-slate-900 sm:min-w-[11rem] dark:text-zinc-100"
              aria-live="polite"
            >
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
            <label className="sr-only" htmlFor="dashboard-month">
              Jump to month
            </label>
            <input
              id="dashboard-month"
              className="ui-input w-full min-w-[12rem] max-w-[14rem] shrink-0 sm:w-auto dark:[&::-webkit-calendar-picker-indicator]:opacity-90 dark:[&::-webkit-calendar-picker-indicator]:invert"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label="Jump to month"
            />
          </div>
          <button
            className="ui-btn-secondary inline-flex items-center justify-center gap-2 self-center disabled:pointer-events-none disabled:opacity-50 sm:self-end"
            type="button"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshGlyph className={`shrink-0 ${loading ? "motion-safe:animate-spin" : ""}`} />
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      }
    >
      {error ? (
        <p className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <section className="ui-card">
        <p className="ui-label-cap">Total spending</p>
        <p className="ui-muted mt-1 text-xs font-medium normal-case tracking-normal">
          {formatMonthReadable(month)}
        </p>
        <div className="mt-4 sm:mt-5">
          {loading && !summary ? (
            <div className="ui-skeleton h-16 w-[min(100%,28rem)] sm:h-20 md:h-24 lg:h-28" />
          ) : (
            <p className="ui-stat-hero ui-stat-hero-accent">
              {formatMoney(summary?.total ?? 0)}
            </p>
          )}
        </div>
        <p className="ui-muted mt-3 max-w-xl text-sm">
          Your combined expenses for this calendar month. Change the month above to review history.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="ui-card ui-card-interactive flex flex-col gap-2 no-underline"
          >
            <span className="text-2xl" aria-hidden>
              {a.icon}
            </span>
            <span className="text-base font-semibold text-slate-900 dark:text-zinc-50">
              {a.title}
            </span>
            <span className="ui-muted text-sm leading-snug">{a.desc}</span>
          </Link>
        ))}
      </section>

      <section className="ui-card">
        <div className="ui-card-header">Monthly spending trend</div>
        <p className="ui-muted mt-1 text-sm font-normal normal-case">Last 12 months · totals by calendar month</p>
        <div className="relative mt-5 h-60">
          {loading && !trends.length ? (
            <div className="ui-skeleton absolute inset-0 rounded-xl" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendsNumeric} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" vertical={false} className="dark:opacity-40" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-slate-500 dark:text-zinc-500"
                    tickFormatter={shortTrendMonth}
                    tickMargin={8}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "0.75rem",
                      border: "1px solid rgb(226 232 240)",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.08)",
                    }}
                    labelFormatter={(v) => shortTrendMonth(String(v))}
                    formatter={(value) => [
                      formatMoney(typeof value === "number" ? value : Number(value)),
                      "Spent",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="var(--chart-primary)"
                    strokeWidth={trendsAllZero ? 2 : 2.75}
                    strokeOpacity={trendsAllZero ? 0.45 : 1}
                    strokeDasharray={trendsAllZero ? "7 5" : undefined}
                    dot={false}
                    activeDot={{ r: 5, fill: "var(--chart-primary)" }}
                    isAnimationActive={!trendsAllZero}
                  />
                </LineChart>
              </ResponsiveContainer>
              {trendsAllZero ? (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-t from-[var(--surface-elevated)] via-transparent to-transparent px-4 text-center dark:from-zinc-950">
                  <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">No trend data yet</p>
                  <p className="ui-muted max-w-xs text-xs">
                    Add expenses over multiple months to see this line climb. Start with a CSV import or a manual entry.
                  </p>
                  <Link href="/expenses" className="pointer-events-auto ui-btn-primary mt-1 text-xs">
                    Add expense
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="ui-card">
          <div className="ui-card-header">Budget vs actual</div>
          <p className="ui-muted mt-1 text-sm font-normal normal-case">
            Compare spending to limits you set on{" "}
            <Link href="/summary" className="ui-link text-sm font-medium no-underline hover:underline">
              Summary
            </Link>
            .
          </p>

          {loading ? (
            <div className="ui-skeleton mt-5 h-56 rounded-xl" />
          ) : budgetRows.length === 0 ? (
            <div className="relative mt-5">
              <div className="pointer-events-none h-56 opacity-35">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "—", budget: 1, spent: 0 },
                      { name: "·", budget: 1, spent: 0 },
                    ]}
                    margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis hide domain={[0, 1]} />
                    <Bar dataKey="budget" fill="rgb(148 163 184 / 0.35)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="spent" fill="rgb(45 212 191 / 0.25)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-50/92 p-5 text-center dark:bg-zinc-950/92">
                <span className="text-3xl" aria-hidden>
                  📊
                </span>
                <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                  No budgets for {formatMonthReadable(month)}
                </p>
                <p className="ui-muted max-w-sm text-xs">
                  Budgets unlock this chart. Set limits per category to track progress all month.
                </p>
                <Link href="/summary" className="ui-btn-primary text-sm">
                  Create your first budget
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-5 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ left: 4, right: 8, top: 8, bottom: 28 }}>
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={48} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)}
                      width={40}
                    />
                    <Tooltip
                      formatter={(v) => formatMoney(typeof v === "number" ? v : Number(v))}
                      contentStyle={{
                        borderRadius: "0.75rem",
                        border: "1px solid rgb(226 232 240)",
                      }}
                    />
                    <Bar dataKey="budget" name="Budget" fill="rgb(148 163 184 / 0.75)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="spent" name="Spent" fill="var(--chart-primary)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2 border-t border-slate-200/80 pt-4 dark:border-zinc-800">
                {budgetRows.map((b) => {
                  const spent =
                    summary?.perCategory.find((x) => x.category === b.category)?.amount ?? 0;
                  const pct = b.limit > 0 ? spent / b.limit : 0;
                  const over = spent > b.limit;
                  const warn = !over && pct >= 0.8;
                  return (
                    <div
                      key={b.category}
                      className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/30"
                    >
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="font-medium text-slate-900 dark:text-zinc-50">
                          {categories.find((c) => c.value === b.category)?.label}
                        </span>
                        <span className="tabular-nums font-semibold text-slate-800 dark:text-zinc-100">
                          {formatMoney(spent)} / {formatMoney(b.limit)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${over ? "bg-red-500" : warn ? "bg-amber-500" : "bg-teal-500"}`}
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
                })}
              </div>
            </>
          )}
        </div>

        <div className="ui-card">
          <div className="ui-card-header">Recurring vs actual</div>
          <p className="ui-muted mt-1 text-sm font-normal normal-case">
            Active rules vs expenses this month that came from those rules.
          </p>
          {loading && !recurringVs ? (
            <div className="mt-5 space-y-3">
              <div className="ui-skeleton h-6 w-full" />
              <div className="ui-skeleton h-6 w-5/6" />
              <div className="ui-skeleton h-8 w-full" />
            </div>
          ) : (
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-600 dark:text-zinc-400">Expected (active rules)</dt>
                <dd className="font-bold tabular-nums text-slate-900 dark:text-zinc-50">
                  {recurringVs ? formatMoney(recurringVs.expectedRecurringTotal) : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-600 dark:text-zinc-400">Logged from recurring</dt>
                <dd className="font-bold tabular-nums text-slate-900 dark:text-zinc-50">
                  {recurringVs ? formatMoney(recurringVs.actualFromRecurring) : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-slate-200 pt-3 dark:border-zinc-800">
                <dt className="font-medium text-slate-800 dark:text-zinc-200">Total spend (month)</dt>
                <dd className="text-base font-bold tabular-nums text-teal-700 dark:text-teal-300">
                  {recurringVs ? formatMoney(recurringVs.monthTotalSpend) : "—"}
                </dd>
              </div>
            </dl>
          )}
          {!loading &&
          recurringVs &&
          recurringVs.expectedRecurringTotal === 0 &&
          recurringVs.monthTotalSpend === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300/90 bg-slate-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
              <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">No recurring rules yet</p>
              <p className="ui-muted mt-1 text-xs">
                Add rent or subscriptions so expected amounts appear here automatically.
              </p>
              <Link href="/recurring" className="ui-btn-primary mt-3 inline-flex text-xs">
                Set up recurring
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="ui-card">
          <div className="ui-card-header">Category distribution</div>
          <p className="ui-muted mt-1 text-sm font-normal normal-case">
            Share of spending by category · {formatMonthReadable(month)}
          </p>
          <div className="relative mt-5 h-64">
            {loading && !summary ? (
              <div className="ui-skeleton absolute inset-0 rounded-xl" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      formatter={(v) => formatMoney(typeof v === "number" ? v : Number(v))}
                      contentStyle={{
                        borderRadius: "0.75rem",
                        border: "1px solid rgb(226 232 240)",
                      }}
                    />
                    {pieEmpty ? (
                      <Pie
                        data={[{ name: "No data", value: 1 }]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={88}
                        strokeWidth={0}
                        isAnimationActive={false}
                      >
                        <Cell fill="rgb(148 163 184 / 0.35)" />
                      </Pie>
                    ) : (
                      <Pie
                        data={pieDisplay}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={44}
                        outerRadius={88}
                        strokeWidth={2}
                        stroke="var(--surface-elevated)"
                        paddingAngle={1}
                      >
                        {pieDisplay.map((_, i) => (
                          <Cell key={`slice-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    )}
                  </PieChart>
                </ResponsiveContainer>
                {pieEmpty ? (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                    <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">No categories yet</p>
                    <p className="ui-muted text-xs">
                      Expenses appear here grouped by category (Food, Rent, …).
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="ui-card">
          <div className="ui-card-header">Insights &amp; prompts</div>
          <p className="ui-muted mt-1 text-sm font-normal normal-case">
            Automated tips plus helpful defaults when data is light.
          </p>
          <div className="mt-4 space-y-2.5">
            {loading && insights.length === 0 && !summary ? (
              <>
                <div className="ui-skeleton h-14 w-full rounded-xl" />
                <div className="ui-skeleton h-14 w-full rounded-xl" />
              </>
            ) : (
              insightCards.map((x, idx) => (
                <p
                  key={idx}
                  className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-3 text-sm leading-relaxed text-slate-800 transition hover:border-teal-200/70 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200 dark:hover:border-teal-900/60"
                >
                  {x}
                </p>
              ))
            )}
          </div>
          {!loading && summary && summary.total === 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/expenses" className="ui-btn-primary text-sm">
                Add expense
              </Link>
              <Link href="/settings/rules" className="ui-btn-secondary text-sm">
                Import transactions
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
