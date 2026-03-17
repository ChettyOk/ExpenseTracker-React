import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";

const createSchema = z.object({
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
  dayOfMonth: z.number().int().min(1).max(28),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await prisma.recurringExpense.findMany({
    where: { userId: user.id },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ rules });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const rule = await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      amount: parsed.data.amount,
      category: parsed.data.category,
      dayOfMonth: parsed.data.dayOfMonth,
      description: parsed.data.description ?? null,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({ rule }, { status: 201 });
}

