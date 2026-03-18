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

const querySchema = z.object({
  userId: z.string().optional(),
  category: z.enum(categories).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { userId, category, from, to } = parsed.data;

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

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

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
  });
}
