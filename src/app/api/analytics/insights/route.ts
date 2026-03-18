import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { daysInUTCMonth, monthBoundsUTC, prevYYYYMM } from "@/lib/month";

const querySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ month: url.searchParams.get("month") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid month (use YYYY-MM)" }, { status: 400 });
  }

  const month = parsed.data.month;
  const prev = prevYYYYMM(month);

  const { from, to, y, m } = monthBoundsUTC(month);
  const prevBounds = monthBoundsUTC(prev);

  const [cur, prevAgg] = await Promise.all([
    prisma.expense.groupBy({
      by: ["category"],
      where: { userId: user.id, date: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { userId: user.id, date: { gte: prevBounds.from, lt: prevBounds.to } },
      _sum: { amount: true },
    }),
  ]);

  const curMap = new Map<string, number>(
    cur.map(
      (r: { category: string; _sum: { amount: unknown } }) => [
        r.category,
        Number(r._sum.amount ?? 0),
      ],
    ),
  );
  const prevMap = new Map<string, number>(
    prevAgg.map(
      (r: { category: string; _sum: { amount: unknown } }) => [
        r.category,
        Number(r._sum.amount ?? 0),
      ],
    ),
  );

  const categories = [
    "FOOD",
    "RENT",
    "TRANSPORT",
    "UTILITIES",
    "SUBSCRIPTIONS",
    "SCHOOL",
    "OTHER",
  ] as const;

  const deltas = categories.map((cat) => {
    const current = curMap.get(cat) ?? 0;
    const previous = prevMap.get(cat) ?? 0;
    const change = current - previous;
    const pct = previous === 0 ? (current === 0 ? 0 : 1) : change / previous;
    return { category: cat, current, previous, change, percentChange: pct };
  });

  const totalSoFar = Array.from(curMap.values()).reduce((a, b) => a + b, 0);
  const today = new Date();
  const isCurrentMonth = today.getUTCFullYear() === y && today.getUTCMonth() + 1 === m;
  const dayOfMonth = isCurrentMonth ? today.getUTCDate() : daysInUTCMonth(y, m);
  const dim = daysInUTCMonth(y, m);
  const forecast = dayOfMonth > 0 ? (totalSoFar / dayOfMonth) * dim : totalSoFar;

  const insights: string[] = [];
  for (const d of deltas) {
    if (d.previous === 0 && d.current === 0) continue;
    const pct = Math.round(d.percentChange * 100);
    if (pct === 0) continue;
    insights.push(
      `You spent ${Math.abs(pct)}% ${pct > 0 ? "more" : "less"} on ${d.category.toLowerCase()} compared to last month.`,
    );
  }

  const sub = deltas.find((d) => d.category === "SUBSCRIPTIONS");
  if (sub && sub.current > 0) {
    const savings = sub.current * 0.1 * 12;
    insights.push(`Reducing subscription costs by 10% saves about $${savings.toFixed(2)} per year.`);
  }

  return NextResponse.json({
    month,
    previousMonth: prev,
    deltas,
    forecast: { totalSoFar, dayOfMonth, daysInMonth: dim, endOfMonth: forecast },
    insights,
  });
}

