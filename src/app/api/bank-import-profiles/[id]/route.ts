import { NextResponse } from "next/server";
import { z } from "zod";

import { bankImportMappingSchema } from "@/lib/bankImportMapping";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  mapping: bankImportMappingSchema.optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const profile = await prisma.bankImportProfile.findFirst({
    where: { id, userId: user.id },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ profile });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.bankImportProfile.findFirst({
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

  if (parsed.data.name === undefined && parsed.data.mapping === undefined) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const profile = await prisma.bankImportProfile.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.mapping !== undefined
        ? { mapping: parsed.data.mapping as object }
        : {}),
    },
  });

  return NextResponse.json({ profile });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.bankImportProfile.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.bankImportProfile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
