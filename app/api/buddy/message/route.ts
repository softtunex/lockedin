import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buddyMessageSchema } from "@/lib/validations";
import { safeJson } from "@/lib/api";
import { sendPushToUser } from "@/lib/push";
import { getBuddyIds } from "@/lib/buddy";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await safeJson(request);
  const parsed = buddyMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const buddyIds = await getBuddyIds(session.user.id);
  if (!buddyIds.includes(parsed.data.toUserId)) {
    return NextResponse.json({ error: "Not one of your connected buddies" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });

  const buddyMessage = await prisma.buddyMessage.create({
    data: { fromUserId: session.user.id, toUserId: parsed.data.toUserId, message: parsed.data.message },
  });

  await sendPushToUser(parsed.data.toUserId, {
    title: `Message from ${user?.name}`,
    body: parsed.data.message,
    url: "/buddy",
  });

  return NextResponse.json(buddyMessage, { status: 201 });
}
