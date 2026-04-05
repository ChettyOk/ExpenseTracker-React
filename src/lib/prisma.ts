import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { postgresUrlForDriver } from "./postgresUrlForDriver";

const pool = new Pool({
  connectionString: postgresUrlForDriver(process.env.DATABASE_URL),
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function clientSchemaIsCurrent(client: PrismaClient): boolean {
  const c = client as unknown as Record<string, { findMany?: unknown } | undefined>;
  return (
    typeof c.categoryLearnedRule?.findMany === "function" &&
    typeof c.userCategoryRule?.findMany === "function" &&
    typeof c.bankImportProfile?.findMany === "function" &&
    typeof c.passwordResetToken?.findMany === "function"
  );
}

/**
 * Returns a PrismaClient that matches the current generated schema.
 * Replaces a cached instance when it predates a `prisma generate` (common in Next.js dev).
 */
function resolvePrisma(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing && !clientSchemaIsCurrent(existing)) {
    void existing.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  const client = globalForPrisma.prisma;
  if (!clientSchemaIsCurrent(client)) {
    throw new Error(
      "Prisma Client is out of date. Run `npx prisma generate`, apply migrations (`npx prisma migrate dev`), then restart the dev server.",
    );
  }

  return client;
}

/**
 * Lazy proxy so every access runs `resolvePrisma()` — avoids stale `globalThis.prisma` after schema changes.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = resolvePrisma();
    const value = Reflect.get(client as object, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
