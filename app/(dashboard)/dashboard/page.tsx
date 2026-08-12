import type { Metadata } from "next";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser, getUnresolvedMandatoryPenalty } from "@/lib/session";
import { ensureTodayStepsForActiveGoals } from "@/lib/daily-steps";
import { ensureTodayTasksForRecurringTemplates } from "@/lib/recurring-tasks";
import { todayStart, todayEnd } from "@/lib/date";
import { MidnightCountdown } from "@/components/dashboard/midnight-countdown";
import { AddTaskForm } from "@/components/dashboard/add-task-form";
import { TaskList, type TaskWithProofs } from "@/components/dashboard/task-list";
import { MomentumPanel } from "@/components/dashboard/momentum-panel";
import { DailyProtocolCard } from "@/components/dashboard/daily-protocol-card";
import { SINGLE_TASK_TIMEFRAMES } from "@/lib/enums";

export const metadata: Metadata = { title: "Today" };

export default async function DashboardPage() {
  const user = await requireOnboardedUser();
  await Promise.all([ensureTodayStepsForActiveGoals(user.id), ensureTodayTasksForRecurringTemplates(user.id)]);

  const [tasks, longTermGoals, unresolvedMandatoryPenalty] = await Promise.all([
    prisma.dailyTask.findMany({
      where: { userId: user.id, scheduledDate: { gte: todayStart(), lte: todayEnd() } },
      include: { proofs: { orderBy: { submittedAt: "desc" } }, parentGoal: true },
      orderBy: { createdAt: "asc" },
    }) as Promise<TaskWithProofs[]>,
    prisma.goal.findMany({
      where: { userId: user.id, status: "ACTIVE", timeframe: { notIn: [...SINGLE_TASK_TIMEFRAMES] } },
      include: { tasks: true },
      orderBy: { createdAt: "desc" },
    }),
    getUnresolvedMandatoryPenalty(user.id),
  ]);

  const locked = Boolean(unresolvedMandatoryPenalty);
  const pendingCount = tasks.filter((t) => t.status === "PENDING" || t.status === "POSTPONED").length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Current Execution Window
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{format(new Date(), "EEE, MMM d")}</h1>
        </div>
        <MidnightCountdown />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold tracking-tight">Today&apos;s Execution List</h2>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              {pendingCount} Task{pendingCount === 1 ? "" : "s"} Remaining
            </span>
          </div>

          <AddTaskForm locked={locked} />
          <TaskList initialTasks={tasks} locked={locked} />
        </div>

        <div className="space-y-4">
          <MomentumPanel goals={longTermGoals} />
          <DailyProtocolCard />
        </div>
      </div>
    </div>
  );
}
