import { NextResponse } from "next/server";
import { z } from "zod";

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
  const sortBy = url.searchParams.get("sortBy") ?? "date";
  const sortDir = url.searchParams.get("sortDir") ?? "desc";

  const orderBy =
    sortBy === "amount"
      ? { amount: sortDir === "asc" ? "asc" : "desc" }
      : sortBy === "category"
        ? { category: sortDir === "asc" ? "asc" : "desc" }
        : { date: sortDir === "asc" ? "asc" : "desc" };

  const expenses = await prisma.expense.findMany({
    where: { userId: user.id },
    orderBy,
  });

  return NextResponse.json({ expenses });
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

