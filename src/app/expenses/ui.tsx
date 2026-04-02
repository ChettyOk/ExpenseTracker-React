"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import AppShell from "@/components/AppShell";
import { DEFAULT_EXPENSE_LIST_LIMIT } from "@/lib/expenseQuery";

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
  amount: string;
  category: ExpenseCategory;
  date: string;
  description: string | null;
};

type PreviewRow = {
  date: string;
  amount: number;
  description: string | null;
  category: ExpenseCategory;
  isDuplicate: boolean;
};

type SortBy = "date" | "amount" | "category";
type SortDir = "asc" | "desc";

type BankProfileOption = { id: string; name: string };

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

function formatMoneyNum(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

function expenseToYyyyMmDd(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function buildFilterParams(
  sortBy: SortBy,
  sortDir: SortDir,
  filters: { from: string; to: string; category: string; q: string },
) {
  const params = new URLSearchParams();
  params.set("sortBy", sortBy);
  params.set("sortDir", sortDir);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.category) params.set("category", filters.category);
  const qt = filters.q.trim();
  if (qt) params.set("q", qt);
  return params;
}

function buildListParams(
  sortBy: SortBy,
  sortDir: SortDir,
  filters: { from: string; to: string; category: string; q: string },
  listOffset: number,
) {
  const params = buildFilterParams(sortBy, sortDir, filters);
  params.set("limit", String(DEFAULT_EXPENSE_LIST_LIMIT));
  params.set("offset", String(listOffset));
  return params;
}

export default function ExpensesClient() {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterQ, setFilterQ] = useState("");

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("FOOD");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [categoryUpdatingId, setCategoryUpdatingId] = useState<string | null>(null);

  const [importPreview, setImportPreview] = useState<PreviewRow[] | null>(null);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);

  const [editing, setEditing] = useState<Expense | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<ExpenseCategory>("FOOD");
  const [editSaving, setEditSaving] = useState(false);

  const previewFileRef = useRef<HTMLInputElement>(null);
  const quickFileRef = useRef<HTMLInputElement>(null);

  const [bankProfiles, setBankProfiles] = useState<BankProfileOption[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");

  const [listOffset, setListOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredTotalAmount, setFilteredTotalAmount] = useState<number | null>(null);
  const [deleteAllBusy, setDeleteAllBusy] = useState(false);

  const filters = useMemo(
    () => ({
      from: filterFrom,
      to: filterTo,
      category: filterCategory,
      q: filterQ,
    }),
    [filterFrom, filterTo, filterCategory, filterQ],
  );

  async function load(pageOffset?: number) {
    setLoading(true);
    setError(null);
    const offset = pageOffset !== undefined ? pageOffset : listOffset;
    const qs = buildListParams(sortBy, sortDir, filters, offset).toString();
    const res = await fetch(`/api/expenses?${qs}`);
    if (!res.ok) {
      setError("Failed to load expenses.");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as {
      expenses: Expense[];
      totalCount: number;
      filteredTotalAmount: number;
      offset: number;
    };
    setItems(data.expenses);
    setTotalCount(data.totalCount);
    setFilteredTotalAmount(data.filteredTotalAmount);
    setListOffset(data.offset);
    setLoading(false);
  }

  useEffect(() => {
    void load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortDir]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/bank-import-profiles", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = (await res.json()) as { profiles: BankProfileOption[] };
      setBankProfiles(data.profiles);
    })();
  }, []);

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
    await load(listOffset);
  }

  async function onDelete(id: string) {
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Failed to delete expense.");
      return;
    }
    await load(listOffset);
  }

  async function onDeleteAllExpenses() {
    if (
      !window.confirm(
        "Delete every expense in your account? This removes all transactions you have added, not only the current filter. This cannot be undone.",
      )
    ) {
      return;
    }
    setDeleteAllBusy(true);
    setError(null);
    setImportMessage(null);
    const res = await fetch("/api/expenses", {
      method: "DELETE",
      credentials: "same-origin",
    });
    setDeleteAllBusy(false);
    const data = (await res.json().catch(() => null)) as { deleted?: number; error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "Failed to delete all expenses.");
      return;
    }
    setImportPreview(null);
    setPreviewWarnings([]);
    if (typeof data?.deleted === "number") {
      setImportMessage(
        data.deleted === 0
          ? "No expenses to delete."
          : `Deleted ${data.deleted} expense(s).`,
      );
    }
    await load(0);
  }

  async function onUpdateCategory(id: string, next: ExpenseCategory) {
    const prevItem = items.find((x) => x.id === id);
    if (!prevItem || prevItem.category === next) return;

    setError(null);
    setCategoryUpdatingId(id);
    setItems((list) =>
      list.map((x) => (x.id === id ? { ...x, category: next } : x)),
    );

    const res = await fetch(`/api/expenses/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ category: next }),
      credentials: "same-origin",
    });

    setCategoryUpdatingId(null);

    if (!res.ok) {
      setItems((list) =>
        list.map((x) => (x.id === id ? { ...x, category: prevItem.category } : x)),
      );
      setError("Failed to update category.");
      return;
    }

    const data = (await res.json()) as {
      expense: {
        id: string;
        amount: unknown;
        category: ExpenseCategory;
        date: string | Date;
        description: string | null;
      };
    };

    const exp = data.expense;
    const dateIso =
      typeof exp.date === "string"
        ? exp.date
        : new Date(exp.date).toISOString();

    setItems((list) =>
      list.map((x) =>
        x.id === id
          ? {
              ...x,
              category: exp.category,
              amount: String(exp.amount),
              date: dateIso,
              description: exp.description,
            }
          : x,
      ),
    );
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setEditAmount(String(e.amount));
    setEditDate(expenseToYyyyMmDd(e.date));
    setEditDescription(e.description ?? "");
    setEditCategory(e.category);
  }

  async function saveEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editing) return;
    const amt = Number(editAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Amount must be a positive number.");
      return;
    }
    setEditSaving(true);
    setError(null);
    const res = await fetch(`/api/expenses/${editing.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        amount: amt,
        date: editDate,
        description: editDescription.trim() || null,
        category: editCategory,
      }),
      credentials: "same-origin",
    });
    setEditSaving(false);
    if (!res.ok) {
      setError("Failed to save expense.");
      return;
    }
    setEditing(null);
    await load(listOffset);
  }

  function toggleSort(next: SortBy) {
    if (sortBy !== next) {
      setSortBy(next);
      setSortDir("desc");
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  async function onExportCsv() {
    setError(null);
    setImportMessage(null);
    const qs = buildFilterParams(sortBy, sortDir, filters).toString();
    const res = await fetch(`/api/expenses/export?${qs}`, { credentials: "same-origin" });
    if (!res.ok) {
      setError("Failed to export CSV.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const cd = res.headers.get("content-disposition");
    const m = cd?.match(/filename="([^"]+)"/);
    a.download = m?.[1] ?? `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onPreviewFile(f: File) {
    setError(null);
    setImportMessage(null);
    setImportBusy(true);
    const body = new FormData();
    body.set("file", f);
    if (selectedProfileId) body.set("profileId", selectedProfileId);
    const res = await fetch("/api/expenses/import/preview", {
      method: "POST",
      body,
      credentials: "same-origin",
    });
    setImportBusy(false);
    const data = (await res.json().catch(() => null)) as
      | {
          rows?: PreviewRow[];
          parseWarnings?: string[];
          error?: string;
          details?: string[];
        }
      | null;
    if (!res.ok) {
      const detailLine =
        Array.isArray(data?.details) && data.details.length > 0
          ? data.details.join(" ")
          : "";
      setError(
        [data?.error ?? "Preview failed.", detailLine].filter((s) => s.length > 0).join(" "),
      );
      setImportPreview(null);
      return;
    }
    setImportPreview(data?.rows ?? []);
    setPreviewWarnings(data?.parseWarnings ?? []);
  }

  async function confirmImport() {
    if (!importPreview || importPreview.length === 0) return;
    setImportBusy(true);
    setError(null);
    const rows = importPreview.map((r) => ({
      date: r.date,
      amount: r.amount,
      description: r.description,
      category: r.category,
    }));
    const res = await fetch("/api/expenses/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rows }),
      credentials: "same-origin",
    });
    setImportBusy(false);
    const data = (await res.json().catch(() => null)) as
      | {
          imported?: number;
          skippedDuplicates?: number;
          parseWarnings?: string[];
          error?: string;
          details?: string[];
        }
      | null;
    if (!res.ok) {
      const detailLine =
        Array.isArray(data?.details) && data.details.length > 0
          ? data.details.join(" ")
          : "";
      setError(
        [data?.error ?? "Import failed.", detailLine].filter((s) => s.length > 0).join(" "),
      );
      return;
    }
    setImportPreview(null);
    setPreviewWarnings([]);
    const parts: string[] = [];
    if (typeof data?.imported === "number") {
      parts.push(`Imported ${data.imported} expense(s).`);
    }
    if (typeof data?.skippedDuplicates === "number" && data.skippedDuplicates > 0) {
      parts.push(`Skipped ${data.skippedDuplicates} duplicate(s).`);
    }
    setImportMessage(parts.join(" "));
    await load(0);
  }

  async function onQuickImportFile(f: File) {
    setError(null);
    setImportMessage(null);
    setImportBusy(true);
    const body = new FormData();
    body.set("file", f);
    if (selectedProfileId) body.set("profileId", selectedProfileId);
    const res = await fetch("/api/expenses/import", {
      method: "POST",
      body,
      credentials: "same-origin",
    });
    setImportBusy(false);
    const data = (await res.json().catch(() => null)) as
      | {
          imported?: number;
          skippedDuplicates?: number;
          parseWarnings?: string[];
          message?: string;
          error?: string;
          details?: string[];
        }
      | null;
    if (!res.ok) {
      const detailLine =
        Array.isArray(data?.details) && data.details.length > 0
          ? data.details.join(" ")
          : "";
      setError(
        [data?.error ?? "Import failed.", detailLine].filter((s) => s.length > 0).join(" "),
      );
      return;
    }
    const parts: string[] = [];
    if (typeof data?.imported === "number") {
      parts.push(`Imported ${data.imported} expense(s).`);
    }
    if (typeof data?.skippedDuplicates === "number" && data.skippedDuplicates > 0) {
      parts.push(`Skipped ${data.skippedDuplicates} duplicate(s).`);
    }
    if (data?.message) parts.push(data.message);
    setImportMessage(parts.join(" "));
    await load(0);
  }

  function updatePreviewCategory(index: number, cat: ExpenseCategory) {
    setImportPreview((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const row = next[index];
      if (row) next[index] = { ...row, category: cat };
      return next;
    });
  }

  return (
    <AppShell
      contentMaxWidth="max-w-5xl"
      title="Expenses"
      description={
        <>
          Filter, edit, export, and import from CSV or PDF. Category changes teach future imports.{" "}
          <Link className="font-medium underline" href="/settings/rules">
            Bank profiles &amp; rules
          </Link>
        </>
      }
      headerExtra={
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
          <label className="block w-full min-w-48 text-sm sm:w-auto">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">CSV bank profile</span>
            <select
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
            >
              <option value="">Auto-detect columns</option>
              {bankProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-white/5"
              type="button"
              onClick={() => void onExportCsv()}
            >
              Download CSV
            </button>
            <button
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-white/5"
              disabled={importBusy}
              type="button"
              onClick={() => previewFileRef.current?.click()}
            >
                Preview import
            </button>
            <button
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-white/5"
              disabled={importBusy}
              type="button"
              onClick={() => quickFileRef.current?.click()}
            >
                Quick import
            </button>
            <button
              className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-zinc-950 dark:text-red-400 dark:hover:bg-red-950/30"
              disabled={importBusy || deleteAllBusy || loading}
              type="button"
              onClick={() => void onDeleteAllExpenses()}
            >
              Delete all transactions
            </button>
            <input
              ref={previewFileRef}
              accept=".csv,.pdf,text/csv,application/pdf"
                className="hidden"
                type="file"
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  ev.target.value = "";
                  if (f) void onPreviewFile(f);
                }}
              />
              <input
                ref={quickFileRef}
              accept=".csv,.pdf,text/csv,application/pdf"
              className="hidden"
              type="file"
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                ev.target.value = "";
                if (f) void onQuickImportFile(f);
              }}
            />
          </div>
        </div>
      }
    >
        {importMessage ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            {importMessage}
          </p>
        ) : null}

        {importPreview && importPreview.length > 0 ? (
          <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Import preview ({importPreview.length} rows)
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                  disabled={importBusy}
                  type="button"
                  onClick={() => void confirmImport()}
                >
                  Confirm import
                </button>
                <button
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-white/5"
                  type="button"
                  onClick={() => {
                    setImportPreview(null);
                    setPreviewWarnings([]);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
            {previewWarnings.length > 0 ? (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                {previewWarnings.slice(0, 5).join(" ")}
              </p>
            ) : null}
            <div className="mt-4 max-h-80 overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-zinc-100 text-left text-xs font-semibold uppercase text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((r, idx) => (
                    <tr
                      key={`${r.date}-${idx}-${r.amount}`}
                      className="border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-zinc-800 dark:text-zinc-200">
                        {r.date}
                      </td>
                      <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200">
                        {r.description ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-800 dark:text-zinc-200">
                        {formatMoneyNum(r.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="max-w-40 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                          value={r.category}
                          onChange={(ev) =>
                            updatePreviewCategory(idx, ev.target.value as ExpenseCategory)
                          }
                        >
                          {categories.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {r.isDuplicate ? (
                          <span className="text-amber-700 dark:text-amber-400">Duplicate</span>
                        ) : (
                          <span className="text-zinc-500">New</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Duplicates are skipped on the server. Adjust categories before confirming.
            </p>
          </section>
        ) : null}

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
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Filters</h2>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            CSV export uses the same filters as the list below.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">From</span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">To</span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Category
              </span>
              <select
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2 lg:col-span-4">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Description contains
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                value={filterQ}
                onChange={(e) => setFilterQ(e.target.value)}
                placeholder="e.g., uber"
              />
            </label>
            <div className="sm:col-span-2 lg:col-span-4">
              <button
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                type="button"
                onClick={() => void load(0)}
              >
                Apply filters
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950 sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              All expenses
            </h2>
            {filteredTotalAmount != null ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Total (filtered):{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {filteredTotalAmount.toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                  })}
                </span>
              </p>
            ) : null}
          </div>

          {totalCount > DEFAULT_EXPENSE_LIST_LIMIT ? (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Showing {totalCount === 0 ? 0 : listOffset + 1}–
              {Math.min(listOffset + items.length, totalCount)} of {totalCount.toLocaleString()} rows (paginated; CSV
              export still includes all matching rows).
            </p>
          ) : totalCount > 0 ? (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {totalCount.toLocaleString()} row{totalCount === 1 ? "" : "s"}.
            </p>
          ) : null}

          {totalCount > DEFAULT_EXPENSE_LIST_LIMIT ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={loading || listOffset === 0}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                onClick={() => void load(Math.max(0, listOffset - DEFAULT_EXPENSE_LIST_LIMIT))}
              >
                Previous page
              </button>
              <button
                type="button"
                disabled={loading || listOffset + DEFAULT_EXPENSE_LIST_LIMIT >= totalCount}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                onClick={() => void load(listOffset + DEFAULT_EXPENSE_LIST_LIMIT)}
              >
                Next page
              </button>
            </div>
          ) : null}

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
                      No expenses match these filters.
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
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
                        <select
                          aria-label={`Category for expense ${e.id}`}
                          className="max-w-44 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-400 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-600"
                          disabled={categoryUpdatingId === e.id}
                          value={e.category}
                          onChange={(ev) => {
                            const v = ev.target.value as ExpenseCategory;
                            void onUpdateCategory(e.id, v);
                          }}
                        >
                          {categories.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="whitespace-nowrap border-b border-zinc-100 px-3 py-2 text-right tabular-nums dark:border-zinc-900">
                        {formatMoney(e.amount)}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
                        {e.description ?? "—"}
                      </td>
                      <td className="whitespace-nowrap border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
                        <div className="flex flex-wrap gap-1">
                          <button
                            className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-white/5"
                            type="button"
                            onClick={() => openEdit(e)}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-white/5"
                            type="button"
                            onClick={() => onDelete(e.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {editing ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="presentation"
            onClick={() => setEditing(null)}
            onKeyDown={(kev) => {
              if (kev.key === "Escape") setEditing(null);
            }}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-expense-title"
              onClick={(ev) => ev.stopPropagation()}
              onKeyDown={(ev) => ev.stopPropagation()}
            >
              <h2
                id="edit-expense-title"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
              >
                Edit expense
              </h2>
              <form className="mt-4 space-y-3" onSubmit={saveEdit}>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Amount
                  </span>
                  <input
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    inputMode="decimal"
                    required
                    value={editAmount}
                    onChange={(ev) => setEditAmount(ev.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Date
                  </span>
                  <input
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    type="date"
                    required
                    value={editDate}
                    onChange={(ev) => setEditDate(ev.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Category
                  </span>
                  <select
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    value={editCategory}
                    onChange={(ev) =>
                      setEditCategory(ev.target.value as ExpenseCategory)
                    }
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
                    Description
                  </span>
                  <input
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    value={editDescription}
                    onChange={(ev) => setEditDescription(ev.target.value)}
                  />
                </label>
                <div className="flex gap-2 pt-2">
                  <button
                    className="flex-1 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                    disabled={editSaving}
                    type="submit"
                  >
                    Save
                  </button>
                  <button
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-800 dark:text-zinc-50"
                    type="button"
                    onClick={() => setEditing(null)}
                  >
                    Close
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
    </AppShell>
  );
}
