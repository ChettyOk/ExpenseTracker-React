import type { ExpenseCategory } from "@prisma/client";

/**
 * Stable key for learned rules and deduplication (trim, lowercase, collapse spaces).
 */
export function normalizeExpenseDescription(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, " ");
}

type Rule = {
  category: ExpenseCategory;
  /** Substring match on normalized lowercase description */
  patterns?: string[];
  /** Optional regexes (tested on original description for flexibility) */
  regexes?: RegExp[];
};

/**
 * First matching rule wins. Order matters: put specific categories before broad ones.
 * "Groceries" from your spec maps to FOOD (schema has no GROCERIES enum).
 */
const RULES: Rule[] = [
  {
    category: "RENT",
    patterns: ["rent", "landlord", "lease", "apartment", "property mgmt"],
  },
  {
    category: "SCHOOL",
    patterns: ["tuition", "university", "college", "student loan", "textbook"],
  },
  {
    category: "SUBSCRIPTIONS",
    patterns: [
      "netflix",
      "spotify",
      "hulu",
      "disney+",
      "github",
      "openai",
      "adobe",
      "dropbox",
      "notion",
      "slack",
      "zoom.us",
    ],
    regexes: [/\bamazon\s*prime\b/i, /\bapple\.com\/bill\b/i],
  },
  {
    category: "UTILITIES",
    patterns: [
      "electric",
      "power company",
      "water bill",
      "sewer",
      "internet",
      "broadband",
      "comcast",
      "xfinity",
      "verizon",
      "at&t",
      "att ",
      "duke energy",
      "pge",
      "pg&e",
      "national grid",
      "natural gas",
    ],
    regexes: [/\b(utilities?|energy)\s+(bill|payment)\b/i],
  },
  {
    category: "TRANSPORT",
    patterns: [
      "uber",
      "lyft",
      "transit",
      "metro",
      "parking",
      "toll",
      "shell oil",
      "chevron",
      "exxon",
      "bp ",
      "gas station",
      "fuel",
    ],
    regexes: [/\b(shell|chevron|exxon|mobil|speedway|76\s+gas)\b/i],
  },
  {
    category: "FOOD",
    patterns: [
      "starbucks",
      "tim hortons",
      "mcdonald",
      "restaurant",
      "cafe",
      "coffee",
      "uber eats",
      "doordash",
      "grubhub",
      "instacart",
      "walmart",
      "costco",
      "superstore",
      "grocery",
      "whole foods",
      "trader joe",
      "safeway",
      "kroger",
      "publix",
      "loblaws",
      "no frills",
      "food basics",
    ],
  },
];

export type UserPatternRule = {
  pattern: string;
  category: ExpenseCategory;
  priority: number;
};

/**
 * Keyword + regex categorization. Order: exact learned map → user pattern rules (by priority)
 * → built-in rules.
 */
export function autoCategorizeFromDescription(
  description: string,
  learned?: Map<string, ExpenseCategory>,
  userPatternRules?: UserPatternRule[],
): ExpenseCategory {
  const normalized = normalizeExpenseDescription(description);
  if (!normalized) return "OTHER";

  const fromUser = learned?.get(normalized);
  if (fromUser) return fromUser;

  const lowered = normalized;

  if (userPatternRules?.length) {
    for (const r of userPatternRules) {
      if (lowered.includes(r.pattern)) return r.category;
    }
  }

  for (const rule of RULES) {
    if (rule.regexes) {
      for (const rx of rule.regexes) {
        if (rx.test(description)) return rule.category;
      }
    }
    if (rule.patterns) {
      for (const p of rule.patterns) {
        if (lowered.includes(p)) return rule.category;
      }
    }
  }

  return "OTHER";
}
