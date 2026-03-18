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
  const sortDirParam = url.searchParams.get("sortDir");
  const sortDir = sortDirParam === "asc" ? "asc" : "desc";

  let orderBy:
    | { amount: "asc" | "desc" }
    | { category: "asc" | "desc" }
    | { date: "asc" | "desc" };

  if (sortBy === "amount") {
    orderBy = { amount: sortDir };
  } else if (sortBy === "category") {
    orderBy = { category: sortDir };
  } else {
    orderBy = { date: sortDir };
  }

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

