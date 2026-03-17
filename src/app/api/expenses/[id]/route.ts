import { NextResponse } from "next/server";
import { z } from "zod";

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

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      amount: parsed.data.amount,
      category: parsed.data.category,
      date: parsed.data.date ? new Date(parsed.data.date) : undefined,
      description: parsed.data.description,
    },
  });

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

