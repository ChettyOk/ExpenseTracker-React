import { NextResponse } from "next/server";
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

  const expenses = await prisma.expense.findMany({
    where: { userId: user.id, date: { gte: start, lt: endExclusive } },
    select: { amount: true, date: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    buckets.set(yyyyMm(d), 0);
  }

  for (const e of expenses) {
    const key = yyyyMm(new Date(e.date));
    if (!buckets.has(key)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + Number(e.amount));
  }

  const points = Array.from(buckets.entries()).map(([month, total]) => ({ month, total }));

  return NextResponse.json({ points });
}

