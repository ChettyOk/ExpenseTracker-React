import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";

const patchSchema = z.object({
  category: z.enum([
    "FOOD",
    "RENT",
    "TRANSPORT",
    "UTILITIES",
    "SUBSCRIPTIONS",
    "SCHOOL",
    "OTHER",
  ]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.categoryLearnedRule.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const rule = await prisma.categoryLearnedRule.update({
    where: { id },
    data: { category: parsed.data.category },
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
  const existing = await prisma.categoryLearnedRule.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.categoryLearnedRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
