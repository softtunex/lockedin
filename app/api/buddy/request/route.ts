import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buddyRequestSchema } from "@/lib/validations";
import { safeJson } from "@/lib/api";
import { notifyUser } from "@/lib/notify";
import { sendNotificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await safeJson(request);
  const parsed = buddyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const sender = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
  const { toUserId, toEmail } = parsed.data;

  if (toUserId === session.user.id) {
    return NextResponse.json({ error: "You can't invite yourself" }, { status: 400 });
  }

  const invite = await prisma.buddyInvite.create({
    data: { fromUserId: session.user.id, toUserId, toEmail },
  });

  if (toUserId) {
    await notifyUser(toUserId, {
      title: "LockedIn Buddy Request",
      body: `${sender?.name} wants to be your accountability partner.`,
      url: "/buddy",
      ctaLabel: "Review request",
    });
  } else if (toEmail) {
    await sendNotificationEmail({
      to: toEmail,
      heading: `${sender?.name} invited you to be their accountability partner`,
      body: `${sender?.name} wants to pair up on LockedIn — a strict to-do app that keeps you honest with proof-of-work and real consequences for missed tasks.`,
      ctaLabel: "Accept invite",
      ctaUrl: `/invite/${invite.inviteCode}`,
    });
  }

  return NextResponse.json(invite, { status: 201 });
}
