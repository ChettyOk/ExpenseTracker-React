import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

const categories = [
  "FOOD",
  "RENT",
  "TRANSPORT",
  "UTILITIES",
  "SUBSCRIPTIONS",
  "SCHOOL",
  "OTHER",
] as const;

const DEFAULT_ADMIN_EXPENSE_LIMIT = 200;
const MAX_ADMIN_EXPENSE_LIMIT = 2000;

const querySchema = z.object({
  userId: z.string().optional(),
  category: z.enum(categories).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_ADMIN_EXPENSE_LIMIT).optional(),
  offset: z.coerce.number().int().min(0).max(10_000_000).optional(),
});

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    userId: url.searchParams.get("userId") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { userId, category, from, to, limit: limitRaw, offset: offsetRaw } = parsed.data;
  const take = limitRaw ?? DEFAULT_ADMIN_EXPENSE_LIMIT;
  const skip = offsetRaw ?? 0;

  const where: {
    userId?: string;
    category?: (typeof categories)[number];
    date?: { gte?: Date; lte?: Date };
  } = {};
  if (userId) where.userId = userId;
  if (category) where.category = category;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  const [expenses, totalCount] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      take,
      skip,
      include: { user: { select: { id: true, email: true, name: true } } },
    }),
    prisma.expense.count({ where }),
  ]);

  return NextResponse.json({
    expenses: expenses.map((e) => ({
      id: e.id,
      userId: e.userId,
      userEmail: e.user.email,
      userName: e.user.name,
      amount: e.amount.toString(),
      category: e.category,
      date: e.date.toISOString().slice(0, 10),
      description: e.description,
    })),
    totalCount,
    limit: take,
    offset: skip,
  });
}
