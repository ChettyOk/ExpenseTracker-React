import { describe, expect, it } from "vitest";

import { bankRecordsToExpenseCandidates } from "./parseBankCsv";
import { detectCsvSeparator, parseCsvToRecords } from "./parseCsvRecords";

describe("detectCsvSeparator", () => {
  it("prefers tab when the header line has more tabs than commas", () => {
    expect(detectCsvSeparator("Posted Date\tAmount\tMemo\n")).toBe("\t");
  });

  it("prefers semicolon when dominant", () => {
    expect(detectCsvSeparator("Date;Amount;Description\n")).toBe(";");
  });
});

describe("parseCsvToRecords + bankRecordsToExpenseCandidates", () => {
  it("parses canonical bank format Date,Description,Amount", async () => {
    const csv = `Date,Description,Amount
2026-03-01,Starbucks,-8.50
2026-03-02,Uber,-14.20
2026-03-03,Walmart,-45.00
`;
    const records = await parseCsvToRecords(csv);
    const { rows, errors } = bankRecordsToExpenseCandidates(records);
    expect(errors.length).toBe(0);
    expect(rows).toHaveLength(3);
    expect(rows[0]!.amount).toBe(8.5);
    expect(rows[1]!.description).toBe("Uber");
    expect(rows[2]!.amount).toBe(45);
  });

  it("skips empty lines and positive amounts (deposits)", async () => {
    const csv = `Date,Description,Amount
2026-03-01,Payroll,1000.00

2026-03-02,Store,-5.00
`;
    const records = await parseCsvToRecords(csv);
    const { rows, errors } = bankRecordsToExpenseCandidates(records);
    expect(errors.length).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.amount).toBe(5);
  });
});
