/**
 * Node's `pg` / pg-connection-string currently map prefer/require/verify-ca to verify-full;
 * future major versions will follow libpq semantics instead.
 * Use verify-full explicitly to avoid deprecation warnings and keep strict TLS.
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
export function postgresUrlForDriver(connectionString: string | undefined): string | undefined {
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
