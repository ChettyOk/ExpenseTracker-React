"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import AppShell from "@/components/AppShell";
import type { BankImportMapping } from "@/lib/bankImportMapping";

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

type BankProfileRow = {
  id: string;
  name: string;
  mapping: BankImportMapping;
  createdAt: string;
  updatedAt: string;
};

type UserRuleRow = {
  id: string;
  pattern: string;
  category: ExpenseCategory;
  priority: number;
};

type LearnedRow = {
  id: string;
  normalizedDescription: string;
  category: ExpenseCategory;
};

export default function RulesSettingsClient() {
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<BankProfileRow[]>([]);
  const [userRules, setUserRules] = useState<UserRuleRow[]>([]);
  const [learned, setLearned] = useState<LearnedRow[]>([]);

  const [bpName, setBpName] = useState("");
  const [bpMode, setBpMode] = useState<"amount" | "debit_credit">("amount");
  const [bpDate, setBpDate] = useState("Date");
  const [bpDesc, setBpDesc] = useState("Description");
  const [bpAmount, setBpAmount] = useState("Amount");
  const [bpPolarity, setBpPolarity] = useState<"negative_expense" | "positive_expense">(
    "negative_expense",
  );
  const [bpDebit, setBpDebit] = useState("Debit");
  const [bpCredit, setBpCredit] = useState("Credit");

  const [urPattern, setUrPattern] = useState("");
  const [urCategory, setUrCategory] = useState<ExpenseCategory>("FOOD");
  const [urPriority, setUrPriority] = useState(10);

  const loadAll = useCallback(async () => {
    setError(null);
    const [pRes, uRes, lRes] = await Promise.all([
      fetch("/api/bank-import-profiles", { credentials: "same-origin" }),
      fetch("/api/user-category-rules", { credentials: "same-origin" }),
      fetch("/api/category-learned-rules", { credentials: "same-origin" }),
    ]);
    if (!pRes.ok || !uRes.ok || !lRes.ok) {
      setError("Failed to load settings.");
      return;
    }
    const pData = (await pRes.json()) as {
      profiles: {
        id: string;
        name: string;
        mapping: unknown;
        createdAt: string;
        updatedAt: string;
      }[];
    };
    const uData = (await uRes.json()) as { rules: UserRuleRow[] };
    const lData = (await lRes.json()) as { rules: LearnedRow[] };
    setProfiles(
      pData.profiles.map((p) => ({
        ...p,
        mapping: p.mapping as BankImportMapping,
      })),
    );
    setUserRules(uData.rules);
    setLearned(lData.rules);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function createProfile(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    const mapping: BankImportMapping =
      bpMode === "amount"
        ? {
            mode: "amount",
            dateHeader: bpDate.trim(),
            descriptionHeader: bpDesc.trim(),
            amountHeader: bpAmount.trim(),
            amountPolarity: bpPolarity,
          }
        : {
            mode: "debit_credit",
            dateHeader: bpDate.trim(),
            descriptionHeader: bpDesc.trim(),
            debitHeader: bpDebit.trim(),
            creditHeader: bpCredit.trim() || undefined,
          };

    const res = await fetch("/api/bank-import-profiles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ name: bpName.trim(), mapping }),
    });
    if (!res.ok) {
      setError("Could not save bank profile.");
      return;
    }
    setBpName("");
    setMsg("Bank profile saved.");
    await loadAll();
  }

  async function deleteProfile(id: string) {
    setError(null);
    const res = await fetch(`/api/bank-import-profiles/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) setError("Delete failed.");
    else await loadAll();
  }

  async function createUserRule(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    const res = await fetch("/api/user-category-rules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        pattern: urPattern,
        category: urCategory,
        priority: urPriority,
      }),
    });
    if (!res.ok) {
      setError("Could not save rule.");
      return;
    }
    setUrPattern("");
    setMsg("Pattern rule saved.");
    await loadAll();
  }

  async function deleteUserRule(id: string) {
    const res = await fetch(`/api/user-category-rules/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) setError("Delete failed.");
    else await loadAll();
  }

  async function updateLearnedCategory(id: string, category: ExpenseCategory) {
    const res = await fetch(`/api/category-learned-rules/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ category }),
    });
    if (!res.ok) setError("Update failed.");
    else await loadAll();
  }

  async function deleteLearned(id: string) {
    const res = await fetch(`/api/category-learned-rules/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) setError("Delete failed.");
    else await loadAll();
  }

  return (
    <AppShell
      contentMaxWidth="max-w-3xl"
      title="Import & category rules"
      description={
        <>
          Bank column maps (CSV only) and categorization rules. PDF statements use automatic text detection on
          the{" "}
          <Link href="/expenses" className="font-medium underline">
            Expenses
          </Link>{" "}
          page. Choose a profile for CSV imports when needed.
        </>
      }
    >
        <div className="space-y-10">
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {msg ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            {msg}
          </p>
        ) : null}

        <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Bank CSV profiles
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Map your file&apos;s column names (exactly as in the header row). Default auto-detect
            runs when no profile is selected on CSV import (not used for PDF).
          </p>

          <ul className="mt-4 space-y-2 text-sm">
            {profiles.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{p.name}</span>
                <span className="text-xs text-zinc-500">
                  {p.mapping.mode === "amount"
                    ? `Amount column · ${p.mapping.amountPolarity ?? "negative_expense"}`
                    : "Debit / credit columns"}
                </span>
                <button
                  className="text-xs text-red-600 underline dark:text-red-400"
                  type="button"
                  onClick={() => void deleteProfile(p.id)}
                >
                  Delete
                </button>
              </li>
            ))}
            {profiles.length === 0 ? (
              <li className="text-zinc-500 dark:text-zinc-400">No profiles yet.</li>
            ) : null}
          </ul>

          <form className="mt-6 space-y-3 border-t border-zinc-200 pt-6 dark:border-zinc-800" onSubmit={createProfile}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">New profile</h3>
            <label className="block text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">Name</span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                required
                value={bpName}
                onChange={(e) => setBpName(e.target.value)}
                placeholder="e.g. Chase checking"
              />
            </label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  checked={bpMode === "amount"}
                  name="bpmode"
                  type="radio"
                  onChange={() => setBpMode("amount")}
                />
                Single amount column
              </label>
              <label className="flex items-center gap-2">
                <input
                  checked={bpMode === "debit_credit"}
                  name="bpmode"
                  type="radio"
                  onChange={() => setBpMode("debit_credit")}
                />
                Debit / credit columns
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">Date column header</span>
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  value={bpDate}
                  onChange={(e) => setBpDate(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">Description column</span>
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  value={bpDesc}
                  onChange={(e) => setBpDesc(e.target.value)}
                />
              </label>
            </div>
            {bpMode === "amount" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-zinc-700 dark:text-zinc-300">Amount column</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    value={bpAmount}
                    onChange={(e) => setBpAmount(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-zinc-700 dark:text-zinc-300">Amount meaning</span>
                  <select
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    value={bpPolarity}
                    onChange={(e) =>
                      setBpPolarity(e.target.value as "negative_expense" | "positive_expense")
                    }
                  >
                    <option value="negative_expense">Negative = expense (common)</option>
                    <option value="positive_expense">Positive = expense</option>
                  </select>
                </label>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-zinc-700 dark:text-zinc-300">Debit column</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    value={bpDebit}
                    onChange={(e) => setBpDebit(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-zinc-700 dark:text-zinc-300">Credit column (optional)</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    value={bpCredit}
                    onChange={(e) => setBpCredit(e.target.value)}
                  />
                </label>
              </div>
            )}
            <button
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-950"
              type="submit"
            >
              Save profile
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Pattern rules
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            If the normalized description contains your text, assign that category. Higher priority
            runs first (after exact learned matches from edited expenses).
          </p>

          <ul className="mt-4 space-y-2 text-sm">
            {userRules.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <code className="text-xs text-zinc-800 dark:text-zinc-200">{r.pattern}</code>
                <span className="text-zinc-600 dark:text-zinc-400">
                  → {r.category} (p{r.priority})
                </span>
                <button
                  className="text-xs text-red-600 underline dark:text-red-400"
                  type="button"
                  onClick={() => void deleteUserRule(r.id)}
                >
                  Delete
                </button>
              </li>
            ))}
            {userRules.length === 0 ? (
              <li className="text-zinc-500 dark:text-zinc-400">No custom patterns.</li>
            ) : null}
          </ul>

          <form className="mt-6 space-y-3 border-t border-zinc-200 pt-6 dark:border-zinc-800" onSubmit={createUserRule}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">New pattern</h3>
            <label className="block text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">Contains (substring)</span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                value={urPattern}
                onChange={(e) => setUrPattern(e.target.value)}
                placeholder="e.g. shell, whole foods"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">Category</span>
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  value={urCategory}
                  onChange={(e) => setUrCategory(e.target.value as ExpenseCategory)}
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">Priority</span>
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  type="number"
                  value={urPriority}
                  onChange={(e) => setUrPriority(Number(e.target.value))}
                />
              </label>
            </div>
            <button
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-950"
              type="submit"
            >
              Add pattern rule
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Learned from edits
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Created when you change an expense&apos;s category. Exact description match on import.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {learned.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 rounded-xl border border-zinc-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
              >
                <span className="break-all text-xs text-zinc-700 dark:text-zinc-300">
                  {r.normalizedDescription}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    value={r.category}
                    onChange={(e) =>
                      void updateLearnedCategory(r.id, e.target.value as ExpenseCategory)
                    }
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="text-xs text-red-600 underline dark:text-red-400"
                    type="button"
                    onClick={() => void deleteLearned(r.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
            {learned.length === 0 ? (
              <li className="text-zinc-500 dark:text-zinc-400">No learned rules yet.</li>
            ) : null}
          </ul>
        </section>
        </div>
    </AppShell>
  );
}
