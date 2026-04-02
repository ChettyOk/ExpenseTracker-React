import { NextResponse } from "next/server";
import { z } from "zod";

import {
  expenseOrderBy,
  expenseWhereForUser,
  parseExpenseListQuery,
} from "@/lib/expenseQuery";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";

const createExpenseSchema = z.object({
  amount: z.number().positive(),
  category: z.enum([
    "FOOD",
    "RENT",
    "TRANSPORT",
    "UTILITIES",
    "SUBSCRIPTIONS",
    "SCHOOL",
    "OTHER",
  ]),
  date: z.string().min(1), // ISO date
  description: z.string().max(500).optional(),
});

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = parseExpenseListQuery(url);
  const orderBy = expenseOrderBy(q.sortBy, q.sortDir);
  const where = expenseWhereForUser(user.id, q);

  const [expenses, totalCount, sumAgg] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy,
      take: q.limit,
      skip: q.offset,
      select: {
        id: true,
        amount: true,
        category: true,
        date: true,
        description: true,
      },
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  return NextResponse.json({
    expenses,
    totalCount,
    filteredTotalAmount: Number(sumAgg._sum.amount ?? 0),
    limit: q.limit,
    offset: q.offset,
  });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const expense = await prisma.expense.create({
    data: {
      userId: user.id,
      amount: parsed.data.amount,
      category: parsed.data.category,
      date: new Date(parsed.data.date),
      description: parsed.data.description ?? null,
    },
  });

  return NextResponse.json({ expense }, { status: 201 });
}

export async function DELETE() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await prisma.expense.deleteMany({
    where: { userId: user.id },
  });

  return NextResponse.json({ deleted: result.count });
}
