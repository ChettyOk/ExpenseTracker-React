import { NextResponse } from "next/server";

import {
  EXPENSE_EXPORT_BATCH_SIZE,
  expenseOrderByWithStableId,
  expenseWhereForUser,
  parseExpenseListQuery,
} from "@/lib/expenseQuery";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/apiAuth";
import { rowToCsv } from "@/lib/csvEscape";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = parseExpenseListQuery(url);
  const where = expenseWhereForUser(user.id, q);
  const orderBy = expenseOrderByWithStableId(q.sortBy, q.sortDir);

  const header = rowToCsv(["date", "amount", "category", "description", "id"]);
  const filename = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode(`${header}\r\n`));

      let cursorId: string | undefined;
      const take = EXPENSE_EXPORT_BATCH_SIZE;

      try {
        while (true) {
          const batch = await prisma.expense.findMany({
            where,
            orderBy,
            take,
            skip: cursorId ? 1 : 0,
            cursor: cursorId ? { id: cursorId } : undefined,
            select: {
              id: true,
              date: true,
              amount: true,
              category: true,
              description: true,
            },
          });

          if (batch.length === 0) break;

          const lines = batch.map((e) =>
            rowToCsv([
              e.date.toISOString().slice(0, 10),
              e.amount.toString(),
              e.category,
              e.description ?? "",
              e.id,
            ]),
          );
          controller.enqueue(enc.encode(`${lines.join("\r\n")}\r\n`));

          const last = batch[batch.length - 1];
          cursorId = last?.id;
          if (batch.length < take) break;
        }
        controller.close();
      } catch (err) {
        controller.error(err instanceof Error ? err : new Error("Export failed"));
      }
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
