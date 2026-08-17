import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoalProgressBar } from "@/components/goals/goal-progress-bar";
import { AddGoalStepForm } from "@/components/goals/add-goal-step-form";
import { DeleteGoalButton } from "@/components/goals/delete-goal-button";
import { TIMEFRAME_LABELS, isSingleTaskTimeframe, type Timeframe } from "@/lib/enums";
import { normalizeStepTemplate, type StepTemplate } from "@/lib/daily-steps";
import { describeSchedule } from "@/lib/schedule";
import { isWithinDeleteWindow, dateKey, todayStart } from "@/lib/date";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Repeat, Clock3 } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-secondary text-secondary-foreground",
  COMPLETED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  POSTPONED: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  FAILED_PENALIZED: "bg-red-500/15 text-red-600 dark:text-red-400",
};

export const metadata: Metadata = { title: "Goal Details" };

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOnboardedUser();
  const { id } = await params;

  const goal = await prisma.goal.findFirst({
    where: { id, userId: user.id },
    include: { tasks: { orderBy: { scheduledDate: "desc" } } },
  });
  if (!goal) notFound();

  const completed = goal.tasks.filter((t) => t.status === "COMPLETED").length;
  const stepTemplates: StepTemplate[] = isSingleTaskTimeframe(goal.timeframe)
    ? []
    : (JSON.parse(goal.dailyStepTemplates || "[]") as StepTemplate[]).map(normalizeStepTemplate);

  const canDeleteGoal = isWithinDeleteWindow(goal.createdAt);
  const canAddSteps =
    !isSingleTaskTimeframe(goal.timeframe) && goal.status === "ACTIVE" && todayStart() <= goal.endDate;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{goal.title}</h1>
          <Badge>{TIMEFRAME_LABELS[goal.timeframe as Timeframe]}</Badge>
          <Badge variant="secondary">{goal.status}</Badge>
          {canDeleteGoal && (
            <div className="ml-auto">
              <DeleteGoalButton goalId={goal.id} />
            </div>
          )}
        </div>
        {goal.description && <p className="mt-2 text-muted-foreground">{goal.description}</p>}
        <p className="mt-1 text-sm text-muted-foreground">
          {format(goal.startDate, "MMM d, yyyy")} &rarr; {format(goal.endDate, "MMM d, yyyy")}
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <GoalProgressBar completed={completed} total={goal.tasks.length} />
        </CardContent>
      </Card>

      {!isSingleTaskTimeframe(goal.timeframe) && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Recurring steps</h2>
            {canAddSteps && (
              <AddGoalStepForm goalId={goal.id} goalStartDate={dateKey(goal.startDate)} goalEndDate={dateKey(goal.endDate)} />
            )}
          </div>
          <div className="space-y-2">
            {stepTemplates.length === 0 && (
              <p className="text-sm text-muted-foreground">No recurring steps yet.</p>
            )}
            {stepTemplates.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-4">
                  <p className="text-sm font-medium">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                      <Repeat className="h-3 w-3" /> {describeSchedule(t.schedule)}
                    </span>
                    {t.notificationTime && (
                      <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                        <Clock3 className="h-3 w-3" /> Notify {t.notificationTime}
                      </span>
                    )}
                    {(t.startDate || t.endDate) && (
                      <span className="rounded-full bg-secondary px-2 py-0.5">
                        {t.startDate ? format(new Date(t.startDate), "MMM d") : format(goal.startDate, "MMM d")}
                        {" → "}
                        {t.endDate ? format(new Date(t.endDate), "MMM d") : format(goal.endDate, "MMM d")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">History</h2>
        <div className="space-y-2">
          {goal.tasks.length === 0 && (
            <p className="text-sm text-muted-foreground">No task instances recorded yet.</p>
          )}
          {goal.tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between rounded-md border bg-background px-4 py-2.5"
            >
              <div>
                <p className={cn("text-sm font-medium", task.status === "COMPLETED" && "line-through opacity-60")}>
                  {task.title}
                </p>
                <p className="text-xs text-muted-foreground">{format(task.scheduledDate, "EEE, MMM d")}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLES[task.status])}>
                {task.status.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
