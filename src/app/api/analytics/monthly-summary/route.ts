import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { monthCalendarDateRange } from "@/lib/month";

const querySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
});

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    month: url.searchParams.get("month") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid month (use YYYY-MM)" }, { status: 400 });
  }

  const { start, endExclusive } = monthCalendarDateRange(parsed.data.month);

  const [totalRow, byCategoryAgg] = await Promise.all([
    prisma.$queryRaw<[{ total: Prisma.Decimal | null }]>`
      SELECT COALESCE(SUM("amount"), 0)::decimal AS total
      FROM "Expense"
      WHERE "userId" = ${user.id}
        AND "date" >= ${start}::date
        AND "date" < ${endExclusive}::date
    `,
    prisma.$queryRaw<
      { category: string; amount: Prisma.Decimal | null }[]
    >`
      SELECT "category", COALESCE(SUM("amount"), 0)::decimal AS amount
      FROM "Expense"
      WHERE "userId" = ${user.id}
        AND "date" >= ${start}::date
        AND "date" < ${endExclusive}::date
      GROUP BY "category"
    `,
  ]);

  const total = totalRow[0]?.total ?? 0;
  const totalNum = Number(total);

  const perCategory = byCategoryAgg.map((row) => {
    const amount = row.amount ?? 0;
    const amtNum = Number(amount);
    const pct = totalNum === 0 ? 0 : amtNum / totalNum;
    return { category: row.category, amount: amtNum, percentage: pct };
  });

  return NextResponse.json({
    month: parsed.data.month,
    total: totalNum,
    perCategory,
  }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
