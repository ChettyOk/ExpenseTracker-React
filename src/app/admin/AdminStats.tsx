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
      <p className="text-zinc-600 dark:text-zinc-400">Loading system stats…</p>
    );
  }

  if (error || !stats) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        {error ?? "Failed to load stats."}
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Total users
        </div>
        <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {stats.totalUsers}
        </div>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Total expenses logged
        </div>
        <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {stats.totalExpenses}
        </div>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Most popular category
        </div>
        <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {stats.mostPopularCategory ?? "—"}
        </div>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Avg spending per user
        </div>
        <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {formatMoney(stats.averageSpendingPerUser)}
        </div>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:col-span-2 lg:col-span-4">
        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Total amount (all expenses)
        </div>
        <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {formatMoney(stats.totalAmount)}
        </div>
      </div>
    </div>
  );
}
