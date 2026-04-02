import { NextResponse } from "next/server";

import { autoCategorizeFromDescription } from "@/lib/autoCategorize";
import { requireUser } from "@/lib/apiAuth";
import { expenseImportDedupeKey, loadImportCategorization } from "@/lib/expenseImportShared";
import { prisma } from "@/lib/prisma";
import { resolveBankImportMappingForUser } from "@/lib/resolveBankImportProfile";
import {
  bankRecordsToExpenseCandidatesForImport,
  bankRecordsToExpenseCandidatesFromPdfExtracted,
} from "@/lib/parseBankCsv";
import { parseImportFileToRecords } from "@/lib/parseStatementImport";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 2000;

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart form with field \"file\" (CSV or PDF)." },
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
  const { rows: candidates, errors: parseWarnings } =
    kind === "pdf"
      ? bankRecordsToExpenseCandidatesFromPdfExtracted(records)
      : bankRecordsToExpenseCandidatesForImport(records, mapping);

  const mergedWarnings = [...fileWarnings, ...parseWarnings];

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
    return NextResponse.json({
      rows: [],
      parseWarnings: mergedWarnings.slice(0, 50),
      message: "No expense rows found (deposits and blanks are skipped).",
    });
  }

  const minDate = new Date(Math.min(...candidates.map((c) => c.date.getTime())));
  const maxDate = new Date(Math.max(...candidates.map((c) => c.date.getTime())));

  const existing = await prisma.expense.findMany({
    where: {
      userId: user.id,
      date: { gte: minDate, lte: maxDate },
    },
    select: { date: true, amount: true, description: true },
  });

  const existingKeys = new Set(
    existing.map((e) =>
      expenseImportDedupeKey(e.date, Number(e.amount), e.description ?? ""),
    ),
  );

  const rows = candidates.map((c) => {
    const key = expenseImportDedupeKey(c.date, c.amount, c.description);
    return {
      date: c.date.toISOString().slice(0, 10),
      amount: c.amount,
      description: c.description || null,
      category: autoCategorizeFromDescription(c.description, learned, userPatternRules),
      isDuplicate: existingKeys.has(key),
    };
  });

  return NextResponse.json({
    rows,
    parseWarnings: mergedWarnings.slice(0, 50),
  });
}
