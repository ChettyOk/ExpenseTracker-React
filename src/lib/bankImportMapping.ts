import { z } from "zod";

/** Column mapping for a bank CSV. Header names match the file’s first row (case-insensitive). */
export const bankImportMappingSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("amount"),
    dateHeader: z.string().min(1).max(120),
    descriptionHeader: z.string().min(1).max(120),
    amountHeader: z.string().min(1).max(120),
    amountPolarity: z
      .enum(["negative_expense", "positive_expense"])
      .optional()
      .default("negative_expense"),
  }),
  z.object({
    mode: z.literal("debit_credit"),
    dateHeader: z.string().min(1).max(120),
    descriptionHeader: z.string().min(1).max(120),
    debitHeader: z.string().min(1).max(120),
    creditHeader: z.string().max(120).optional(),
  }),
]);

export type BankImportMapping = z.infer<typeof bankImportMappingSchema>;

export function parseBankImportMappingJson(raw: unknown): BankImportMapping | null {
  const p = bankImportMappingSchema.safeParse(raw);
  return p.success ? p.data : null;
}
