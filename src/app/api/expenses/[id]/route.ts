import { NextResponse } from "next/server";
import { z } from "zod";

import type { Prisma } from "@prisma/client";

import { normalizeExpenseDescription } from "@/lib/autoCategorize";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";

const updateExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  category: z
    .enum([
      "FOOD",
      "RENT",
      "TRANSPORT",
      "UTILITIES",
      "SUBSCRIPTIONS",
      "SCHOOL",
      "OTHER",
    ])
    .optional(),
  date: z.string().min(1).optional(),
  description: z.string().max(500).nullable().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.expense.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Prisma.ExpenseUpdateInput = {};
  if (parsed.data.amount !== undefined) data.amount = parsed.data.amount;
  if (parsed.data.category !== undefined) data.category = parsed.data.category;
  if (parsed.data.date !== undefined) data.date = new Date(parsed.data.date);
  if (parsed.data.description !== undefined) data.description = parsed.data.description;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const expense = await prisma.expense.update({
    where: { id },
    data,
  });

  if (parsed.data.category !== undefined) {
    const desc =
      parsed.data.description !== undefined
        ? parsed.data.description
        : existing.description;
    if (desc != null && String(desc).trim()) {
      const norm = normalizeExpenseDescription(String(desc)).slice(0, 500);
      if (norm.length > 0) {
        await prisma.categoryLearnedRule.upsert({
          where: {
            userId_normalizedDescription: {
              userId: user.id,
              normalizedDescription: norm,
            },
          },
          create: {
            userId: user.id,
            normalizedDescription: norm,
            category: parsed.data.category,
          },
          update: { category: parsed.data.category },
        });
      }
    }
  }

  return NextResponse.json({ expense });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.expense.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

