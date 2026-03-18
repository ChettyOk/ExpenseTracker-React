import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [userCount, expenseAgg, popularCategory] = await Promise.all([
    prisma.user.count(),
    prisma.expense.aggregate({
      _count: true,
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      _count: { _all: true },
      orderBy: { _count: { _all: "desc" } },
    }),
  ]);

  const totalExpenses = expenseAgg._count;
  const totalAmount = Number(expenseAgg._sum.amount ?? 0);
  const avgPerUser = userCount > 0 ? totalAmount / userCount : 0;
  const mostPopularCategory = popularCategory[0]?.category ?? null;

  return NextResponse.json({
    totalUsers: userCount,
    totalExpenses,
    totalAmount,
    mostPopularCategory,
    averageSpendingPerUser: avgPerUser,
  });
}
