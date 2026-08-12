import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoalProgressBar } from "@/components/goals/goal-progress-bar";
import { TIMEFRAME_LABELS, type Timeframe } from "@/lib/enums";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{goal.title}</h1>
          <Badge>{TIMEFRAME_LABELS[goal.timeframe as Timeframe]}</Badge>
          <Badge variant="secondary">{goal.status}</Badge>
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

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Daily action steps</h2>
        <div className="space-y-2">
          {goal.tasks.length === 0 && (
            <p className="text-sm text-muted-foreground">No daily steps recorded yet.</p>
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
