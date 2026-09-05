import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { safeJson } from "@/lib/api";
import { sendNotificationEmail } from "@/lib/email";

const GENERIC_MESSAGE = "If an account exists for that email, we've sent a reset link.";

export async function POST(request: Request) {
  const body = await safeJson(request);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (user) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });

    await sendNotificationEmail({
      to: user.email,
      heading: "Reset your LockedIn password",
      body: "We got a request to reset your password. This link expires in 1 hour — if you didn't ask for this, you can safely ignore this email.",
      ctaLabel: "Reset password",
      ctaUrl: `/reset-password/${token}`,
    });
  }

  // Same response whether or not the email matched an account, so this
  // endpoint can't be used to enumerate registered emails.
  return NextResponse.json({ message: GENERIC_MESSAGE });
}
