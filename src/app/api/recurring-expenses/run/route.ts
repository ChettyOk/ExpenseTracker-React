import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { monthBoundsUTC, yyyyMmNowLocal } from "@/lib/month";

const bodySchema = z
  .object({
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(), // YYYY-MM
  })
  .optional();

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => undefined);
  const parsed = bodySchema ? bodySchema.safeParse(body) : { success: true, data: {} };
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const month = parsed.data?.month ?? yyyyMmNowLocal();
  const { from, to, y, m } = monthBoundsUTC(month);
  const year = y;
  const monthIndex = m - 1;

  const rules = await prisma.recurringExpense.findMany({
    where: { userId: user.id, isActive: true },
  });

  const created = await prisma.$transaction(async (tx) => {
    const out: string[] = [];

    for (const rule of rules) {
      const day = Math.max(1, Math.min(28, rule.dayOfMonth));
      const date = new Date(Date.UTC(year, monthIndex, day));

      // Skip if outside bounds (safety)
      if (!(date >= from && date < to)) continue;

      const existing = await tx.expense.findFirst({
        where: {
          userId: user.id,
          recurringExpenseId: rule.id,
          date,
        },
        select: { id: true },
      });

      if (existing) continue;

      const expense = await tx.expense.create({
        data: {
          userId: user.id,
          amount: rule.amount,
          category: rule.category,
          date,
          description: rule.description,
          isGeneratedFromRecurring: true,
          recurringExpenseId: rule.id,
        },
        select: { id: true },
      });

      out.push(expense.id);
    }

    return out;
  });

  return NextResponse.json({ month, createdCount: created.length, createdExpenseIds: created });
}

