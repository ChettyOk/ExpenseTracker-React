import type { ExpenseCategory } from "@prisma/client";

import type { UserPatternRule } from "@/lib/autoCategorize";
import { prisma } from "@/lib/prisma";

export function expenseImportDedupeKey(date: Date, amount: number, description: string): string {
  const d = date.toISOString().slice(0, 10);
  const desc = description.trim().toLowerCase();
  const amt = amount.toFixed(2);
  return `${d}|${amt}|${desc}`;
}

export async function loadCategoryLearnedMap(
  userId: string,
): Promise<Map<string, ExpenseCategory>> {
  const learnedRows = await prisma.categoryLearnedRule.findMany({
    where: { userId },
    select: { normalizedDescription: true, category: true },
  });
  return new Map(learnedRows.map((r) => [r.normalizedDescription, r.category]));
}

export async function loadUserPatternRules(userId: string): Promise<UserPatternRule[]> {
  const rules = await prisma.userCategoryRule.findMany({
    where: { userId },
    orderBy: { priority: "desc" },
    select: { pattern: true, category: true, priority: true },
  });
  return rules.map((r) => ({
    pattern: r.pattern,
    category: r.category,
    priority: r.priority,
  }));
}

export async function loadImportCategorization(userId: string): Promise<{
  learned: Map<string, ExpenseCategory>;
  userPatternRules: UserPatternRule[];
}> {
  const [learned, userPatternRules] = await Promise.all([
    loadCategoryLearnedMap(userId),
    loadUserPatternRules(userId),
  ]);
  return { learned, userPatternRules };
}
