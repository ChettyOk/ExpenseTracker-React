import nodemailer from "nodemailer";

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

function buildMessage(rawToken: string): { resetUrl: string; subject: string; html: string } {
  const resetUrl = `${appOrigin()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const subject = "Reset your Expense Tracker password";
  const html = `
    <p>You asked to reset your password.</p>
    <p><a href="${escapeHtml(resetUrl)}">Set a new password</a></p>
    <p>If you did not request this, you can ignore this email. The link expires in one hour.</p>
    <p style="font-size:12px;color:#64748b">${escapeHtml(resetUrl)}</p>
  `.trim();
  return { resetUrl, subject, html };
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
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
    return false;
  }
  return true;
}

async function sendViaSmtp(to: string, subject: string, html: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return false;

  const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure =
    process.env.SMTP_SECURE === "true" || port === 465 || process.env.SMTP_SECURE === "1";
  const from = process.env.SMTP_FROM ?? user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({ from, to, subject, html });
    return true;
  } catch (e) {
    console.error("[sendPasswordResetEmail] SMTP:", e);
    return false;
  }
}

/**
 * Sends the reset link via, in order:
 * 1. Resend (`RESEND_API_KEY`)
 * 2. SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`; optional `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`)
 * 3. Development: logs the URL to the server console
 */
export async function sendPasswordResetEmail(
  to: string,
  rawToken: string,
): Promise<{
  ok: boolean;
  reason?: "resend_error" | "smtp_error" | "not_configured";
}> {
  const { subject, html } = buildMessage(rawToken);

  if (process.env.RESEND_API_KEY) {
    const ok = await sendViaResend(to, subject, html);
    return ok ? { ok: true } : { ok: false, reason: "resend_error" };
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    const ok = await sendViaSmtp(to, subject, html);
    return ok ? { ok: true } : { ok: false, reason: "smtp_error" };
  }

  if (process.env.NODE_ENV === "development") {
    const { resetUrl } = buildMessage(rawToken);
    console.info("[sendPasswordResetEmail] Dev mode — no RESEND_API_KEY or SMTP; reset URL:");
    console.info(resetUrl);
    return { ok: true };
  }

  console.error(
    "[sendPasswordResetEmail] Set RESEND_API_KEY or SMTP_HOST + SMTP_USER + SMTP_PASSWORD for outbound email.",
  );
  return { ok: false, reason: "not_configured" };
}
