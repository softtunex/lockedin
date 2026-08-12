import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskUpdateSchema } from "@/lib/validations";
import { dayStart } from "@/lib/date";
import { safeJson } from "@/lib/api";
import { getUnresolvedMandatoryPenalty } from "@/lib/session";

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

  const { title, description, status, scheduledDate } = parsed.data;

  // Snoozing ("Do Later") only makes sense from PENDING and always clears
  // any penalty/mute state on the task since it's being actively rescheduled.
  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
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
  if (status !== undefined) data.status = status;

  const task = await prisma.dailyTask.update({ where: { id }, data });
  return NextResponse.json(task);
}
