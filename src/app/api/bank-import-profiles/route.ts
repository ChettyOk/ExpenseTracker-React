import { NextResponse } from "next/server";
import { z } from "zod";

import { bankImportMappingSchema } from "@/lib/bankImportMapping";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  mapping: bankImportMappingSchema,
});

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profiles = await prisma.bankImportProfile.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, mapping: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ profiles });
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

  const profile = await prisma.bankImportProfile.create({
    data: {
      userId: user.id,
      name: parsed.data.name.trim(),
      mapping: parsed.data.mapping as object,
    },
  });

  return NextResponse.json({ profile }, { status: 201 });
}
