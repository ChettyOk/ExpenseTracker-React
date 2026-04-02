import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { monthCalendarDateRange } from "@/lib/month";

const querySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ month: url.searchParams.get("month") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid month (use YYYY-MM)" }, { status: 400 });
  }

  const { start, endExclusive } = monthCalendarDateRange(parsed.data.month);

  const [recurringRules, generatedRow, monthTotalRow] = await Promise.all([
    prisma.recurringExpense.findMany({
      where: { userId: user.id, isActive: true },
      select: { amount: true },
    }),
    prisma.$queryRaw<[{ total: Prisma.Decimal | null }]>`
      SELECT COALESCE(SUM("amount"), 0)::decimal AS total
      FROM "Expense"
      WHERE "userId" = ${user.id}
        AND "date" >= ${start}::date
        AND "date" < ${endExclusive}::date
        AND "isGeneratedFromRecurring" = true
    `,
    prisma.$queryRaw<[{ total: Prisma.Decimal | null }]>`
      SELECT COALESCE(SUM("amount"), 0)::decimal AS total
      FROM "Expense"
      WHERE "userId" = ${user.id}
        AND "date" >= ${start}::date
        AND "date" < ${endExclusive}::date
    `,
  ]);

  const expectedRecurringTotal = recurringRules.reduce(
    (s, r) => s + Number(r.amount),
    0,
  );
  const actualFromRecurring = Number(generatedRow[0]?.total ?? 0);
  const monthTotalSpend = Number(monthTotalRow[0]?.total ?? 0);

  return NextResponse.json(
    {
      month: parsed.data.month,
      expectedRecurringTotal,
      actualFromRecurring,
      monthTotalSpend,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
