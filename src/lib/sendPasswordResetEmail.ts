function appOrigin(): string {
  const u = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return u.replace(/\/$/, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends the reset link via Resend when `RESEND_API_KEY` is set.
 * In development without Resend, logs the URL to the server console.
 */
export async function sendPasswordResetEmail(
  to: string,
  rawToken: string,
): Promise<{ ok: boolean; reason?: "resend_error" | "not_configured" }> {
  const resetUrl = `${appOrigin()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const subject = "Reset your Expense Tracker password";
  const html = `
    <p>You asked to reset your password.</p>
    <p><a href="${escapeHtml(resetUrl)}">Set a new password</a></p>
    <p>If you did not request this, you can ignore this email. The link expires in one hour.</p>
    <p style="font-size:12px;color:#64748b">${escapeHtml(resetUrl)}</p>
  `.trim();

  if (process.env.RESEND_API_KEY) {
    const from =
      process.env.RESEND_FROM ?? "Expense Tracker <onboarding@resend.dev>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[sendPasswordResetEmail] Resend:", res.status, text);
      return { ok: false, reason: "resend_error" };
    }
    return { ok: true };
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[sendPasswordResetEmail] Dev mode (set RESEND_API_KEY to send real mail):");
    console.info(resetUrl);
    return { ok: true };
  }

  console.error(
    "[sendPasswordResetEmail] Production requires RESEND_API_KEY (or configure another provider).",
  );
  return { ok: false, reason: "not_configured" };
}
