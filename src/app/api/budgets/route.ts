import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { monthStartUTC } from "@/lib/month";

const getSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

const upsertSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  budgets: z.array(
    z.object({
      category: z.enum([
        "FOOD",
        "RENT",
        "TRANSPORT",
        "UTILITIES",
        "SUBSCRIPTIONS",
        "SCHOOL",
        "OTHER",
      ]),
      limit: z.number().nonnegative(),
    }),
  ),
});

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = getSchema.safeParse({ month: url.searchParams.get("month") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid month (use YYYY-MM)" }, { status: 400 });
  }

  const month = monthStartUTC(parsed.data.month);
  const budgets = await prisma.categoryBudget.findMany({
    where: { userId: user.id, month },
    orderBy: { category: "asc" },
  });

  return NextResponse.json({ month: parsed.data.month, budgets });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const month = monthStartUTC(parsed.data.month);

  const results = await prisma.$transaction(
    parsed.data.budgets.map((b) =>
      prisma.categoryBudget.upsert({
        where: { userId_month_category: { userId: user.id, month, category: b.category } },
        create: { userId: user.id, month, category: b.category, limit: b.limit },
        update: { limit: b.limit },
      }),
    ),
  );

  return NextResponse.json({ budgets: results }, { status: 201 });
}

