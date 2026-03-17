import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";

const updateSchema = z.object({
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
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.recurringExpense.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rule = await prisma.recurringExpense.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ rule });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.recurringExpense.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recurringExpense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

