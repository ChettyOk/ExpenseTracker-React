"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AppShell from "@/components/AppShell";

type ExpenseCategory =
  | "FOOD"
  | "RENT"
  | "TRANSPORT"
  | "UTILITIES"
  | "SUBSCRIPTIONS"
  | "SCHOOL"
  | "OTHER";

type Rule = {
  id: string;
  amount: string;
  category: ExpenseCategory;
  dayOfMonth: number;
  description: string | null;
  isActive: boolean;
};

const categories: { value: ExpenseCategory; label: string }[] = [
  { value: "FOOD", label: "Food" },
  { value: "RENT", label: "Rent" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "SUBSCRIPTIONS", label: "Subscriptions" },
  { value: "SCHOOL", label: "School" },
  { value: "OTHER", label: "Other" },
];

export default function RecurringClient() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("RENT");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [description, setDescription] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/recurring-expenses");
    if (!res.ok) {
      setError("Failed to load recurring expenses.");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { rules: Rule[] };
    setRules(data.rules);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createRule(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Amount must be a positive number.");
      return;
    }
    const res = await fetch("/api/recurring-expenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        amount: amt,
        category,
        dayOfMonth,
        description: description.trim() || undefined,
      }),
    });
    if (!res.ok) {
      setError("Failed to create recurring rule.");
      return;
    }
    setAmount("");
    setDescription("");
    await load();
  }

  async function toggleActive(rule: Rule) {
    const res = await fetch(`/api/recurring-expenses/${rule.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    if (!res.ok) {
      setError("Failed to update rule.");
      return;
    }
    await load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/recurring-expenses/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Failed to delete rule.");
      return;
    }
    await load();
  }

  async function runNow() {
    setError(null);
    const res = await fetch("/api/recurring-expenses/run", { method: "POST" });
    if (!res.ok) {
      setError("Failed to generate recurring expenses.");
      return;
    }
    await load();
  }

  return (
    <AppShell
      contentMaxWidth="max-w-5xl"
      title="Recurring expenses"
      description="Create monthly recurring rules and generate this month’s expenses."
    >
        <section className="ui-card">
          <h2 className="ui-card-header normal-case">Add recurring rule</h2>
          <p className="ui-muted mt-1 text-sm font-normal">Rent, subscriptions, and bills on a fixed day each month.</p>

          <form className="mt-5 grid gap-3 sm:grid-cols-3" onSubmit={createRule}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                Amount
              </span>
              <input
                className="ui-input mt-1.5"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                Category
              </span>
              <select
                className="ui-input mt-1.5"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                Day of month (1–28)
              </span>
              <input
                className="ui-input mt-1.5"
                type="number"
                min={1}
                max={28}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
              />
            </label>

            <label className="block sm:col-span-3">
              <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                Description (optional)
              </span>
              <input
                className="ui-input mt-1.5"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <div className="sm:col-span-3 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button className="ui-btn-primary" type="submit">
                Add rule
              </button>
              <button className="ui-btn-secondary" type="button" onClick={runNow}>
                Generate this month
              </button>
            </div>
          </form>

          {error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          ) : null}
        </section>

        <section className="ui-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="ui-card-header normal-case">Your rules</h2>
              <p className="ui-muted mt-1 text-xs font-normal">Toggle active, or generate this month&apos;s line items.</p>
            </div>
            <button className="ui-btn-secondary text-sm" type="button" onClick={load}>
              Refresh
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <th className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    Active
                  </th>
                  <th className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    Category
                  </th>
                  <th className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    Day
                  </th>
                  <th className="border-b border-zinc-200 px-3 py-2 text-right dark:border-zinc-800">
                    Amount
                  </th>
                  <th className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    Description
                  </th>
                  <th className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6">
                      <div className="space-y-2">
                        <div className="ui-skeleton h-10 w-full rounded-lg" />
                        <div className="ui-skeleton h-10 w-full rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ) : rules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10">
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
                        <span className="text-3xl" aria-hidden>
                          🔁
                        </span>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-zinc-100">
                          No recurring rules yet
                        </p>
                        <p className="ui-muted mt-1 max-w-sm text-xs">
                          Add rent, gym, or streaming above — then use &quot;Generate this month&quot; to post expenses automatically.
                        </p>
                        <Link href="/dashboard" className="ui-btn-primary mt-4 inline-flex text-sm">
                          View dashboard
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rules.map((r) => (
                    <tr key={r.id} className="text-sm text-zinc-800 dark:text-zinc-200">
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
                        <input
                          type="checkbox"
                          checked={r.isActive}
                          onChange={() => toggleActive(r)}
                        />
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
                        {r.category}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
                        {r.dayOfMonth}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 text-right tabular-nums dark:border-zinc-900">
                        {r.amount}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
                        {r.description ?? "—"}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
                        <button
                          className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-white/5"
                          type="button"
                          onClick={() => remove(r.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
    </AppShell>
  );
}
