import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { generatePasswordResetSecret, PASSWORD_RESET_EXPIRY_MS } from "@/lib/passwordResetToken";
import { sendPasswordResetEmail } from "@/lib/sendPasswordResetEmail";

const bodySchema = z.object({
  email: z.string().email(),
});

const publicMessage =
  "If an account exists for that email, we sent a link to reset your password.";

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }

    const email = parsed.data.email.trim();
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ message: publicMessage }, { status: 200 });
    }

    const { raw, hash } = generatePasswordResetSecret();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          expiresAt,
        },
      }),
    ]);

    const sent = await sendPasswordResetEmail(user.email, raw);
    if (!sent.ok) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      if (sent.reason === "not_configured") {
        return NextResponse.json(
          {
            error:
              "Password reset email is not configured. Add RESEND_API_KEY or SMTP_HOST, SMTP_USER, and SMTP_PASSWORD to your server environment.",
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: "Could not send email. Try again later." },
        { status: 502 },
      );
    }

    return NextResponse.json({ message: publicMessage }, { status: 200 });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
