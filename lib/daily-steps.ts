import { prisma } from "./prisma";
import { todayStart, todayEnd, dayStart } from "./date";
import { SINGLE_TASK_TIMEFRAMES } from "./enums";
import { isScheduledOn, type ScheduleRule } from "./schedule";

export type StepTemplate = {
  id: string;
  title: string;
  description?: string;
  schedule: ScheduleRule;
  // Duration — bounds within which the step's schedule applies. Both
  // optional ("yyyy-MM-dd"); an unset bound falls back to the goal's own
  // start/end date, which is already enforced by the goal-level query in
  // ensureTodayStepsForActiveGoals.
  startDate?: string;
  endDate?: string;
  // Informational "HH:mm" carried onto each materialized DailyTask's
  // dueTime — display-only, doesn't change the day-granular deadline.
  timeOfDay?: string;
};

// Goals created before scheduled steps existed have templates stored as
// plain { title, description } JSON, with no id/schedule. Backfill both
// deterministically (id from title, so dedup stays stable across calls)
// rather than migrating the JSON blob — schedule defaults to DAILY, which
// matches their implicit behavior before this feature existed.
export function normalizeStepTemplate(raw: Partial<StepTemplate> & { title: string }): StepTemplate {
  return {
    id: raw.id ?? `legacy:${raw.title}`,
    title: raw.title,
    description: raw.description,
    schedule: raw.schedule ?? { frequency: "DAILY" },
    startDate: raw.startDate,
    endDate: raw.endDate,
    timeOfDay: raw.timeOfDay,
  };
}

function isDue(template: StepTemplate, date: Date): boolean {
  if (template.startDate && dayStart(date) < dayStart(template.startDate)) return false;
  if (template.endDate && dayStart(date) > dayStart(template.endDate)) return false;
  return isScheduledOn(template.schedule, date);
}

// Long-term goals store their recurring daily action steps as JSON templates
// (Goal.dailyStepTemplates) rather than pre-creating a DailyTask row for
// every day between start and end. This materializes today's row for each
// template the first time it's needed (goal creation, or the next dashboard
// load on a new day) — idempotent, safe to call repeatedly. Only templates
// whose schedule is due today (and within their own start/end duration, if
// set) are materialized — e.g. a Mon/Wed/Fri step stays absent from Today's
// Execution List on a Tuesday, and a step with an endDate stops
// materializing after it.
export async function ensureTodayStepsForActiveGoals(userId: string): Promise<void> {
  const today = todayStart();

  const goals = await prisma.goal.findMany({
    where: {
      userId,
      status: "ACTIVE",
      timeframe: { notIn: [...SINGLE_TASK_TIMEFRAMES] },
      startDate: { lte: todayEnd() },
      endDate: { gte: today },
    },
  });

  for (const goal of goals) {
    const templates = (JSON.parse(goal.dailyStepTemplates || "[]") as StepTemplate[]).map(normalizeStepTemplate);
    if (templates.length === 0) continue;

    const dueToday = templates.filter((t) => isDue(t, today));
    if (dueToday.length === 0) continue;

    // A step is still "in flight" if it has any PENDING/POSTPONED task,
    // regardless of that task's date — a snoozed step moves to a future
    // date but must NOT also get a fresh instance materialized for today,
    // or "Do Later" would immediately duplicate itself on the next load.
    // Only materialize a new instance once the prior one is resolved
    // (COMPLETED/FAILED_PENALIZED) or never existed. Keyed by stepTemplateId
    // (a stable id), not title, so renaming a step doesn't break dedup.
    const inFlight = await prisma.dailyTask.findMany({
      where: { parentGoalId: goal.id, status: { in: ["PENDING", "POSTPONED"] } },
      select: { stepTemplateId: true },
    });
    const inFlightIds = new Set(inFlight.map((t) => t.stepTemplateId));

    const missing = dueToday.filter((t) => !inFlightIds.has(t.id));
    if (missing.length === 0) continue;

    await prisma.dailyTask.createMany({
      data: missing.map((t) => ({
        userId,
        parentGoalId: goal.id,
        stepTemplateId: t.id,
        title: t.title,
        description: t.description,
        dueTime: t.timeOfDay,
        scheduledDate: today,
      })),
    });
  }
}

export async function materializeStepsForGoalToday(
  userId: string,
  goalId: string,
  templates: StepTemplate[],
  scheduledDate: Date = todayStart(),
): Promise<void> {
  const dueToday = templates.filter((t) => isDue(t, scheduledDate));
  if (dueToday.length === 0) return;
  await prisma.dailyTask.createMany({
    data: dueToday.map((t) => ({
      userId,
      parentGoalId: goalId,
      stepTemplateId: t.id,
      title: t.title,
      description: t.description,
      dueTime: t.timeOfDay,
      scheduledDate: dayStart(scheduledDate),
    })),
  });
}
