import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recurringTaskCreateSchema } from "@/lib/validations";
import { safeJson } from "@/lib/api";
import { dayStart } from "@/lib/date";
import { getUnresolvedMandatoryPenalty } from "@/lib/session";
import { ensureTodayTasksForRecurringTemplates } from "@/lib/recurring-tasks";

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
  const parsed = recurringTaskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { title, description, schedule, startDate, notificationTime } = parsed.data;

  const template = await prisma.recurringTaskTemplate.create({
    data: {
      userId: session.user.id,
      title,
      description,
      frequency: schedule.frequency,
      intervalDays: schedule.frequency === "EVERY_X_DAYS" ? schedule.intervalDays : undefined,
      daysOfWeek: schedule.frequency === "WEEKLY" ? JSON.stringify(schedule.daysOfWeek) : undefined,
      anchorDate: startDate ? dayStart(startDate) : dayStart(new Date()),
      notificationTime,
    },
  });

  await ensureTodayTasksForRecurringTemplates(session.user.id);

  return NextResponse.json(template, { status: 201 });
}
