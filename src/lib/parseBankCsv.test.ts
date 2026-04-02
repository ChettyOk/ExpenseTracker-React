import { describe, expect, it } from "vitest";

import type { BankImportMapping } from "./bankImportMapping";
import {
  bankCsvToExpenseCandidates,
  bankRecordsToExpenseCandidatesFromPdfExtracted,
  bankRecordsToExpenseCandidates,
  bankRecordsToExpenseCandidatesWithMapping,
  parseCsvToMatrix,
} from "./parseBankCsv";
import { parseCsvToRecords } from "./parseCsvRecords";

describe("parseCsvToMatrix", () => {
  it("parses quoted commas", () => {
    const m = parseCsvToMatrix(`a,"b,c",d\n`);
    expect(m).toEqual([["a", "b,c", "d"]]);
  });
});

describe("bankCsvToExpenseCandidates", () => {
  it("maps amount column with negative debits", () => {
    const matrix = [
      ["Date", "Description", "Amount"],
      ["2025-01-15", "STARBUCKS STORE", "-5.25"],
      ["2025-01-16", "PAYROLL DEPOSIT", "2000.00"],
    ];
    const { rows, errors } = bankCsvToExpenseCandidates(matrix);
    expect(errors.length).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.amount).toBe(5.25);
    expect(rows[0]!.description).toBe("STARBUCKS STORE");
  });

  it("explains when the file is a customer list, not bank transactions", async () => {
    const records = await parseCsvToRecords(
      `Index,Customer Id,First Name,Last Name,Company,Email
1,c1,Ann,Smith,Acme,ann@example.com
`,
    );
    const { rows, errors } = bankRecordsToExpenseCandidates(records);
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/customer or contact export/i);
    expect(errors[0]).toMatch(/bank/i);
  });

  it("infers amount column names like Amount (CAD)", async () => {
    const records = await parseCsvToRecords(
      "Posted Date,Transaction Narrative,Amount (CAD)\n2025-01-15,COFFEE,-4.50\n",
    );
    const { rows, errors } = bankRecordsToExpenseCandidates(records);
    expect(errors.length).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.amount).toBe(4.5);
    expect(rows[0]!.description).toBe("COFFEE");
  });

  it("maps debit column", () => {
    const matrix = [
      ["Posting Date", "Payee", "Debit", "Credit"],
      ["01/20/2025", "Shell", "42.10", ""],
    ];
    const { rows, errors } = bankCsvToExpenseCandidates(matrix);
    expect(errors.length).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.amount).toBe(42.1);
  });

  it("accepts negative debit amounts and dash placeholders in credit", () => {
    const matrix = [
      ["Date", "Memo", "Debit", "Credit"],
      ["2025-01-10", "Store A", "-12.50", "—"],
      ["2025-01-11", "Payroll", "", "500.00"],
    ];
    const { rows, errors } = bankCsvToExpenseCandidates(matrix);
    expect(errors.length).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.amount).toBe(12.5);
  });

  it("treats negative credit as spending when debit is empty", () => {
    const matrix = [
      ["Date", "Payee", "Debit", "Credit"],
      ["2025-02-01", "Fee", "", "-3.25"],
    ];
    const { rows, errors } = bankCsvToExpenseCandidates(matrix);
    expect(errors.length).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.amount).toBe(3.25);
  });

  it("parses YYYY/MM/DD and DD-Mon-YYYY dates", async () => {
    const csv = `Date,Memo,Amount
2026/03/01,Alpha,-1
15-Mar-2026,Beta,-2
`;
    const records = await parseCsvToRecords(csv);
    const { rows, errors } = bankRecordsToExpenseCandidates(records);
    expect(errors.length).toBe(0);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.amount).sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it("imports positive-only amount CSVs as spending when no negatives appear", async () => {
    const csv = `Date,Description,Amount
2026-01-05,Gas,45
2026-01-06,Lunch,12
`;
    const records = await parseCsvToRecords(csv);
    const { rows, errors } = bankRecordsToExpenseCandidates(records);
    expect(rows).toHaveLength(2);
    expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(57);
    expect(errors.some((e) => /All amounts.*positive/i.test(e))).toBe(true);
  });

  it("recognizes Deposits / Withdrawls (common bank typo) column pairs", async () => {
    const csv = `Date,Description,Deposits,Withdrawls,Balance
20-Aug-2020,NEFT,"23,237.00",00.00,"37,243.31"
20-Aug-2020,NEFT,00.00,"3,724.33","33,518.98"
20-Aug-2020,ATM,00.00,"50.00","100.00"
`;
    const records = await parseCsvToRecords(csv);
    const { rows, errors } = bankRecordsToExpenseCandidates(records);
    expect(errors.length).toBe(0);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.amount).sort((a, b) => a - b)).toEqual([50, 3724.33]);
  });

  it("parses whole-dollar amounts in the Amount column", async () => {
    const csv = `Date,Vendor,Amount
2026-02-01,Shop,-99
`;
    const records = await parseCsvToRecords(csv);
    const { rows, errors } = bankRecordsToExpenseCandidates(records);
    expect(errors.length).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.amount).toBe(99);
  });
});

describe("bankRecordsToExpenseCandidatesFromPdfExtracted", () => {
  it("treats negative amounts as spending when they dominate the extract", () => {
    const records = [
      { Date: "2025-01-10", Description: "Debit A", Amount: "-10.00" },
      { Date: "2025-01-11", Description: "Debit B", Amount: "-5.50" },
      { Date: "2025-01-12", Description: "Salary", Amount: "2000.00" },
    ];
    const { rows, errors } = bankRecordsToExpenseCandidatesFromPdfExtracted(records);
    expect(errors.length).toBeGreaterThan(0);
    expect(rows.map((r) => r.amount).sort((a, b) => a - b)).toEqual([5.5, 10]);
  });
});

describe("bankRecordsToExpenseCandidatesWithMapping", () => {
  it("parses using explicit headers", () => {
    const records = [{ "Posting Date": "2025-01-01", Memo: "Store", Amt: "-5.00" }];
    const mapping: BankImportMapping = {
      mode: "amount",
      dateHeader: "Posting Date",
      descriptionHeader: "Memo",
      amountHeader: "Amt",
      amountPolarity: "negative_expense",
    };
    const { rows, errors } = bankRecordsToExpenseCandidatesWithMapping(records, mapping);
    expect(errors.length).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.amount).toBe(5);
  });
});
