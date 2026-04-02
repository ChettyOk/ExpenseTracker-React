import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizeExpenseDescription } from "@/lib/autoCategorize";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";

const updateSchema = z.object({
  pattern: z.string().min(1).max(500).optional(),
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
  priority: z.number().int().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.userCategoryRule.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const pattern =
    parsed.data.pattern !== undefined
      ? normalizeExpenseDescription(parsed.data.pattern)
      : undefined;
  if (pattern !== undefined && !pattern) {
    return NextResponse.json({ error: "Pattern cannot be empty." }, { status: 400 });
  }

  if (
    parsed.data.pattern === undefined &&
    parsed.data.category === undefined &&
    parsed.data.priority === undefined
  ) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const rule = await prisma.userCategoryRule.update({
    where: { id },
    data: {
      ...(pattern !== undefined ? { pattern } : {}),
      ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
      ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
    },
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
  const existing = await prisma.userCategoryRule.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.userCategoryRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
