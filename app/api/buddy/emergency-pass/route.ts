import { NextResponse } from "next/server";
import { startOfWeek } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emergencyPassRequestSchema } from "@/lib/validations";
import { safeJson } from "@/lib/api";
import { sendPushToUser } from "@/lib/push";
import { getBuddyIds } from "@/lib/buddy";

const WEEKLY_PASS_LIMIT = 1;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await safeJson(request);
  const parsed = emergencyPassRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const buddyIds = await getBuddyIds(session.user.id);
  if (!buddyIds.includes(parsed.data.buddyUserId)) {
    return NextResponse.json({ error: "Not one of your connected buddies" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });

  const task = await prisma.dailyTask.findFirst({
    where: { id: parsed.data.dailyTaskId, userId: session.user.id },
  });
  if (!task || (task.status !== "PENDING" && task.status !== "POSTPONED")) {
    return NextResponse.json({ error: "This task can't be excused" }, { status: 400 });
  }

  const usedThisWeek = await prisma.emergencyPassUse.count({
    where: {
      userId: session.user.id,
      status: { not: "DECLINED" },
      requestedAt: { gte: startOfWeek(new Date(), { weekStartsOn: 0 }) },
    },
  });
  if (usedThisWeek >= WEEKLY_PASS_LIMIT) {
    return NextResponse.json({ error: "You've already used your emergency pass this week" }, { status: 429 });
  }

  const use = await prisma.emergencyPassUse.create({
    data: { userId: session.user.id, buddyUserId: parsed.data.buddyUserId, dailyTaskId: task.id },
  });

  await sendPushToUser(parsed.data.buddyUserId, {
    title: "Emergency pass requested",
    body: `${user?.name} is requesting an emergency pass for "${task.title}".`,
    url: "/buddy",
  });

  return NextResponse.json(use, { status: 201 });
}

// Weekly counter (resets every Sunday at midnight) surfaced to the Buddy Hub
// UI so it can render "Emergency Pass: X/1 Available This Week".
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const usedThisWeek = await prisma.emergencyPassUse.count({
    where: {
      userId: session.user.id,
      status: { not: "DECLINED" },
      requestedAt: { gte: startOfWeek(new Date(), { weekStartsOn: 0 }) },
    },
  });

  return NextResponse.json({ used: usedThisWeek, limit: WEEKLY_PASS_LIMIT, available: Math.max(0, WEEKLY_PASS_LIMIT - usedThisWeek) });
}
