import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buddyInviteActionSchema } from "@/lib/validations";
import { safeJson } from "@/lib/api";
import { sendPushToUser } from "@/lib/push";
import { pairUsers } from "@/lib/buddy";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invite = await prisma.buddyInvite.findUnique({ where: { id } });
  if (!invite || invite.status !== "PENDING") {
    return NextResponse.json({ error: "This request is no longer available" }, { status: 404 });
  }

  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, name: true } });

  // A search-based invite must target me specifically; an email/link invite
  // can be claimed by whoever it was addressed to (or is open, toEmail null
  // would mean toUserId is already set — never both null).
  const isRecipient =
    invite.toUserId === session.user.id || (invite.toUserId === null && invite.toEmail === me?.email);
  if (!isRecipient) {
    return NextResponse.json({ error: "This request isn't addressed to you" }, { status: 403 });
  }

  const body = await safeJson(request);
  const parsed = buddyInviteActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  if (parsed.data.action === "decline") {
    const updated = await prisma.buddyInvite.update({
      where: { id },
      data: { status: "DECLINED", respondedAt: new Date(), toUserId: invite.toUserId ?? session.user.id },
    });
    return NextResponse.json(updated);
  }

  const existingPair = await prisma.buddyPair.findFirst({
    where: {
      unpairedAt: null,
      OR: [
        { user1Id: invite.fromUserId, user2Id: session.user.id },
        { user1Id: session.user.id, user2Id: invite.fromUserId },
      ],
    },
  });
  if (existingPair) {
    return NextResponse.json({ error: "You're already paired with this buddy" }, { status: 409 });
  }

  await pairUsers(invite.fromUserId, session.user.id);
  const updated = await prisma.buddyInvite.update({
    where: { id },
    data: { status: "ACCEPTED", respondedAt: new Date(), toUserId: session.user.id },
  });

  await sendPushToUser(invite.fromUserId, {
    title: "Buddy request accepted",
    body: `${me?.name} is now your accountability partner.`,
    url: "/buddy",
  });

  return NextResponse.json(updated);
}
