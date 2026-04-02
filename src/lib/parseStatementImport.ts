import { extractTextFromPdfBuffer } from "./extractPdfText";
import { parseCsvToRecords } from "./parseCsvRecords";

export type StatementImportKind = "csv" | "pdf";

export function detectStatementImportKind(
  fileName: string,
  mimeType: string,
): StatementImportKind {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (mimeType === "application/pdf") return "pdf";
  return "csv";
}

/** True if buffer contains a PDF file signature (`%PDF`), allowing small leading garbage. */
export function bufferLooksLikePdf(buf: Buffer): boolean {
  const n = Math.min(buf.length, 4096);
  for (let i = 0; i <= n - 4; i += 1) {
    if (
      buf[i] === 0x25 &&
      buf[i + 1] === 0x50 &&
      buf[i + 2] === 0x44 &&
      buf[i + 3] === 0x46
    ) {
      return true;
    }
  }
  return false;
}

function bufferLooksLikeZip(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07);
}

const MONTH_NAME =
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/i;

/** US-style money at end (optional cents; optional balance column stripped separately). */
const US_MONEY_SUFFIX = /[\s\u00A0]+(-?\$?€?£?\(?[\d,]+(?:\.\d{1,2})?\)?)\s*$/;
/** European-style money at end: 1.234,56 */
const EU_MONEY_SUFFIX = /[\s\u00A0]+(-?[\d]{1,3}(?:\.\d{3})*,\d{2})\s*$/;

type PdfParsedLine = { dateDisplay: string; description: string; amountRaw: string };

function clipDesc(s: string): string {
  return s.trim().slice(0, 500);
}

/**
 * Pop one trailing amount from line; returns null if none. Prefer US then EU.
 */
function popTrailingMoney(line: string): { amountRaw: string; rest: string } | null {
  const us = US_MONEY_SUFFIX.exec(line);
  if (us && us[1] != null && us.index !== undefined) {
    return { amountRaw: us[1], rest: line.slice(0, us.index).trim() };
  }
  const eu = EU_MONEY_SUFFIX.exec(line);
  if (eu && eu[1] != null && eu.index !== undefined) {
    return { amountRaw: eu[1], rest: line.slice(0, eu.index).trim() };
  }
  return null;
}

/**
 * Strip optional running balance: "… desc 12.34 9,999.99" → transaction 12.34.
 */
function stripOptionalBalanceAmount(
  line: string,
): { amountRaw: string; rest: string } | null {
  const outer = popTrailingMoney(line);
  if (!outer) return null;
  const inner = popTrailingMoney(outer.rest);
  if (inner) {
    return { amountRaw: inner.amountRaw, rest: inner.rest.trim() };
  }
  return outer;
}

function parseLeadingIsoOrSlashDate(rest: string): PdfParsedLine | null {
  const iso = /^(\d{4}-\d{2}-\d{2})\s+/.exec(rest);
  if (iso) {
    return {
      dateDisplay: iso[1]!,
      description: clipDesc(rest.slice(iso[0].length)),
      amountRaw: "", // filled by caller
    };
  }
  const slash = /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+/.exec(rest);
  if (slash) {
    return {
      dateDisplay: slash[1]!,
      description: clipDesc(rest.slice(slash[0].length)),
      amountRaw: "",
    };
  }
  // Day-first dotted or slashed: 15.03.2024 or 15/03/2024
  const dmy = /^(\d{1,2}[./]\d{1,2}[./]\d{2,4})\s+/.exec(rest);
  if (dmy) {
    return {
      dateDisplay: dmy[1]!,
      description: clipDesc(rest.slice(dmy[0].length)),
      amountRaw: "",
    };
  }
  const mon = MONTH_NAME.exec(rest);
  if (mon && mon[1] && mon[2] && mon[3]) {
    const dateDisplay = `${mon[1]} ${mon[2]}, ${mon[3]}`;
    const after = rest.slice(mon[0].length).trim();
    return { dateDisplay, description: clipDesc(after), amountRaw: "" };
  }
  return null;
}

/** Date + description + amount (amount removed from line already). */
function attachAmount(p: PdfParsedLine, amountRaw: string): PdfParsedLine {
  return { ...p, amountRaw };
}

/** Amount first, then date, then description. */
function tryAmountLeading(line: string): PdfParsedLine | null {
  const m = /^(-?\$?€?£?\(?[\d,]+(?:\.\d{1,2})?\)?|-?[\d]{1,3}(?:\.\d{3})*,\d{2})\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}[./]\d{1,2}[./]\d{2,4})\s+(.+)$/.exec(
    line,
  );
  if (!m) return null;
  return {
    amountRaw: m[1]!,
    dateDisplay: m[2]!,
    description: clipDesc(m[3]!),
  };
}

/** Description … date … amount (date just before money). */
function tryDateBeforeTrailingAmount(rest: string, amountRaw: string): PdfParsedLine | null {
  const tail =
    /^(.+?)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}[./]\d{1,2}[./]\d{2,4})\s*$/i.exec(
      rest,
    );
  if (tail) {
    return {
      dateDisplay: tail[2]!,
      description: clipDesc(tail[1]!),
      amountRaw,
    };
  }
  const monTail =
    /^(.+?)\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\s*$/i.exec(
      rest,
    );
  if (monTail) {
    return {
      dateDisplay: monTail[2]!,
      description: clipDesc(monTail[1]!),
      amountRaw,
    };
  }
  return null;
}

function parsePdfTransactionLine(line: string): PdfParsedLine | null {
  if (line.length < 6) return null;

  const bal = stripOptionalBalanceAmount(line);
  if (!bal) {
    const single = tryAmountLeading(line);
    return single ?? null;
  }

  const { amountRaw, rest } = bal;
  if (rest.length < 4) return null;

  const leading = parseLeadingIsoOrSlashDate(rest);
  if (leading && leading.description.length >= 1) {
    return attachAmount(leading, amountRaw);
  }

  const t = tryDateBeforeTrailingAmount(rest, amountRaw);
  if (t && t.description.length >= 1) return t;

  const amtFirst = tryAmountLeading(line);
  return amtFirst ?? null;
}

/**
 * Some PDFs concatenate rows into one line. Split on probable date starts.
 */
function expandVirtualLines(lines: string[], fullText: string): string[] {
  if (lines.length >= 8 || fullText.length < 120) return lines;

  const split = fullText
    .split(
      /(?=\b\d{4}-\d{2}-\d{2}\s)|(?=\b\d{1,2}\/\d{1,2}\/\d{2,4}\s)|(?=\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\s)|(?=\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b)/i,
    )
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 8);

  return split.length > lines.length ? split : lines;
}

/**
 * Heuristic: each line (or virtual segment) = date + description + amount, with variants.
 * Works for many text-based bank PDFs; image-only statements will yield no rows.
 */
export function pdfTextToBankRecords(text: string): {
  records: Record<string, string>[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const normalized = text.replace(/\u00A0/g, " ").trim();
  if (!normalized) {
    return {
      records: [],
      warnings: [
        "No text could be read from this PDF (it may be scanned/image-only). Export CSV from your bank if possible.",
      ],
    };
  }

  let lines = normalized
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 8);

  lines = expandVirtualLines(lines, normalized);

  const records: Record<string, string>[] = [];

  for (const line of lines) {
    if (/^page\s+\d+/i.test(line)) continue;
    if (/^account\s+(number|ending)/i.test(line)) continue;
    if (/^balance\s*$/i.test(line)) continue;
    if (/^transaction\s*(history|detail)/i.test(line)) continue;
    if (line.length > 800) continue;

    const parsed = parsePdfTransactionLine(line);
    if (parsed && parsed.description.length >= 1) {
      records.push({
        Date: parsed.dateDisplay,
        Description: parsed.description,
        Amount: parsed.amountRaw,
      });
    }
  }

  if (records.length === 0) {
    warnings.push(
      "No transaction lines matched this PDF’s text layout. Banks differ widely—try their CSV download, or a different export.",
    );
  }

  return { records, warnings };
}

export async function parseImportFileToRecords(file: File): Promise<{
  records: Record<string, string>[];
  kind: StatementImportKind;
  warnings: string[];
}> {
  const buf = Buffer.from(await file.arrayBuffer());
  const fromNameOrMime = detectStatementImportKind(file.name, file.type);
  const pdfMagic = bufferLooksLikePdf(buf);
  const kind: StatementImportKind =
    fromNameOrMime === "pdf" || pdfMagic ? "pdf" : "csv";
  const warnings: string[] = [];

  if (pdfMagic && fromNameOrMime !== "pdf") {
    warnings.push(
      "This file’s contents are a PDF, but the name or type suggested CSV. It was parsed as a PDF—rename to .pdf next time to avoid confusion.",
    );
  }

  if (kind === "pdf") {
    try {
      const text = await extractTextFromPdfBuffer(buf);
      const { records, warnings: w } = pdfTextToBankRecords(text);
      warnings.push(...w);
      return { records, kind: "pdf", warnings };
    } catch {
      warnings.push("Failed to read this PDF (file may be corrupt or password-protected).");
      return {
        records: [],
        kind: "pdf",
        warnings,
      };
    }
  }

  try {
    const text = buf.toString("utf8");
    const records = await parseCsvToRecords(text);
    return { records, kind: "csv", warnings };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const hints: string[] = [
      `Could not parse CSV (${reason}). Use a comma-separated export with a header row (e.g. Date, Description, Amount).`,
    ];
    if (bufferLooksLikeZip(buf)) {
      hints.push(
        "This looks like a ZIP-based file (often Excel .xlsx). Open it in Excel/Numbers and use Save As → CSV (UTF-8).",
      );
    }
    return {
      records: [],
      kind: "csv",
      warnings: hints,
    };
  }
}
