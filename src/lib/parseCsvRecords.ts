import { Readable } from "node:stream";

import csv from "csv-parser";

/**
 * Guess delimiter from the first non-empty line (tab- or semicolon-separated bank exports).
 */
export function detectCsvSeparator(text: string): string {
  const head = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const tabs = (head.match(/\t/g) ?? []).length;
  const commas = (head.match(/,/g) ?? []).length;
  const semis = (head.match(/;/g) ?? []).length;
  if (tabs >= 2 && tabs > commas && tabs >= semis) return "\t";
  if (semis >= 2 && semis > commas && semis > tabs) return ";";
  return ",";
}

/**
 * Parse CSV/TSV text into row objects (first row = headers), using csv-parser.
 * Trims header names; strips a leading UTF-8 BOM if present.
 */
export function parseCsvToRecords(csvText: string): Promise<Record<string, string>[]> {
  const text = csvText.replace(/^\uFEFF/, "");
  const separator = detectCsvSeparator(text);
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    Readable.from([text])
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.trim(),
          strict: false,
          separator,
        }),
      )
      .on("data", (row: Record<string, string>) => {
        rows.push(row);
      })
      .on("end", () => resolve(rows))
      .on("error", (err: Error) => reject(err));
  });
}
