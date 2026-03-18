import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { monthBoundsUTC } from "@/lib/month";

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

  const { from, to } = monthBoundsUTC(parsed.data.month);

  const [totalAgg, byCategoryAgg] = await Promise.all([
    prisma.expense.aggregate({
      where: { userId: user.id, date: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { userId: user.id, date: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
  ]);

  const total = totalAgg._sum.amount ?? 0;
  const perCategory = byCategoryAgg.map(
    (row: { category: string; _sum: { amount: unknown } }) => {
    const amount = row._sum.amount ?? 0;
    const pct = total === 0 ? 0 : Number(amount) / Number(total);
    return { category: row.category, amount, percentage: pct };
    },
  );

  return NextResponse.json({
    month: parsed.data.month,
    total,
    perCategory,
  });
}

