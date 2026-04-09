// Keep this file self-contained so `prisma generate` does not import `src/` (fewer file reads on flaky disks).
import "dotenv/config";
import { defineConfig } from "prisma/config";

function postgresUrlForDriver(connectionString: string | undefined): string | undefined {
  if (!connectionString) return connectionString;
  try {
    const u = new URL(connectionString);
    const mode = u.searchParams.get("sslmode");
    if (!mode) return connectionString;
    const lower = mode.toLowerCase();
    const legacyAlias = lower === "prefer" || lower === "require" || lower === "verify-ca";
    if (!legacyAlias) return connectionString;
    if (u.searchParams.get("uselibpqcompat") === "true") return connectionString;
    u.searchParams.set("sslmode", "verify-full");
    return u.href;
  } catch {
    return connectionString;
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: postgresUrlForDriver(process.env["DATABASE_URL"]),
  },
});
