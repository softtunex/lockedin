import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskCreateSchema } from "@/lib/validations";
import { dayStart, dayEnd, todayStart, todayEnd } from "@/lib/date";
import { safeJson } from "@/lib/api";
import { getUnresolvedMandatoryPenalty } from "@/lib/session";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const from = dateParam ? dayStart(dateParam) : todayStart();
  const to = dateParam ? dayEnd(dateParam) : todayEnd();

  const tasks = await prisma.dailyTask.findMany({
    where: { userId: session.user.id, scheduledDate: { gte: from, lte: to } },
    include: { proofs: true, parentGoal: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(tasks);
}

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
  const parsed = taskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { title, description, scheduledDate, parentGoalId } = parsed.data;

  if (parentGoalId) {
    const goal = await prisma.goal.findFirst({ where: { id: parentGoalId, userId: session.user.id } });
    if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const task = await prisma.dailyTask.create({
    data: {
      userId: session.user.id,
      title,
      description,
      scheduledDate: dayStart(scheduledDate),
      parentGoalId: parentGoalId ?? null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
