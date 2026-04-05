"use client";

import { useEffect, useState } from "react";

type Stats = {
  totalUsers: number;
  totalExpenses: number;
  totalAmount: number;
  mostPopularCategory: string | null;
  averageSpendingPerUser: number;
};

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/stats");
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? "Failed to load stats.");
        setLoading(false);
        return;
      }
      setStats(data as Stats);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="ui-card">
            <div className="ui-skeleton mb-3 h-4 w-24" />
            <div className="ui-skeleton h-10 w-20" />
          </div>
        ))}
        <div className="ui-card sm:col-span-2 lg:col-span-4">
          <div className="ui-skeleton mb-3 h-4 w-40" />
          <div className="ui-skeleton h-12 w-48" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <p className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
        {error ?? "Failed to load stats."}
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="ui-card transition-shadow duration-200 hover:shadow-md">
        <p className="ui-label-cap">Total users</p>
        <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-zinc-50">
          {stats.totalUsers.toLocaleString()}
        </p>
      </div>
      <div className="ui-card transition-shadow duration-200 hover:shadow-md">
        <p className="ui-label-cap">Expenses logged</p>
        <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-zinc-50">
          {stats.totalExpenses.toLocaleString()}
        </p>
      </div>
      <div className="ui-card transition-shadow duration-200 hover:shadow-md">
        <p className="ui-label-cap">Top category</p>
        <p className="mt-3 text-xl font-bold leading-snug text-slate-900 sm:text-2xl dark:text-zinc-50">
          {stats.mostPopularCategory ?? "—"}
        </p>
      </div>
      <div className="ui-card transition-shadow duration-200 hover:shadow-md">
        <p className="ui-label-cap">Avg per user</p>
        <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-teal-700 dark:text-teal-300">
          {formatMoney(stats.averageSpendingPerUser)}
        </p>
      </div>
      <div className="ui-card border-teal-200/60 bg-linear-to-br from-teal-50/50 to-[var(--surface-elevated)] sm:col-span-2 lg:col-span-4 dark:border-teal-900/40 dark:from-teal-950/20">
        <p className="ui-label-cap">Total amount (all expenses)</p>
        <p className="ui-muted mt-1 text-xs font-normal normal-case">Across every user in the system</p>
        <p className="mt-4 text-4xl font-bold tabular-nums tracking-tight text-teal-800 sm:text-5xl dark:text-teal-200">
          {formatMoney(stats.totalAmount)}
        </p>
      </div>
    </div>
  );
}
