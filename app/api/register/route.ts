import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { safeJson } from "@/lib/api";
import { sendNotificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const body = await safeJson(request);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  await sendNotificationEmail({
    to: user.email,
    heading: `Welcome to LockedIn, ${user.name.split(" ")[0]}`,
    body: "You're in. LockedIn keeps you honest with proof-of-work, real consequences for missed tasks, and an accountability buddy watching your back. Finish onboarding to set your penalty preference and start your first day.",
    ctaLabel: "Finish setup",
    ctaUrl: "/onboarding",
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
