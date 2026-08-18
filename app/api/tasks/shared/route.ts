import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sharedTaskCreateSchema } from "@/lib/validations";
import { dayStart } from "@/lib/date";
import { safeJson } from "@/lib/api";
import { getUnresolvedMandatoryPenalty } from "@/lib/session";
import { getBuddyIds } from "@/lib/buddy";
import { sendPushToUser } from "@/lib/push";

// Co-op/Shared Task: creates two normal, single-owner DailyTask rows (one
// per partner) linked by a new SharedTaskGroup — see prisma/schema.prisma
// for why two linked rows instead of one two-owner row.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const blockingPenalty = await getUnresolvedMandatoryPenalty(session.user.id);
  if (blockingPenalty) {
    return NextResponse.json(
      { error: "Complete your pending penalty task before adding new tasks.", reason: "MANDATORY_TASK" },
      { status: 423 },
    );
  }

  const body = await safeJson(request);
  const parsed = sharedTaskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { title, description, scheduledDate, dueTime, category, buddyUserId, completionMode } = parsed.data;

  const buddyIds = await getBuddyIds(session.user.id);
  if (!buddyIds.includes(buddyUserId)) {
    return NextResponse.json({ error: "Not one of your connected buddies" }, { status: 403 });
  }

  const scheduled = dayStart(scheduledDate);
  const sharedTaskData = {
    title,
    description,
    dueTime,
    category,
    proofRequired: true,
    scheduledDate: scheduled,
  };

  const [group, myTask] = await prisma.$transaction(async (tx) => {
    const group = await tx.sharedTaskGroup.create({ data: { completionMode } });
    const myTask = await tx.dailyTask.create({
      data: { ...sharedTaskData, userId: session.user.id, sharedGroupId: group.id },
    });
    await tx.dailyTask.create({
      data: { ...sharedTaskData, userId: buddyUserId, sharedGroupId: group.id },
    });
    return [group, myTask];
  });

  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
  await sendPushToUser(buddyUserId, {
    title: "New shared task",
    body: `${me?.name} added a shared task with you: "${title}"`,
    url: "/dashboard",
  });

  return NextResponse.json({ ...myTask, sharedGroup: group }, { status: 201 });
}
