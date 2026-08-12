import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { getBuddyIds } from "@/lib/buddy";
import { safeJson } from "@/lib/api";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await safeJson(request)) as Record<string, unknown> | null;
  const buddyUserId = typeof body?.buddyUserId === "string" ? body.buddyUserId : null;
  if (!buddyUserId) return NextResponse.json({ error: "buddyUserId is required" }, { status: 400 });

  const buddyIds = await getBuddyIds(session.user.id);
  if (!buddyIds.includes(buddyUserId)) {
    return NextResponse.json({ error: "Not one of your connected buddies" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });

  await sendPushToUser(buddyUserId, {
    title: "Nudge",
    body: `${user?.name} nudged you to get back on track.`,
    url: "/dashboard",
  });

  return NextResponse.json({ ok: true });
}
