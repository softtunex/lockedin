import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buddyRequestSchema } from "@/lib/validations";
import { safeJson } from "@/lib/api";
import { sendPushToUser } from "@/lib/push";
import { sendEmail } from "@/lib/email";

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
    const recipient = await prisma.user.findUnique({ where: { id: toUserId }, select: { email: true } });
    await sendPushToUser(toUserId, {
      title: "LockedIn Buddy Request",
      body: `${sender?.name} wants to be your accountability partner.`,
      url: "/buddy",
    });
    if (recipient?.email) {
      await sendEmail({
        to: recipient.email,
        subject: `${sender?.name} invited you to be their accountability partner`,
        body: `${sender?.name} wants to pair up on LockedIn. Open the app and check your Buddy Hub to accept: ${process.env.NEXTAUTH_URL}/buddy`,
      });
    }
  } else if (toEmail) {
    await sendEmail({
      to: toEmail,
      subject: `${sender?.name} invited you to be their accountability partner`,
      body: `Join LockedIn and pair up: /invite/${invite.inviteCode}`,
    });
  }

  return NextResponse.json(invite, { status: 201 });
}
