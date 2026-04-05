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
    <section className="ui-card">
      <h2 className="ui-card-header normal-case">{title}</h2>
      <div className="mt-4">{children}</div>
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
    return (
      <div className="ui-card space-y-4">
        <div className="ui-skeleton h-6 w-40" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="ui-skeleton h-24 rounded-xl" />
          <div className="ui-skeleton h-24 rounded-xl" />
        </div>
        <div className="ui-skeleton h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
        {error ?? "Unable to load."}
      </p>
    );
  }

  const { user, expenses, categoryBudgets, recurringExpenses, bankImportProfiles, userCategoryRules, categoryLearnedRules } =
    data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin" className="ui-link text-sm font-medium no-underline hover:underline">
          ← Back to users
        </Link>
        <button type="button" className="ui-btn-secondary px-4 py-2 text-sm" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <Section title="Account (read-only here — edit on Users list)">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="ui-label-cap">Email</dt>
            <dd className="mt-1 font-semibold text-slate-900 dark:text-zinc-50">{user.email}</dd>
          </div>
          <div>
            <dt className="ui-label-cap">Name</dt>
            <dd className="mt-1 font-medium text-slate-900 dark:text-zinc-50">{user.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="ui-label-cap">Role</dt>
            <dd className="mt-1 font-medium text-slate-900 dark:text-zinc-50">{user.role}</dd>
          </div>
          <div>
            <dt className="ui-label-cap">Signed up</dt>
            <dd className="mt-1 font-medium text-slate-900 dark:text-zinc-50">
              {new Date(user.createdAt).toLocaleString()}
            </dd>
          </div>
        </dl>
      </Section>

      <Section title="Expense summary">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="ui-label-cap">Total expenses</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-zinc-50">
              {expenses.count.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="ui-label-cap">Sum of amounts</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-zinc-50">
              {formatMoney(expenses.totalAmount)}
            </dd>
          </div>
          <div>
            <dt className="ui-label-cap">Earliest expense date</dt>
            <dd className="mt-1 font-semibold text-slate-900 dark:text-zinc-50">
              {expenses.earliestDate ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="ui-label-cap">Latest expense date</dt>
            <dd className="mt-1 font-semibold text-slate-900 dark:text-zinc-50">
              {expenses.latestDate ?? "—"}
            </dd>
          </div>
        </dl>

        <h3 className="ui-label-cap mt-6">Recent expenses (20)</h3>
        {expenses.recent.length === 0 ? (
          <p className="ui-muted mt-2 text-sm">No expenses.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200/90 dark:border-white/[0.07]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Date
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Category
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Amount
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Description
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    From recurring
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.recent.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-slate-100 last:border-0 dark:border-zinc-800 dark:hover:bg-zinc-900/40"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-slate-800 dark:text-zinc-200">{e.date}</td>
                    <td className="px-3 py-2 text-slate-800 dark:text-zinc-200">{e.category}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-zinc-50">
                      {formatMoneyStr(e.amount)}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-slate-600 dark:text-zinc-400">
                      {e.description ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-zinc-400">
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
          <p className="ui-muted text-sm">No budgets saved.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-white/[0.07]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Month
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Category
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Limit
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryBudgets.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-slate-100 last:border-0 dark:border-zinc-800 dark:hover:bg-zinc-900/40"
                  >
                    <td className="px-3 py-2 text-slate-800 dark:text-zinc-200">{b.month}</td>
                    <td className="px-3 py-2 text-slate-800 dark:text-zinc-200">{b.category}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-zinc-50">
                      {formatMoneyStr(b.limit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={`Recurring rules (${recurringExpenses.length})`}>
        {recurringExpenses.length === 0 ? (
          <p className="ui-muted text-sm">None.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-white/[0.07]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Active
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Day
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Category
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Amount
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {recurringExpenses.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 last:border-0 dark:border-zinc-800 dark:hover:bg-zinc-900/40"
                  >
                    <td className="px-3 py-2 text-slate-800 dark:text-zinc-200">{r.isActive ? "Yes" : "No"}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-800 dark:text-zinc-200">{r.dayOfMonth}</td>
                    <td className="px-3 py-2 text-slate-800 dark:text-zinc-200">{r.category}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-zinc-50">
                      {formatMoneyStr(r.amount)}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-2 text-slate-600 dark:text-zinc-400">
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
          <p className="ui-muted text-sm">None.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {bankImportProfiles.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 dark:border-white/[0.07] dark:bg-zinc-900/40"
              >
                <div className="font-semibold text-slate-900 dark:text-zinc-50">{p.name}</div>
                <div className="ui-muted mt-1 text-xs">
                  Updated {new Date(p.updatedAt).toLocaleString()}
                </div>
                <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-slate-200/80 bg-white p-3 text-xs text-slate-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                  {JSON.stringify(p.mapping, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Pattern rules (${userCategoryRules.length})`}>
        {userCategoryRules.length === 0 ? (
          <p className="ui-muted text-sm">None.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-white/[0.07]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Priority
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Pattern
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody>
                {userCategoryRules.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 last:border-0 dark:border-zinc-800 dark:hover:bg-zinc-900/40"
                  >
                    <td className="px-3 py-2 tabular-nums text-slate-800 dark:text-zinc-200">{r.priority}</td>
                    <td
                      className="max-w-[280px] truncate px-3 py-2 text-slate-800 dark:text-zinc-200"
                      title={r.pattern}
                    >
                      {r.pattern}
                    </td>
                    <td className="px-3 py-2 text-slate-800 dark:text-zinc-200">{r.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={`Learned category rules (up to 150)`}>
        {categoryLearnedRules.length === 0 ? (
          <p className="ui-muted text-sm">None.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-white/[0.07]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Description key
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryLearnedRules.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 last:border-0 dark:border-zinc-800 dark:hover:bg-zinc-900/40"
                  >
                    <td
                      className="max-w-[320px] truncate px-3 py-2 text-slate-800 dark:text-zinc-200"
                      title={r.normalizedDescription}
                    >
                      {r.normalizedDescription}
                    </td>
                    <td className="px-3 py-2 text-slate-800 dark:text-zinc-200">{r.category}</td>
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
