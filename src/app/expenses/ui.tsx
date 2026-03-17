"use client";

import { useEffect, useMemo, useState } from "react";

type ExpenseCategory =
  | "FOOD"
  | "RENT"
  | "TRANSPORT"
  | "UTILITIES"
  | "SUBSCRIPTIONS"
  | "SCHOOL"
  | "OTHER";

type Expense = {
  id: string;
  amount: string; // Prisma Decimal serialized
  category: ExpenseCategory;
  date: string;
  description: string | null;
};

type SortBy = "date" | "amount" | "category";
type SortDir = "asc" | "desc";

const categories: { value: ExpenseCategory; label: string }[] = [
  { value: "FOOD", label: "Food" },
  { value: "RENT", label: "Rent" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "SUBSCRIPTIONS", label: "Subscriptions" },
  { value: "SCHOOL", label: "School" },
  { value: "OTHER", label: "Other" },
];

function formatMoney(amount: string) {
  const n = Number(amount);
  if (Number.isNaN(n)) return amount;
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

export default function ExpensesClient() {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("FOOD");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/expenses?sortBy=${sortBy}&sortDir=${sortDir}`);
    if (!res.ok) {
      setError("Failed to load expenses.");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { expenses: Expense[] };
    setItems(data.expenses);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortDir]);

  const total = useMemo(() => {
    const sum = items.reduce((acc, e) => acc + Number(e.amount), 0);
    if (Number.isNaN(sum)) return null;
    return sum;
  }, [items]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Amount must be a positive number.");
      return;
    }

    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        amount: amt,
        category,
        date,
        description: description.trim() || undefined,
      }),
    });

    if (!res.ok) {
      setError("Failed to add expense.");
      return;
    }

    setAmount("");
    setDescription("");
    await load();
  }

  async function onDelete(id: string) {
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Failed to delete expense.");
      return;
    }
    await load();
  }

  function toggleSort(next: SortBy) {
    if (sortBy !== next) {
      setSortBy(next);
      setSortDir("desc");
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-black">
      <main className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Expenses
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Add, sort, and delete expenses.
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
            Add expense
          </h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={onCreate}>
            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Amount
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                inputMode="decimal"
                placeholder="12.34"
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
                Date
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>

            <label className="block sm:col-span-2 lg:col-span-4">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Description (optional)
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., lunch with coworkers"
              />
            </label>

            <div className="sm:col-span-2 lg:col-span-4">
              <button
                className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                type="submit"
              >
                Add expense
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950 sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              All expenses
            </h2>
            {total != null ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Total:{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {total.toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                  })}
                </span>
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <th className="whitespace-nowrap border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    <button
                      className="hover:text-zinc-900 dark:hover:text-zinc-50"
                      type="button"
                      onClick={() => toggleSort("date")}
                    >
                      Date {sortBy === "date" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </button>
                  </th>
                  <th className="whitespace-nowrap border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    <button
                      className="hover:text-zinc-900 dark:hover:text-zinc-50"
                      type="button"
                      onClick={() => toggleSort("category")}
                    >
                      Category{" "}
                      {sortBy === "category" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </button>
                  </th>
                  <th className="whitespace-nowrap border-b border-zinc-200 px-3 py-2 text-right dark:border-zinc-800">
                    <button
                      className="hover:text-zinc-900 dark:hover:text-zinc-50"
                      type="button"
                      onClick={() => toggleSort("amount")}
                    >
                      Amount{" "}
                      {sortBy === "amount" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </button>
                  </th>
                  <th className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    Description
                  </th>
                  <th className="whitespace-nowrap border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      className="px-3 py-6 text-sm text-zinc-600 dark:text-zinc-400"
                      colSpan={5}
                    >
                      Loading...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-6 text-sm text-zinc-600 dark:text-zinc-400"
                      colSpan={5}
                    >
                      No expenses yet.
                    </td>
                  </tr>
                ) : (
                  items.map((e) => (
                    <tr
                      key={e.id}
                      className="text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-white/5"
                    >
                      <td className="whitespace-nowrap border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
                        {formatDate(e.date)}
                      </td>
                      <td className="whitespace-nowrap border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
                        {e.category}
                      </td>
                      <td className="whitespace-nowrap border-b border-zinc-100 px-3 py-2 text-right tabular-nums dark:border-zinc-900">
                        {formatMoney(e.amount)}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
                        {e.description ?? "—"}
                      </td>
                      <td className="whitespace-nowrap border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
                        <button
                          className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-white/5"
                          type="button"
                          onClick={() => onDelete(e.id)}
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

