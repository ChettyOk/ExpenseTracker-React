import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await prisma.categoryLearnedRule.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      normalizedDescription: true,
      category: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ rules });
}
