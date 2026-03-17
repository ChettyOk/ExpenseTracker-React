import { describe, expect, it } from "vitest";

import {
  daysInUTCMonth,
  monthBoundsUTC,
  nextMonthStartUTC,
  prevYYYYMM,
} from "./month";

describe("month utils", () => {
  it("computes month bounds in UTC", () => {
    const { from, to, y, m } = monthBoundsUTC("2026-03");
    expect(y).toBe(2026);
    expect(m).toBe(3);
    expect(from.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  it("computes next month start", () => {
    expect(nextMonthStartUTC("2026-12").toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("computes previous YYYY-MM", () => {
    expect(prevYYYYMM("2026-01")).toBe("2025-12");
  });

  it("computes days in month (including leap year)", () => {
    expect(daysInUTCMonth(2024, 2)).toBe(29);
    expect(daysInUTCMonth(2026, 2)).toBe(28);
  });
});

