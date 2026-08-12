import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { goalCreateSchema } from "@/lib/validations";
import { materializeStepsForGoalToday } from "@/lib/daily-steps";
import { getUnresolvedMandatoryPenalty, getWalletDeficit } from "@/lib/session";
import { formatNaira } from "@/lib/currency";
import { dayStart, todayStart } from "@/lib/date";
import { safeJson } from "@/lib/api";
import { checkAndAwardBadges } from "@/lib/badges";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id },
    include: { tasks: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(goals);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const blockingPenalty = await getUnresolvedMandatoryPenalty(session.user.id);
  if (blockingPenalty) {
    return NextResponse.json(
      { error: "Complete your pending penalty task before creating new goals.", reason: "MANDATORY_TASK" },
      { status: 423 },
    );
  }

  const walletDeficit = await getWalletDeficit(session.user.id);
  if (walletDeficit !== null) {
    return NextResponse.json(
      {
        error: `Your wallet is at ${formatNaira(walletDeficit)}. Settle up before creating new goals.`,
        reason: "WALLET_DEFICIT",
      },
      { status: 423 },
    );
  }

  const body = await safeJson(request);
  const parsed = goalCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { title, description, timeframe, startDate, endDate, targetCompletionDate, dailySteps } = parsed.data;

  const goal = await prisma.goal.create({
    data: {
      userId: session.user.id,
      title,
      description,
      timeframe,
      startDate: dayStart(startDate),
      endDate: dayStart(endDate),
      targetCompletionDate: targetCompletionDate ? dayStart(targetCompletionDate) : undefined,
      dailyStepTemplates: JSON.stringify(dailySteps),
    },
  });

  const goalStart = dayStart(startDate);
  const today = todayStart();
  const firstTaskDate = goalStart > today ? goalStart : today;

  if (timeframe === "DAILY" || timeframe === "TEST_10S") {
    // A standalone daily goal is itself today's task. TEST_10S is the same
    // shape but fails 10 seconds after creation instead of at midnight —
    // see lib/test-deadlines.ts.
    await prisma.dailyTask.create({
      data: {
        userId: session.user.id,
        parentGoalId: goal.id,
        title,
        description,
        scheduledDate: firstTaskDate,
        testDeadline: timeframe === "TEST_10S" ? new Date(Date.now() + 10_000) : undefined,
      },
    });
  } else if (dailySteps.length > 0 && goalStart <= today) {
    await materializeStepsForGoalToday(session.user.id, goal.id, dailySteps, firstTaskDate);
  }

  // TEST_10S goals are throwaway penalty-testing artifacts, not a real
  // "you set a goal" milestone.
  const newBadges =
    timeframe === "TEST_10S" ? [] : await checkAndAwardBadges(session.user.id, { hasGoal: true });

  return NextResponse.json({ ...goal, newBadges }, { status: 201 });
}
