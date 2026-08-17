import { prisma } from "./prisma";
import { todayStart } from "./date";
import { isScheduledOn, type ScheduleRule } from "./schedule";

// Standalone recurring habits (not tied to a goal) — same "materialize
// today's occurrence" idea as lib/daily-steps.ts's
// ensureTodayStepsForActiveGoals, just keyed off RecurringTaskTemplate
// instead of a goal's embedded step JSON. Called on dashboard load (and
// right after a template is created) so a user never has to retype a daily
// habit — the app generates it automatically the first time it's needed
// on a scheduled day.
export async function ensureTodayTasksForRecurringTemplates(userId: string): Promise<void> {
  const today = todayStart();

  const templates = await prisma.recurringTaskTemplate.findMany({
    where: { userId, isActive: true, anchorDate: { lte: today } },
  });

  const dueToday = templates.filter((t) => isScheduledOn(templateToScheduleRule(t), today));
  if (dueToday.length === 0) return;

  const inFlight = await prisma.dailyTask.findMany({
    where: { userId, recurringTemplateId: { not: null }, status: { in: ["PENDING", "POSTPONED"] } },
    select: { recurringTemplateId: true },
  });
  const inFlightIds = new Set(inFlight.map((t) => t.recurringTemplateId));

  const missing = dueToday.filter((t) => !inFlightIds.has(t.id));
  if (missing.length === 0) return;

  await prisma.dailyTask.createMany({
    data: missing.map((t) => ({
      userId,
      recurringTemplateId: t.id,
      title: t.title,
      description: t.description,
      dueTime: t.notificationTime,
      scheduledDate: today,
    })),
  });
}

function templateToScheduleRule(template: {
  frequency: string;
  intervalDays: number | null;
  daysOfWeek: string | null;
  anchorDate: Date;
}): ScheduleRule {
  switch (template.frequency) {
    case "EVERY_X_DAYS":
      return {
        frequency: "EVERY_X_DAYS",
        intervalDays: template.intervalDays ?? 1,
        anchorDate: template.anchorDate.toISOString(),
      };
    case "WEEKLY":
      return { frequency: "WEEKLY", daysOfWeek: JSON.parse(template.daysOfWeek || "[]") };
    default:
      return { frequency: "DAILY" };
  }
}
