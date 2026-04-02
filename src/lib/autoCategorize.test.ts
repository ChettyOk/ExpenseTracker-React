import type { ExpenseCategory } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { autoCategorizeFromDescription } from "./autoCategorize";

describe("autoCategorizeFromDescription", () => {
  it("matches food merchants", () => {
    expect(autoCategorizeFromDescription("STARBUCKS #1234")).toBe("FOOD");
  });

  it("treats grocery chains as FOOD (Groceries → FOOD in schema)", () => {
    expect(autoCategorizeFromDescription("WALMART SUPERCENTER")).toBe("FOOD");
    expect(autoCategorizeFromDescription("COSTCO WHSE")).toBe("FOOD");
  });

  it("matches transport", () => {
    expect(autoCategorizeFromDescription("UBER TRIP")).toBe("TRANSPORT");
  });

  it("uses regex for Amazon Prime", () => {
    expect(autoCategorizeFromDescription("AMAZON PRIME*VIDEO")).toBe("SUBSCRIPTIONS");
  });

  it("defaults to OTHER", () => {
    expect(autoCategorizeFromDescription("UNKNOWN MERCHANT")).toBe("OTHER");
  });

  it("prefers user-learned rules over keywords", () => {
    const learned = new Map<string, ExpenseCategory>([
      ["tim hortons #99", "TRANSPORT"],
    ]);
    expect(autoCategorizeFromDescription("Tim Hortons #99", learned)).toBe("TRANSPORT");
  });

  it("applies user pattern rules before built-in keywords", () => {
    const userRules = [{ pattern: "shell", category: "TRANSPORT" as const, priority: 10 }];
    expect(autoCategorizeFromDescription("SHELL OIL 4412", undefined, userRules)).toBe(
      "TRANSPORT",
    );
  });
});
