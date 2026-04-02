import type { BankImportMapping } from "@/lib/bankImportMapping";
import { parseBankImportMappingJson } from "@/lib/bankImportMapping";
import { prisma } from "@/lib/prisma";

export async function resolveBankImportMappingForUser(
  userId: string,
  profileId: unknown,
): Promise<{ mapping: BankImportMapping | null; error: string | null }> {
  const id = typeof profileId === "string" ? profileId.trim() : "";
  if (!id) return { mapping: null, error: null };

  const profile = await prisma.bankImportProfile.findFirst({
    where: { id, userId },
  });
  if (!profile) return { mapping: null, error: "Bank profile not found." };

  const mapping = parseBankImportMappingJson(profile.mapping);
  if (!mapping) return { mapping: null, error: "Stored profile mapping is invalid." };

  return { mapping, error: null };
}
