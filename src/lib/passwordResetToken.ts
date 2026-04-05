import { createHash, randomBytes } from "crypto";

export const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;

export function generatePasswordResetSecret(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashPasswordResetToken(raw) };
}

export function hashPasswordResetToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}
