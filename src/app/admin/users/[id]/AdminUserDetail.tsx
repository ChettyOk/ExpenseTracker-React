"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type DetailResponse = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
  };
  expenses: {
    count: number;
    totalAmount: number;
    earliestDate: string | null;
    latestDate: string | null;
    recent: {
      id: string;
      amount: string;
      category: string;
      date: string;
      description: string | null;
      isGeneratedFromRecurring: boolean;
      createdAt: string;
    }[];
  };
  categoryBudgets: {
    id: string;
    category: string;
    month: string;
    limit: string;
  }[];
  recurringExpenses: {
    id: string;
    amount: string;
    category: string;
    dayOfMonth: number;
    description: string | null;
    isActive: boolean;
    createdAt: string;
  }[];
  bankImportProfiles: {
    id: string;
    name: string;
    mapping: unknown;
    createdAt: string;
    updatedAt: string;
  }[];
  userCategoryRules: {
    id: string;
    pattern: string;
    category: string;
    priority: number;
    createdAt: string;
  }[];
  categoryLearnedRules: {
    id: string;
    normalizedDescription: string;
    category: string;
    createdAt: string;
    updatedAt: string;
  }[];
};

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatMoneyStr(s: string) {
  const n = Number(s);
  if (Number.isNaN(n)) return s;
  return formatMoney(n);
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
        {title}
      </h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function AdminUserDetail({ userId }: { userId: string }) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}`);
    if (!res.ok) {
      setError(res.status === 404 ? "User not found." : "Failed to load user detail.");
      setLoading(false);
      return;
    }
    const json = (await res.json()) as DetailResponse;
    setData(json);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-zinc-600 dark:text-zinc-400">Loading user data…</p>;
  }

  if (error || !data) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        {error ?? "Unable to load."}
      </p>
    );
  }

  const { user, expenses, categoryBudgets, recurringExpenses, bankImportProfiles, userCategoryRules, categoryLearnedRules } =
    data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin"
          className="text-sm font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back to users
        </Link>
        <button
          type="button"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      <Section title="Account (read-only here — edit on Users list)">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Email</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Name</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">{user.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Role</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">{user.role}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Signed up</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">
              {new Date(user.createdAt).toLocaleString()}
            </dd>
          </div>
        </dl>
      </Section>

      <Section title="Expense summary">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Total expenses</dt>
            <dd className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {expenses.count.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Sum of amounts</dt>
            <dd className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatMoney(expenses.totalAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Earliest expense date</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {expenses.earliestDate ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Latest expense date</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {expenses.latestDate ?? "—"}
            </dd>
          </div>
        </dl>

        <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Recent expenses (20)
        </h3>
        {expenses.recent.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No expenses.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 pr-2 text-right">Amount</th>
                  <th className="py-2 pr-2">Description</th>
                  <th className="py-2">From recurring</th>
                </tr>
              </thead>
              <tbody>
                {expenses.recent.map((e) => (
                  <tr key={e.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-1.5 pr-2 whitespace-nowrap text-zinc-800 dark:text-zinc-200">
                      {e.date}
                    </td>
                    <td className="py-1.5 pr-2 text-zinc-800 dark:text-zinc-200">{e.category}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-zinc-800 dark:text-zinc-200">
                      {formatMoneyStr(e.amount)}
                    </td>
                    <td className="max-w-[200px] truncate py-1.5 pr-2 text-zinc-600 dark:text-zinc-400">
                      {e.description ?? "—"}
                    </td>
                    <td className="py-1.5 text-zinc-600 dark:text-zinc-400">
                      {e.isGeneratedFromRecurring ? "Yes" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={`Budgets (latest ${categoryBudgets.length} rows)`}>
        {categoryBudgets.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No budgets saved.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700">
                  <th className="py-2 pr-3">Month</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 text-right">Limit</th>
                </tr>
              </thead>
              <tbody>
                {categoryBudgets.map((b) => (
                  <tr key={b.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-1.5 pr-3">{b.month}</td>
                    <td className="py-1.5 pr-3">{b.category}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatMoneyStr(b.limit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={`Recurring rules (${recurringExpenses.length})`}>
        {recurringExpenses.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">None.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700">
                  <th className="py-2 pr-2">Active</th>
                  <th className="py-2 pr-2">Day</th>
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 pr-2 text-right">Amount</th>
                  <th className="py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {recurringExpenses.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-1.5 pr-2">{r.isActive ? "Yes" : "No"}</td>
                    <td className="py-1.5 pr-2">{r.dayOfMonth}</td>
                    <td className="py-1.5 pr-2">{r.category}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{formatMoneyStr(r.amount)}</td>
                    <td className="max-w-[180px] truncate py-1.5 text-zinc-600 dark:text-zinc-400">
                      {r.description ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={`Bank import profiles (${bankImportProfiles.length})`}>
        {bankImportProfiles.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">None.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {bankImportProfiles.map((p) => (
              <li key={p.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                <div className="font-medium text-zinc-900 dark:text-zinc-50">{p.name}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  Updated {new Date(p.updatedAt).toLocaleString()}
                </div>
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-zinc-50 p-2 text-xs text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                  {JSON.stringify(p.mapping, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Pattern rules (${userCategoryRules.length})`}>
        {userCategoryRules.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">None.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700">
                  <th className="py-2 pr-2">Priority</th>
                  <th className="py-2 pr-2">Pattern</th>
                  <th className="py-2">Category</th>
                </tr>
              </thead>
              <tbody>
                {userCategoryRules.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-1.5 pr-2 tabular-nums">{r.priority}</td>
                    <td className="max-w-[280px] truncate py-1.5 pr-2" title={r.pattern}>
                      {r.pattern}
                    </td>
                    <td className="py-1.5">{r.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={`Learned category rules (up to 150)`}>
        {categoryLearnedRules.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">None.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700">
                  <th className="py-2 pr-2">Description key</th>
                  <th className="py-2">Category</th>
                </tr>
              </thead>
              <tbody>
                {categoryLearnedRules.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td
                      className="max-w-[320px] truncate py-1.5 pr-2 text-zinc-800 dark:text-zinc-200"
                      title={r.normalizedDescription}
                    >
                      {r.normalizedDescription}
                    </td>
                    <td className="py-1.5">{r.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
