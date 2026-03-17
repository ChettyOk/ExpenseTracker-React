"use client";

import { useEffect, useState } from "react";

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
    <div className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-black">
      <main className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Recurring expenses
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Create monthly recurring rules and generate this month’s expenses.
            </p>
          </div>
          <a
            className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
            href="/dashboard"
          >
            Back to dashboard
          </a>
        </header>

        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950 sm:p-6">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Add recurring rule
          </h2>

          <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={createRule}>
            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Amount
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Category
              </span>
              <select
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
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
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Day of month (1–28)
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                type="number"
                min={1}
                max={28}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
              />
            </label>

            <label className="block sm:col-span-3">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Description (optional)
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <div className="sm:col-span-3 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                type="submit"
              >
                Add rule
              </button>
              <button
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-white/5"
                type="button"
                onClick={runNow}
              >
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

        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Your rules
            </h2>
            <button
              className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
              type="button"
              onClick={load}
            >
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
                    <td colSpan={6} className="px-3 py-6 text-sm text-zinc-600 dark:text-zinc-400">
                      Loading...
                    </td>
                  </tr>
                ) : rules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-sm text-zinc-600 dark:text-zinc-400">
                      No recurring rules yet.
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
      </main>
    </div>
  );
}

