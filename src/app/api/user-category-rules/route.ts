import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizeExpenseDescription } from "@/lib/autoCategorize";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";

const categorySchema = z.enum([
  "FOOD",
  "RENT",
  "TRANSPORT",
  "UTILITIES",
  "SUBSCRIPTIONS",
  "SCHOOL",
  "OTHER",
]);

const createSchema = z.object({
  pattern: z.string().min(1).max(500),
  category: categorySchema,
  priority: z.number().int().optional().default(0),
});

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await prisma.userCategoryRule.findMany({
    where: { userId: user.id },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
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

  const pattern = normalizeExpenseDescription(parsed.data.pattern);
  if (!pattern) {
    return NextResponse.json({ error: "Pattern cannot be empty." }, { status: 400 });
  }

  const rule = await prisma.userCategoryRule.create({
    data: {
      userId: user.id,
      pattern,
      category: parsed.data.category,
      priority: parsed.data.priority,
    },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
