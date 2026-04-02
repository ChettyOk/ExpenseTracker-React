import type { ExpenseCategory, Prisma } from "@prisma/client";

export type ExpenseSortBy = "date" | "amount" | "category";
export type ExpenseSortDir = "asc" | "desc";

/** Default page size for GET /api/expenses (bounded to cap memory & payload). */
export const DEFAULT_EXPENSE_LIST_LIMIT = 200;
export const MAX_EXPENSE_LIST_LIMIT = 1000;

/** Rows per DB fetch when streaming CSV export (memory bounded). */
export const EXPENSE_EXPORT_BATCH_SIZE = 750;

export type ParsedExpenseListQuery = {
  sortBy: ExpenseSortBy;
  sortDir: ExpenseSortDir;
  from: Date | null;
  toInclusive: Date | null;
  category: ExpenseCategory | null;
  q: string | null;
  /** Pagination for list API only; export ignores these. */
  limit: number;
  offset: number;
};

const CATEGORIES: ExpenseCategory[] = [
  "FOOD",
  "RENT",
  "TRANSPORT",
  "UTILITIES",
  "SUBSCRIPTIONS",
  "SCHOOL",
  "OTHER",
];

function parseYyyyMmDdUtcMidnight(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function parseCategory(s: string | null): ExpenseCategory | null {
  if (!s) return null;
  return CATEGORIES.includes(s as ExpenseCategory) ? (s as ExpenseCategory) : null;
}

export function parseExpenseListQuery(url: URL): ParsedExpenseListQuery {
  const sortByParam = url.searchParams.get("sortBy");
  const sortBy: ExpenseSortBy =
    sortByParam === "amount" || sortByParam === "category" ? sortByParam : "date";
  const sortDir: ExpenseSortDir = url.searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const from = parseYyyyMmDdUtcMidnight(url.searchParams.get("from"));
  const toInclusive = parseYyyyMmDdUtcMidnight(url.searchParams.get("to"));

  const category = parseCategory(url.searchParams.get("category"));
  const qRaw = url.searchParams.get("q")?.trim();
  const q = qRaw && qRaw.length > 0 ? qRaw : null;

  let limit = DEFAULT_EXPENSE_LIST_LIMIT;
  const limitParam = url.searchParams.get("limit");
  if (limitParam) {
    const n = Number.parseInt(limitParam, 10);
    if (Number.isFinite(n)) {
      limit = Math.min(MAX_EXPENSE_LIST_LIMIT, Math.max(1, n));
    }
  }

  let offset = 0;
  const offsetParam = url.searchParams.get("offset");
  if (offsetParam) {
    const n = Number.parseInt(offsetParam, 10);
    if (Number.isFinite(n) && n > 0) offset = Math.min(n, 10_000_000);
  }

  return { sortBy, sortDir, from, toInclusive, category, q, limit, offset };
}

export function expenseWhereForUser(
  userId: string,
  q: ParsedExpenseListQuery,
): Prisma.ExpenseWhereInput {
  const dateFilter: Prisma.DateTimeFilter = {};
  if (q.from) dateFilter.gte = q.from;
  if (q.toInclusive) dateFilter.lte = q.toInclusive;

  const where: Prisma.ExpenseWhereInput = {
    userId,
    ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    ...(q.category ? { category: q.category } : {}),
    ...(q.q
      ? {
          description: { contains: q.q, mode: "insensitive" },
        }
      : {}),
  };

  return where;
}

export function expenseOrderBy(
  sortBy: ExpenseSortBy,
  sortDir: ExpenseSortDir,
): Prisma.ExpenseOrderByWithRelationInput {
  if (sortBy === "amount") return { amount: sortDir };
  if (sortBy === "category") return { category: sortDir };
  return { date: sortDir };
}

/** Sort with stable `id` tie-breaker for cursor-based pagination (e.g. streaming export). */
export function expenseOrderByWithStableId(
  sortBy: ExpenseSortBy,
  sortDir: ExpenseSortDir,
): Prisma.ExpenseOrderByWithRelationInput[] {
  return [expenseOrderBy(sortBy, sortDir), { id: sortDir }];
}

/** Build query string for list + export (from/to as YYYY-MM-DD). Omits pagination unless includePagination. */
export function expenseListQueryString(
  q: ParsedExpenseListQuery,
  includePagination = false,
): string {
  const p = new URLSearchParams();
  p.set("sortBy", q.sortBy);
  p.set("sortDir", q.sortDir);
  if (q.from) p.set("from", q.from.toISOString().slice(0, 10));
  if (q.toInclusive) p.set("to", q.toInclusive.toISOString().slice(0, 10));
  if (q.category) p.set("category", q.category);
  if (q.q) p.set("q", q.q);
  if (includePagination) {
    p.set("limit", String(q.limit));
    p.set("offset", String(q.offset));
  }
  return p.toString();
}
