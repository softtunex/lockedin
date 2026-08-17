import { prisma } from "./prisma";
import { todayStart, todayEnd, dayStart } from "./date";
import { SINGLE_TASK_TIMEFRAMES } from "./enums";
import { isScheduledOn, type ScheduleRule } from "./schedule";

export type StepTemplate = {
  id: string;
  title: string;
  description?: string;
  // null means "does not repeat" — a single occurrence on startDate only.
  schedule: ScheduleRule | null;
  // The date this step starts applying from, and (for ONCE) the exact date
  // it occurs on. Optional only for pre-existing templates created before
  // this was a required field — normalizeStepTemplate never fabricates one.
  startDate?: string;
  // Stops materializing after this date. Unset means "whenever the goal
  // itself ends."
  endDate?: string;
  // "HH:mm" — carried onto each materialized DailyTask's dueTime, which is
  // what actually triggers that occurrence's push reminder (see
  // lib/push.ts). Optional — no time set means no reminder for this step.
  notificationTime?: string;
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
    schedule: raw.schedule === undefined ? { frequency: "DAILY" } : raw.schedule,
    startDate: raw.startDate,
    endDate: raw.endDate,
    notificationTime: raw.notificationTime,
  };
}

function isDue(template: StepTemplate, date: Date): boolean {
  if (template.startDate && dayStart(date) < dayStart(template.startDate)) return false;
  if (template.endDate && dayStart(date) > dayStart(template.endDate)) return false;
  if (template.schedule === null) {
    return Boolean(template.startDate) && dayStart(date).getTime() === dayStart(template.startDate!).getTime();
  }
  return isScheduledOn(template.schedule, date);
}

// Long-term goals store their recurring daily action steps as JSON templates
// (Goal.dailyStepTemplates) rather than pre-creating a DailyTask row for
// every day between start and end. This materializes today's row for each
// template the first time it's needed (goal creation, or the next dashboard
// load on a new day) — idempotent, safe to call repeatedly. Only templates
// due today (per their schedule, start/end bounds, and — for a
// does-not-repeat step — an exact date match) are materialized.
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
        dueTime: t.notificationTime,
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
      dueTime: t.notificationTime,
      scheduledDate: dayStart(scheduledDate),
    })),
  });
}
