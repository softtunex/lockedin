import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskUpdateSchema } from "@/lib/validations";
import { dayStart, isWithinDeleteWindow } from "@/lib/date";
import { safeJson } from "@/lib/api";
import { getUnresolvedMandatoryPenalty } from "@/lib/session";
import { checkAndAwardBadges } from "@/lib/badges";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.dailyTask.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await safeJson(request);
  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { title, description, status, scheduledDate, dueTime } = parsed.data;

  // Snoozing ("Do Later") only makes sense from PENDING and always clears
  // any penalty/mute state on the task since it's being actively rescheduled.
  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (dueTime !== undefined) data.dueTime = dueTime || null;
  if (scheduledDate !== undefined) {
    const blockingPenalty = await getUnresolvedMandatoryPenalty(session.user.id);
    if (blockingPenalty) {
      return NextResponse.json(
        { error: "Complete your pending penalty task before snoozing tasks.", reason: "MANDATORY_TASK" },
        { status: 423 },
      );
    }
    if (existing.lastSnoozedAt && dayStart(existing.lastSnoozedAt).getTime() === dayStart(new Date()).getTime()) {
      return NextResponse.json({ error: "You can only reschedule a task once per day." }, { status: 400 });
    }
    data.scheduledDate = dayStart(scheduledDate);
    data.status = "POSTPONED";
    data.lastSnoozedAt = new Date();
  }
  // Completing a task with no proof required — normal (proof-required)
  // completion only ever happens through app/api/tasks/[id]/proof/route.ts;
  // this path exists specifically for tasks created with proofRequired:false
  // (see components/dashboard/task-list.tsx's checkbox handler).
  let newBadges: string[] = [];
  if (status === "COMPLETED" && scheduledDate === undefined) {
    if (existing.proofRequired) {
      return NextResponse.json({ error: "This task requires proof to complete." }, { status: 400 });
    }
    if (existing.status !== "PENDING" && existing.status !== "POSTPONED") {
      return NextResponse.json({ error: "This task can't be completed from its current state." }, { status: 400 });
    }
    data.status = "COMPLETED";
    data.isMuted = true;
    const completedTaskCount = await prisma.dailyTask.count({
      where: { userId: session.user.id, status: "COMPLETED" },
    });
    newBadges = await checkAndAwardBadges(session.user.id, { completedTaskCount, comeback: false });
  } else if (status !== undefined) {
    data.status = status;
  }

  const task = await prisma.dailyTask.update({ where: { id }, data });
  return NextResponse.json({ ...task, newBadges });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.dailyTask.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Never deletable, regardless of the window — this is the task whose
  // completion clears the hard lockout (see lib/session.ts's
  // getUnresolvedMandatoryPenalty); deleting it would bypass that entirely.
  if (existing.isPenaltyTask) {
    return NextResponse.json({ error: "Penalty tasks can't be deleted." }, { status: 403 });
  }
  if (!isWithinDeleteWindow(existing.createdAt)) {
    return NextResponse.json({ error: "This task is more than 10 minutes old and can no longer be deleted." }, { status: 403 });
  }

  await prisma.dailyTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
