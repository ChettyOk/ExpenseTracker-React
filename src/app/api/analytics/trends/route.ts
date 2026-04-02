import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";

const querySchema = z.object({
  range: z.string().optional(), // e.g. "12m"
});

function yyyyMm(d: Date) {
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}`;
}

function utcYyyyMmDd(d: Date) {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ range: url.searchParams.get("range") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const months = parsed.data.range === "6m" ? 6 : 12;

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const endExclusive = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const startStr = utcYyyyMmDd(start);
  const endExclusiveStr = utcYyyyMmDd(endExclusive);

  const sums = await prisma.$queryRaw<{ month: string; total: Prisma.Decimal }[]>`
    SELECT to_char("date", 'YYYY-MM') AS month,
           SUM("amount")::decimal AS total
    FROM "Expense"
    WHERE "userId" = ${user.id}
      AND "date" >= ${startStr}::date
      AND "date" < ${endExclusiveStr}::date
    GROUP BY to_char("date", 'YYYY-MM')
    ORDER BY month
  `;

  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    buckets.set(yyyyMm(d), 0);
  }

  for (const row of sums) {
    if (buckets.has(row.month)) {
      buckets.set(row.month, Number(row.total));
    }
  }

  const points = Array.from(buckets.entries()).map(([month, total]) => ({ month, total }));

  return NextResponse.json(
    { points },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
