const yyyyMmRegex = /^\d{4}-\d{2}$/;

export function assertYYYYMM(value: string) {
  if (!yyyyMmRegex.test(value)) {
    throw new Error("Invalid month; expected YYYY-MM");
  }
}

export function monthStartUTC(yyyyMm: string) {
  assertYYYYMM(yyyyMm);
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

export function nextMonthStartUTC(yyyyMm: string) {
  assertYYYYMM(yyyyMm);
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1));
}

export function monthBoundsUTC(yyyyMm: string) {
  const from = monthStartUTC(yyyyMm);
  const to = nextMonthStartUTC(yyyyMm);
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth() + 1;
  return { from, to, y, m };
}

/**
 * Half-open calendar month as YYYY-MM-DD strings for PostgreSQL `DATE` filters.
 * Matches how imports and the expense list store day-level dates (no timezone shift).
 */
export function monthCalendarDateRange(yyyyMm: string): {
  start: string;
  endExclusive: string;
} {
  assertYYYYMM(yyyyMm);
  const y = Number(yyyyMm.slice(0, 4));
  const mo = Number(yyyyMm.slice(5, 7));
  const start = `${yyyyMm}-01`;
  const ny = mo === 12 ? y + 1 : y;
  const nm = mo === 12 ? 1 : mo + 1;
  const endExclusive = `${ny}-${String(nm).padStart(2, "0")}-01`;
  return { start, endExclusive };
}

export function prevYYYYMM(yyyyMm: string) {
  assertYYYYMM(yyyyMm);
  const [y, m] = yyyyMm.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mm}`;
}

export function daysInUTCMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function yyyyMmNowLocal() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

/** Move calendar month in local timezone (matches `<input type="month">` semantics). */
export function shiftCalendarMonth(yyyyMm: string, delta: number): string {
  assertYYYYMM(yyyyMm);
  const y = Number(yyyyMm.slice(0, 4));
  const mo = Number(yyyyMm.slice(5, 7));
  const d = new Date(y, mo - 1 + delta, 1);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}`;
}

