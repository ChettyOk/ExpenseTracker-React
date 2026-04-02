import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";

import { requireAdmin } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

function toYyyyMmDd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      categoryLearnedRules: {
        orderBy: { updatedAt: "desc" },
        take: 150,
        select: {
          id: true,
          normalizedDescription: true,
          category: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      userCategoryRules: {
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          pattern: true,
          category: true,
          priority: true,
          createdAt: true,
        },
      },
      bankImportProfiles: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          mapping: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      recurringExpenses: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          category: true,
          dayOfMonth: true,
          description: true,
          isActive: true,
          createdAt: true,
        },
      },
      categoryBudgets: {
        orderBy: { month: "desc" },
        take: 48,
        select: {
          id: true,
          category: true,
          month: true,
          limit: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [expenseAgg, dateRange, recentExpenses] = await Promise.all([
    prisma.expense.aggregate({
      where: { userId: id },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.expense.findFirst({
      where: { userId: id },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
    prisma.expense.findMany({
      where: { userId: id },
      orderBy: { date: "desc" },
      take: 20,
      select: {
        id: true,
        amount: true,
        category: true,
        date: true,
        description: true,
        isGeneratedFromRecurring: true,
        createdAt: true,
      },
    }),
  ]);

  const latestExpense = recentExpenses[0];

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
    expenses: {
      count: expenseAgg._count,
      totalAmount: Number(expenseAgg._sum.amount ?? 0),
      earliestDate: dateRange?.date ? toYyyyMmDd(dateRange.date) : null,
      latestDate: latestExpense?.date ? toYyyyMmDd(latestExpense.date) : null,
      recent: recentExpenses.map((e) => ({
        id: e.id,
        amount: e.amount.toString(),
        category: e.category,
        date: toYyyyMmDd(e.date),
        description: e.description,
        isGeneratedFromRecurring: e.isGeneratedFromRecurring,
        createdAt: e.createdAt.toISOString(),
      })),
    },
    categoryBudgets: user.categoryBudgets.map((b) => ({
      id: b.id,
      category: b.category,
      month: toYyyyMmDd(b.month),
      limit: b.limit.toString(),
    })),
    recurringExpenses: user.recurringExpenses.map((r) => ({
      id: r.id,
      amount: r.amount.toString(),
      category: r.category,
      dayOfMonth: r.dayOfMonth,
      description: r.description,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
    })),
    bankImportProfiles: user.bankImportProfiles.map((p) => ({
      id: p.id,
      name: p.name,
      mapping: p.mapping,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    userCategoryRules: user.userCategoryRules.map((r) => ({
      id: r.id,
      pattern: r.pattern,
      category: r.category,
      priority: r.priority,
      createdAt: r.createdAt.toISOString(),
    })),
    categoryLearnedRules: user.categoryLearnedRules.map((r) => ({
      id: r.id,
      normalizedDescription: r.normalizedDescription,
      category: r.category,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}

const updateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(0).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  password: z.string().min(8).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const data: { email?: string; name?: string | null; role?: "USER" | "ADMIN"; passwordHash?: string } = {};
  if (parsed.data.email !== undefined) data.email = parsed.data.email;
  if (parsed.data.name !== undefined) data.name = parsed.data.name || null;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.password?.length) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json({
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === admin.id) {
    return NextResponse.json(
      { error: "You cannot delete your own admin account" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
