import { describe, expect, it } from "vitest";

import { bufferLooksLikePdf, parseImportFileToRecords, pdfTextToBankRecords } from "./parseStatementImport";

describe("pdfTextToBankRecords", () => {
  it("extracts ISO date lines with trailing amount", () => {
    const text = `
      Some header noise
      2024-03-15  COFFEE SHOP DOWNTOWN   4.25
      2024-03-16  PAYROLL DEPOSIT  -2500.00
    `;
    const { records, warnings } = pdfTextToBankRecords(text);
    expect(records.length).toBeGreaterThanOrEqual(1);
    expect(records[0]).toMatchObject({
      Date: "2024-03-15",
      Description: "COFFEE SHOP DOWNTOWN",
    });
    expect(warnings.length).toBeGreaterThanOrEqual(0);
  });

  it("extracts M/D/Y style lines", () => {
    const text = "3/1/2024  UBER TRIP  12.34";
    const { records } = pdfTextToBankRecords(text);
    expect(records).toHaveLength(1);
    expect(records[0]?.Date).toBe("3/1/2024");
    expect(records[0]?.Amount).toBe("12.34");
  });

  it("returns empty with warning for blank text", () => {
    const { records, warnings } = pdfTextToBankRecords("   ");
    expect(records).toHaveLength(0);
    expect(warnings.some((w) => /image-only|PDF/i.test(w))).toBe(true);
  });

  it("extracts month-name date and optional balance column", () => {
    const { records } = pdfTextToBankRecords(
      "Mar 15, 2024  WHOLE FOODS #12  45.67  1,234.56",
    );
    expect(records).toHaveLength(1);
    expect(records[0]?.Date).toMatch(/Mar 15, 2024/);
    expect(records[0]?.Amount).toBe("45.67");
    expect(records[0]?.Description).toContain("WHOLE FOODS");
  });

  it("extracts EU dotted day-first date", () => {
    const { records } = pdfTextToBankRecords("15.03.2024 CAFE CENTRAL 3,50");
    expect(records).toHaveLength(1);
    expect(records[0]?.Date).toBe("15.03.2024");
    expect(records[0]?.Amount).toBe("3,50");
  });

  it("extracts lines with whole-dollar trailing amounts", () => {
    const { records } = pdfTextToBankRecords("2024-06-10  METRO  25");
    expect(records).toHaveLength(1);
    expect(records[0]?.Amount).toBe("25");
  });

  it("extracts amount-first lines", () => {
    const { records } = pdfTextToBankRecords("-12.34 2024-06-01 METRO FARE");
    expect(records).toHaveLength(1);
    expect(records[0]?.Amount).toBe("-12.34");
    expect(records[0]?.Description).toContain("METRO FARE");
  });

  it("bufferLooksLikePdf detects %PDF signature", () => {
    expect(bufferLooksLikePdf(Buffer.from("hello %PDF-1.4 trash"))).toBe(true);
    expect(bufferLooksLikePdf(Buffer.from("Date,Amount\n"))).toBe(false);
  });

  it("parseImportFileToRecords treats PDF magic as PDF even if named .csv", async () => {
    const pdfStub = Buffer.from(
      "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF",
      "utf8",
    );
    const file = new File([pdfStub], "bank-export.csv", { type: "text/csv" });
    const { kind, warnings } = await parseImportFileToRecords(file);
    expect(kind).toBe("pdf");
    expect(warnings.some((w) => /contents are a PDF/i.test(w))).toBe(true);
  });
});
