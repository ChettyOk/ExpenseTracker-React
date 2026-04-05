import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { hashPasswordResetToken } from "@/lib/passwordResetToken";

const bodySchema = z.object({
  token: z.string().min(32),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid token or password (use at least 8 characters)." },
        { status: 400 },
      );
    }

    const { token: rawToken, password } = parsed.data;
    const tokenHash = hashPasswordResetToken(rawToken);

    const row = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true },
    });

    if (!row || row.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Request a new one." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.deleteMany({ where: { userId: row.userId } }),
    ]);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json(
      { error: "Could not reset password. Please try again." },
      { status: 500 },
    );
  }
}
