import type { ExpenseCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { autoCategorizeFromDescription } from "@/lib/autoCategorize";
import { expenseImportDedupeKey, loadImportCategorization } from "@/lib/expenseImportShared";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import {
  bankRecordsToExpenseCandidatesForImport,
  bankRecordsToExpenseCandidatesFromPdfExtracted,
} from "@/lib/parseBankCsv";
import { parseImportFileToRecords } from "@/lib/parseStatementImport";
import { resolveBankImportMappingForUser } from "@/lib/resolveBankImportProfile";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 2000;

const categorySchema = z.enum([
  "FOOD",
  "RENT",
  "TRANSPORT",
  "UTILITIES",
  "SUBSCRIPTIONS",
  "SCHOOL",
  "OTHER",
]);

const jsonRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive(),
  description: z.string().max(500).nullable().optional(),
  category: categorySchema,
});

const jsonImportSchema = z.object({
  rows: z.array(jsonRowSchema).min(1).max(MAX_ROWS),
});

async function commitRows(
  userId: string,
  rows: { date: Date; amount: number; description: string | null; category: ExpenseCategory }[],
): Promise<{ imported: number; skippedDuplicates: number }> {
  if (rows.length === 0) return { imported: 0, skippedDuplicates: 0 };

  const minDate = new Date(Math.min(...rows.map((c) => c.date.getTime())));
  const maxDate = new Date(Math.max(...rows.map((c) => c.date.getTime())));

  const existing = await prisma.expense.findMany({
    where: {
      userId,
      date: { gte: minDate, lte: maxDate },
    },
    select: { date: true, amount: true, description: true },
  });

  const existingKeys = new Set(
    existing.map((e) =>
      expenseImportDedupeKey(e.date, Number(e.amount), e.description ?? ""),
    ),
  );

  let skippedDuplicates = 0;
  const batch: {
    userId: string;
    amount: number;
    category: ExpenseCategory;
    date: Date;
    description: string | null;
  }[] = [];

  for (const c of rows) {
    const key = expenseImportDedupeKey(c.date, c.amount, c.description ?? "");
    if (existingKeys.has(key)) {
      skippedDuplicates += 1;
      continue;
    }
    existingKeys.add(key);
    batch.push({
      userId,
      amount: c.amount,
      category: c.category,
      date: c.date,
      description: c.description,
    });
  }

  const chunkSize = 100;
  for (let i = 0; i < batch.length; i += chunkSize) {
    const chunk = batch.slice(i, i + chunkSize);
    await prisma.expense.createMany({ data: chunk });
  }

  return { imported: batch.length, skippedDuplicates };
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("application/json")) {
    const body = await req.json().catch(() => null);
    const parsed = jsonImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const rows = parsed.data.rows.map((r) => ({
      date: new Date(r.date + "T12:00:00.000Z"),
      amount: r.amount,
      description: r.description?.trim() ? r.description.trim() : null,
      category: r.category,
    }));

    const result = await commitRows(user.id, rows);
    return NextResponse.json({
      imported: result.imported,
      skippedDuplicates: result.skippedDuplicates,
      parseWarnings: [] as string[],
    });
  }

  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json(
      {
        error:
          "Use multipart form with \"file\" for direct CSV or PDF upload, or JSON body { rows: [...] } after preview.",
      },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 2MB)." }, { status: 400 });
  }

  const { records, kind, warnings: fileWarnings } = await parseImportFileToRecords(file);

  const profileId = kind === "csv" ? form.get("profileId") : null;
  if (kind === "pdf" && form.get("profileId")) {
    fileWarnings.push("Bank CSV profiles are ignored for PDF; transactions are detected from statement text.");
  }

  const { mapping, error: mapError } = await resolveBankImportMappingForUser(user.id, profileId);
  if (mapError) {
    return NextResponse.json({ error: mapError }, { status: 400 });
  }

  if (records.length === 0) {
    return NextResponse.json(
      {
        error:
          fileWarnings[0] ??
          (kind === "pdf" ? "No rows extracted from PDF." : "No rows found in CSV."),
        details: fileWarnings.slice(0, 20),
      },
      { status: 400 },
    );
  }

  if (records.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (max ${MAX_ROWS} data rows).` },
      { status: 400 },
    );
  }

  const { learned, userPatternRules } = await loadImportCategorization(user.id);
  const { rows: candidates, errors: parseErrors } =
    kind === "pdf"
      ? bankRecordsToExpenseCandidatesFromPdfExtracted(records)
      : bankRecordsToExpenseCandidatesForImport(records, mapping);

  const mergedWarnings = [...fileWarnings, ...parseErrors];

  if (candidates.length === 0 && mergedWarnings.length > 0) {
    const fallback =
      kind === "pdf"
        ? "Could not parse PDF transactions."
        : "No expense rows could be imported from this file.";
    const primary = mergedWarnings[0] ?? fallback;
    return NextResponse.json(
      {
        error: primary,
        details: mergedWarnings.slice(1, 20).filter((w) => w !== primary),
      },
      { status: 400 },
    );
  }

  if (candidates.length === 0) {
    return NextResponse.json(
      {
        imported: 0,
        skippedDuplicates: 0,
        parseWarnings: mergedWarnings.slice(0, 50),
        message: "No expense rows found (deposits, blanks, and zero amounts are skipped).",
      },
      { status: 200 },
    );
  }

  const mapped = candidates.map((c) => ({
    date: c.date,
    amount: c.amount,
    description: c.description || null,
    category: autoCategorizeFromDescription(c.description, learned, userPatternRules),
  }));

  const result = await commitRows(user.id, mapped);

  return NextResponse.json({
    imported: result.imported,
    skippedDuplicates: result.skippedDuplicates,
    parseWarnings: mergedWarnings.slice(0, 50),
  });
}
