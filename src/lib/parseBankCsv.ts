import type { BankImportMapping } from "@/lib/bankImportMapping";

export type ParsedBankRow = {
  date: Date;
  description: string;
  /** Positive expense amount (money out). */
  amount: number;
};

export function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

const MAX_DESCRIPTION_LEN = 500;

/** Dash / NA placeholders banks use for empty debit or credit cells. */
export function isEmptyMoneyCell(raw: string): boolean {
  const s = raw.replace(/\u00A0/g, " ").trim();
  if (!s) return true;
  const lower = s.toLowerCase();
  return (
    /^[\-–—]+$/.test(s) ||
    lower === "n/a" ||
    lower === "na" ||
    lower === "null" ||
    lower === "none"
  );
}

function parseMoney(raw: string): number | null {
  if (isEmptyMoneyCell(raw)) return null;
  let s = raw
    .replace(/\u00A0/g, " ")
    .replace(/\u2212/g, "-")
    .trim()
    .replace(/^\((.*)\)$/, "-$1")
    .replace(/[$€£]/g, "")
    .replace(/\s*(dr|cr|debit|credit)\s*$/i, "")
    .trim();
  if (!s) return null;
  if (/\d[\d.,\s]*-$/.test(s)) {
    s = `-${s.replace(/\s*-$/, "").trim()}`;
  }
  // European thousands.decimal: 1.234,56
  if (/^-?\d{1,3}(\.\d{3})*,\d{2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d+,\d{2}$/.test(s) && !s.includes(".")) {
    s = s.replace(",", ".");
  }
  let normalized = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)
    ? s.replace(/,/g, "")
    : s.replace(/,/g, "");
  normalized = normalized.trim();
  if (/^-?\d+$/.test(normalized)) {
    const n = Number.parseInt(normalized, 10);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

const DATE_ALIASES = new Set([
  "date",
  "transaction date",
  "trans date",
  "posting date",
  "posted date",
  "booking date",
  "booked date",
  "activity date",
  "value date",
  "settlement date",
  "post date",
]);

const DESC_ALIASES = new Set([
  "description",
  "memo",
  "payee",
  "payee name",
  "name",
  "details",
  "detail",
  "merchant",
  "narrative",
  "transaction description",
  "transaction detail",
  "summary",
  "notes",
  "counterparty",
  "counter party",
  "particulars",
  "vendor",
  "title",
]);

const AMOUNT_ALIASES = new Set(["amount", "transaction amount", "amt"]);
const DEBIT_ALIASES = new Set([
  "debit",
  "debits",
  "withdrawal",
  "withdrawals",
  "withdrawls",
  "money out",
  "outflow",
  "outflows",
  "payments",
  "paid out",
]);
const CREDIT_ALIASES = new Set([
  "credit",
  "credits",
  "deposit",
  "deposits",
  "money in",
  "inflow",
  "inflows",
  "receipts",
]);

function normToOriginalKeys(firstRow: Record<string, string>): Map<string, string> {
  const m = new Map<string, string>();
  for (const k of Object.keys(firstRow)) {
    const n = normalizeHeader(k);
    if (!m.has(n)) m.set(n, k);
  }
  return m;
}

function getCell(
  row: Record<string, string>,
  normToKey: Map<string, string>,
  aliases: Set<string>,
): string {
  for (const alias of aliases) {
    const key = normToKey.get(alias);
    if (key !== undefined) return String(row[key] ?? "").trim();
  }
  return "";
}

/** CRM / mailing-list style exports (not bank activity). */
function csvLooksLikeContactOrCustomerList(normToKey: Map<string, string>): boolean {
  const norms = [...normToKey.keys()];
  const hasFirst = norms.some((k) => /\bfirst name\b/.test(k));
  const hasLast = norms.some((k) => /\blast name\b/.test(k));
  const hasCustomerId = norms.some((k) => /\bcustomer\s*id\b|\bclient\s*id\b/.test(k));
  const hasPhones = norms.filter((k) => /\bphone\b/.test(k)).length >= 1;
  if (hasFirst && hasLast && (hasCustomerId || hasPhones)) return true;
  if (hasFirst && hasLast && norms.some((k) => k === "email" || k.endsWith(" email"))) return true;
  if (
    hasCustomerId &&
    norms.some((k) => /\bcompany\b/.test(k)) &&
    norms.some((k) => /\b(country|city)\b/.test(k))
  )
    return true;
  return false;
}

/** When headers don’t match known aliases, map columns by common bank naming patterns. */
function inferMissingBankColumns(
  normToKey: Map<string, string>,
  dateAliases: Set<string>,
  descAliases: Set<string>,
  amountAliases: Set<string>,
  debitAliases: Set<string>,
  creditAliases: Set<string>,
): void {
  const hasCol = (aliases: Set<string>) => [...aliases].some((a) => normToKey.has(a));
  const norms = [...normToKey.keys()];

  if (!hasCol(dateAliases)) {
    const hit =
      norms.find((k) =>
        /\b(posted|posting|transaction|trans|activity|booking|value|settlement)\s+date\b/.test(k),
      ) ??
      norms.find(
        (k) => /\bdate\b/.test(k) && !/\b(update|updated|created|modified|birth|expir)\b/.test(k),
      );
    if (hit) dateAliases.add(hit);
  }

  if (!hasCol(descAliases)) {
    const hit = norms.find(
      (k) =>
        /\b(desc|description|memo|payee|merchant|narrative|detail|summary|notes|counterparty|particulars|vendor|title)\b/.test(
          k,
        ) || (/\btransaction\b/.test(k) && /\b(desc|detail|memo|name)\b/.test(k)),
    );
    if (hit) descAliases.add(hit);
  }

  const hadDebit = [...debitAliases].some((a) => normToKey.has(a));
  const hadCredit = [...creditAliases].some((a) => normToKey.has(a));
  const hasDebitCredit = hadDebit || hadCredit;

  if (!hasCol(amountAliases) && !hasDebitCredit) {
    const hit = norms.find((k) => /\bamount\b/.test(k));
    if (hit) amountAliases.add(hit);
  }

  if (!hasDebitCredit && !hadDebit) {
    const hit = norms.find((k) => {
      if (/\bdate\b/.test(k)) return false;
      if (k === "outflow" || k === "outflows" || k === "payments" || k === "paid out")
        return true;
      return /\b(debit|debits|withdrawal|withdrawals|withdrawls)\b/.test(k);
    });
    if (hit) debitAliases.add(hit);
  }

  if (!hasDebitCredit && !hadCredit) {
    const hit = norms.find((k) => {
      if (/\bdate\b/.test(k)) return false;
      if (k === "inflow" || k === "inflows" || k === "receipts") return true;
      return /\b(credit|credits|deposit|deposits)\b/.test(k);
    });
    if (hit) creditAliases.add(hit);
  }
}

/** Resolve CSV column key from a profile header label (matches first row case-insensitively). */
function getCellForProfileHeader(
  row: Record<string, string>,
  normToKey: Map<string, string>,
  headerLabel: string,
): string {
  const key = normToKey.get(normalizeHeader(headerLabel));
  if (key === undefined) return "";
  return String(row[key] ?? "").trim();
}

function rowIsEffectivelyEmpty(row: Record<string, string>): boolean {
  return Object.values(row).every((v) => !String(v).trim());
}

const MONTH_ABBR: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function parseDateCell(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  const iso = /^\d{4}-\d{2}-\d{2}/.exec(s);
  if (iso) {
    const d = new Date(s.slice(0, 10) + "T12:00:00.000Z");
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const ymd = /^(\d{4})[./](\d{1,2})[./](\d{1,2})$/.exec(s);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dMonY = /^(\d{1,2})[-/\s,]+([A-Za-z]{3,})[a-z]*[-/\s,]+(\d{2,4})$/.exec(s);
  if (dMonY) {
    const day = Number(dMonY[1]);
    const monKey = dMonY[2]!.slice(0, 3).toLowerCase();
    const month = MONTH_ABBR[monKey];
    if (month === undefined) return null;
    let year = Number(dMonY[3]);
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dmyDot = /^(\d{1,2})[.](\d{1,2})[.](\d{2,4})$/.exec(s);
  if (dmyDot) {
    const day = Number(dmyDot[1]);
    const month = Number(dmyDot[2]);
    let year = Number(dmyDot[3]);
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    let year = Number(slash[3]);
    if (year < 100) year += 2000;
    let month: number;
    let day: number;
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      month = a;
      day = b;
    } else {
      month = a;
      day = b;
    }
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Map bank CSV rows (objects from csv-parser) to expense candidates.
 * - Skips completely empty rows.
 * - Single Amount column: negative → expense (stored positive); positive → deposit, skipped; zero → skipped.
 * - Debit/Credit columns: debit → expense; credit → skipped.
 */
export function bankRecordsToExpenseCandidates(records: Record<string, string>[]): {
  rows: ParsedBankRow[];
  errors: string[];
} {
  const errors: string[] = [];
  const dataRows = records.filter((r) => !rowIsEffectivelyEmpty(r));

  if (dataRows.length === 0) {
    errors.push("No data rows found (file is empty or all rows are blank).");
    return { rows: [], errors };
  }

  const normToKey = normToOriginalKeys(dataRows[0]!);

  const dateAliases = new Set(DATE_ALIASES);
  const descAliases = new Set(DESC_ALIASES);
  const amountAliases = new Set(AMOUNT_ALIASES);
  const debitAliases = new Set(DEBIT_ALIASES);
  const creditAliases = new Set(CREDIT_ALIASES);
  inferMissingBankColumns(normToKey, dateAliases, descAliases, amountAliases, debitAliases, creditAliases);

  const hasDateCol = [...dateAliases].some((a) => normToKey.has(a));
  const hasDescCol = [...descAliases].some((a) => normToKey.has(a));
  const hasAmountCol = [...amountAliases].some((a) => normToKey.has(a));
  const hasDebit = [...debitAliases].some((a) => normToKey.has(a));
  const hasCredit = [...creditAliases].some((a) => normToKey.has(a));
  const hasDebitCredit = hasDebit || hasCredit;

  if (!hasDateCol) {
    errors.push('Could not find a date column (expected a header like "Date" or "Transaction Date").');
  }
  if (!hasDescCol) {
    errors.push(
      'Could not find a description column (expected a header like "Description" or "Memo").',
    );
  }
  if (!hasAmountCol && !hasDebitCredit) {
    errors.push(
      'Could not find amount columns (expected "Amount", or "Debit"/"Credit", or "Withdrawal"/"Deposit").',
    );
  }

  if (errors.length > 0) {
    if (csvLooksLikeContactOrCustomerList(normToKey)) {
      return {
        rows: [],
        errors: [
          "This file is a customer or contact export, not a bank statement. Import a transaction download from your bank instead (it should include date, merchant or description, and amount—or separate debit and credit columns).",
        ],
      };
    }
    const sample = [...normToKey.values()]
      .slice(0, 12)
      .map((k) => `"${k}"`)
      .join(", ");
    errors.push(`Found columns: ${sample}${normToKey.size > 12 ? ", …" : ""}. Create a bank import profile in Settings only for real bank CSV column names.`);
    return { rows: [], errors };
  }

  let singleAmountPolarity: "negative_expense" | "positive_expense" = "negative_expense";
  if (hasAmountCol && !hasDebitCredit) {
    let neg = 0;
    let pos = 0;
    for (const line of dataRows) {
      const raw = getCell(line, normToKey, amountAliases);
      if (isEmptyMoneyCell(raw)) continue;
      const amt = parseMoney(raw);
      if (amt == null) continue;
      if (amt < 0) neg += 1;
      else if (amt > 0) pos += 1;
    }
    if (neg === 0 && pos > 0) singleAmountPolarity = "positive_expense";
  }

  const rows: ParsedBankRow[] = [];

  for (let i = 0; i < dataRows.length; i += 1) {
    const line = dataRows[i]!;
    const rowNum = i + 2;

    const dateRaw = getCell(line, normToKey, dateAliases);
    let description = getCell(line, normToKey, descAliases);
    const date = parseDateCell(dateRaw);

    if (description.length > MAX_DESCRIPTION_LEN) {
      errors.push(`Row ${rowNum}: description truncated to ${MAX_DESCRIPTION_LEN} characters.`);
      description = description.slice(0, MAX_DESCRIPTION_LEN);
    }

    if (!date) {
      errors.push(`Row ${rowNum}: invalid or empty date "${dateRaw}".`);
      continue;
    }

    let expenseAmount: number | null = null;

    if (hasAmountCol) {
      const rawAmt = getCell(line, normToKey, amountAliases);
      if (!rawAmt.trim()) {
        continue;
      }
      const amt = parseMoney(rawAmt);
      if (amt == null) {
        errors.push(`Row ${rowNum}: invalid amount "${rawAmt}".`);
        continue;
      }
      if (singleAmountPolarity === "negative_expense") {
        if (amt < 0) expenseAmount = Math.abs(amt);
        else if (amt > 0) continue;
        else continue;
      } else {
        if (amt > 0) expenseAmount = amt;
        else if (amt < 0) continue;
        else continue;
      }
    } else {
      const debitRaw = hasDebit ? getCell(line, normToKey, debitAliases) : "";
      const creditRaw = hasCredit ? getCell(line, normToKey, creditAliases) : "";
      const debit = parseMoney(debitRaw);
      const credit = parseMoney(creditRaw);

      if (debit != null && debit !== 0) {
        expenseAmount = Math.abs(debit);
      } else if (credit != null && credit > 0) {
        continue;
      } else if (credit != null && credit < 0) {
        expenseAmount = Math.abs(credit);
      } else {
        const badDebit =
          hasDebit && !isEmptyMoneyCell(debitRaw) && debit === null;
        const badCredit =
          hasCredit && !isEmptyMoneyCell(creditRaw) && credit === null;
        if (badDebit || badCredit) {
          errors.push(
            `Row ${rowNum}: could not parse debit/credit (debit="${debitRaw}", credit="${creditRaw}").`,
          );
        }
        continue;
      }
    }

    if (expenseAmount == null || expenseAmount <= 0) continue;

    rows.push({ date, description, amount: expenseAmount });
  }

  if (singleAmountPolarity === "positive_expense" && rows.length > 0) {
    errors.push(
      "All amounts in the file were positive; they were imported as spending. Drop deposit or transfer rows in the preview if your bank mixed them in.",
    );
  }

  return { rows, errors };
}

/**
 * Same as {@link bankRecordsToExpenseCandidates} but uses explicit column headers from a bank profile.
 */
export function bankRecordsToExpenseCandidatesWithMapping(
  records: Record<string, string>[],
  mapping: BankImportMapping,
): { rows: ParsedBankRow[]; errors: string[] } {
  const errors: string[] = [];
  const dataRows = records.filter((r) => !rowIsEffectivelyEmpty(r));

  if (dataRows.length === 0) {
    errors.push("No data rows found (file is empty or all rows are blank).");
    return { rows: [], errors };
  }

  const normToKey = normToOriginalKeys(dataRows[0]!);

  const dateKey = normToKey.get(normalizeHeader(mapping.dateHeader));
  const descKey = normToKey.get(normalizeHeader(mapping.descriptionHeader));
  if (!dateKey) {
    errors.push(`Date column "${mapping.dateHeader}" not found in CSV header.`);
  }
  if (!descKey) {
    errors.push(`Description column "${mapping.descriptionHeader}" not found in CSV header.`);
  }

  if (mapping.mode === "amount") {
    const amtKey = normToKey.get(normalizeHeader(mapping.amountHeader));
    if (!amtKey) {
      errors.push(`Amount column "${mapping.amountHeader}" not found in CSV header.`);
    }
  } else {
    const debKey = normToKey.get(normalizeHeader(mapping.debitHeader));
    if (!debKey) {
      errors.push(`Debit column "${mapping.debitHeader}" not found in CSV header.`);
    }
    if (mapping.creditHeader) {
      const credKey = normToKey.get(normalizeHeader(mapping.creditHeader));
      if (!credKey) {
        errors.push(`Credit column "${mapping.creditHeader}" not found in CSV header.`);
      }
    }
  }

  if (errors.length > 0) {
    return { rows: [], errors };
  }

  const rows: ParsedBankRow[] = [];

  for (let i = 0; i < dataRows.length; i += 1) {
    const line = dataRows[i]!;
    const rowNum = i + 2;

    const dateRaw = getCellForProfileHeader(line, normToKey, mapping.dateHeader);
    let description = getCellForProfileHeader(line, normToKey, mapping.descriptionHeader);
    const date = parseDateCell(dateRaw);

    if (description.length > MAX_DESCRIPTION_LEN) {
      errors.push(`Row ${rowNum}: description truncated to ${MAX_DESCRIPTION_LEN} characters.`);
      description = description.slice(0, MAX_DESCRIPTION_LEN);
    }

    if (!date) {
      errors.push(`Row ${rowNum}: invalid or empty date "${dateRaw}".`);
      continue;
    }

    let expenseAmount: number | null = null;

    if (mapping.mode === "amount") {
      const rawAmt = getCellForProfileHeader(line, normToKey, mapping.amountHeader);
      if (!rawAmt.trim()) continue;
      const amt = parseMoney(rawAmt);
      if (amt == null) {
        errors.push(`Row ${rowNum}: invalid amount "${rawAmt}".`);
        continue;
      }
      const pol = mapping.amountPolarity ?? "negative_expense";
      if (pol === "negative_expense") {
        if (amt < 0) expenseAmount = Math.abs(amt);
        else if (amt > 0) continue;
        else continue;
      } else {
        if (amt > 0) expenseAmount = amt;
        else if (amt < 0) continue;
        else continue;
      }
    } else {
      const debitRaw = getCellForProfileHeader(line, normToKey, mapping.debitHeader);
      const creditRaw = mapping.creditHeader
        ? getCellForProfileHeader(line, normToKey, mapping.creditHeader)
        : "";
      const debit = parseMoney(debitRaw);
      const credit = parseMoney(creditRaw);

      if (debit != null && debit !== 0) {
        expenseAmount = Math.abs(debit);
      } else if (credit != null && credit > 0) {
        continue;
      } else if (credit != null && credit < 0) {
        expenseAmount = Math.abs(credit);
      } else {
        const badDebit = !isEmptyMoneyCell(debitRaw) && debit === null;
        const badCredit =
          Boolean(mapping.creditHeader?.trim()) &&
          !isEmptyMoneyCell(creditRaw) &&
          credit === null;
        if (badDebit || badCredit) {
          errors.push(
            `Row ${rowNum}: could not parse debit/credit (debit="${debitRaw}", credit="${creditRaw}").`,
          );
        }
        continue;
      }
    }

    if (expenseAmount == null || expenseAmount <= 0) continue;

    rows.push({ date, description, amount: expenseAmount });
  }

  return { rows, errors };
}

export function bankRecordsToExpenseCandidatesForImport(
  records: Record<string, string>[],
  mapping: BankImportMapping | null,
): { rows: ParsedBankRow[]; errors: string[] } {
  if (!mapping) return bankRecordsToExpenseCandidates(records);
  return bankRecordsToExpenseCandidatesWithMapping(records, mapping);
}

/**
 * Rows extracted from PDF text (Date / Description / Amount).
 * Many statement PDFs list spending as positive amounts and credits as negative; we keep positive-only as expenses.
 */
export function bankRecordsToExpenseCandidatesFromPdfExtracted(
  records: Record<string, string>[],
): { rows: ParsedBankRow[]; errors: string[] } {
  const errors: string[] = [];
  const dataRows = records.filter((r) => !rowIsEffectivelyEmpty(r));

  if (dataRows.length === 0) {
    errors.push("No data rows found (PDF text had no matching transaction lines).");
    return { rows: [], errors };
  }

  const normToKey = normToOriginalKeys(dataRows[0]!);
  const hasDateCol = [...DATE_ALIASES].some((a) => normToKey.has(a));
  const hasDescCol = [...DESC_ALIASES].some((a) => normToKey.has(a));
  const hasAmountCol = [...AMOUNT_ALIASES].some((a) => normToKey.has(a));

  if (!hasDateCol || !hasDescCol || !hasAmountCol) {
    errors.push("PDF rows must include Date, Description, and Amount fields after extraction.");
    return { rows: [], errors };
  }

  const parsedAmounts: number[] = [];
  for (const line of dataRows) {
    const rawAmt = getCell(line, normToKey, AMOUNT_ALIASES);
    if (!rawAmt.trim()) continue;
    const amt = parseMoney(rawAmt);
    if (amt != null && amt !== 0) parsedAmounts.push(amt);
  }

  const neg = parsedAmounts.filter((a) => a < 0).length;
  const pos = parsedAmounts.filter((a) => a > 0).length;
  /** Accounting-style PDFs: debits negative, credits positive (only if negatives dominate). */
  const debitsAreNegative = neg > pos;

  const rows: ParsedBankRow[] = [];

  for (let i = 0; i < dataRows.length; i += 1) {
    const line = dataRows[i]!;
    const rowNum = i + 1;

    const dateRaw = getCell(line, normToKey, DATE_ALIASES);
    let description = getCell(line, normToKey, DESC_ALIASES);
    const date = parseDateCell(dateRaw);

    if (description.length > MAX_DESCRIPTION_LEN) {
      errors.push(`Row ${rowNum}: description truncated to ${MAX_DESCRIPTION_LEN} characters.`);
      description = description.slice(0, MAX_DESCRIPTION_LEN);
    }

    if (!date) {
      errors.push(`Row ${rowNum}: invalid or empty date "${dateRaw}".`);
      continue;
    }

    const rawAmt = getCell(line, normToKey, AMOUNT_ALIASES);
    if (!rawAmt.trim()) continue;

    const amt = parseMoney(rawAmt);
    if (amt == null) {
      errors.push(`Row ${rowNum}: invalid amount "${rawAmt}".`);
      continue;
    }
    if (amt === 0) continue;

    let expenseAmount: number | null = null;
    if (debitsAreNegative) {
      if (amt < 0) expenseAmount = Math.abs(amt);
    } else if (amt > 0) {
      expenseAmount = amt;
    }

    if (expenseAmount != null && expenseAmount > 0) {
      rows.push({ date, description, amount: expenseAmount });
    }
  }

  if (rows.length > 0) {
    errors.unshift(
      debitsAreNegative
        ? "PDF import is best-effort. Amounts were treated as accounting-style (negative = spending, positive = credit in). Verify the preview."
        : "PDF import is best-effort (text extraction varies by bank). Positive amounts are treated as spending; negatives as credits. Check the preview.",
    );
  }

  return { rows, errors };
}

/** @deprecated Use parseCsvToRecords + bankRecordsToExpenseCandidates in production. */
export function parseCsvToMatrix(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  while (i < content.length) {
    const c = content[i]!;

    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (c === "\r") {
      i += 1;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i += 1;
      continue;
    }

    field += c;
    i += 1;
  }

  row.push(field);
  const last = row;
  if (last.length > 1 || (last[0] !== "" && last[0] !== undefined)) {
    rows.push(row);
  }

  return rows;
}

export function bankCsvToExpenseCandidates(matrix: string[][]): {
  rows: ParsedBankRow[];
  errors: string[];
} {
  if (matrix.length < 2) {
    return {
      rows: [],
      errors: ["CSV must include a header row and at least one data row."],
    };
  }
  const headers = matrix[0]!.map((h) => h.trim());
  const records = matrix.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j += 1) {
      row[headers[j]!] = cells[j] ?? "";
    }
    return row;
  });
  return bankRecordsToExpenseCandidates(records);
}
