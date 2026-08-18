import type { Metadata } from "next";
import { format, subDays, addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser, getUnresolvedMandatoryPenalty } from "@/lib/session";
import { ensureTodayStepsForActiveGoals } from "@/lib/daily-steps";
import { ensureTodayTasksForRecurringTemplates } from "@/lib/recurring-tasks";
import { todayStart, todayEnd } from "@/lib/date";
import { MidnightCountdown } from "@/components/dashboard/midnight-countdown";
import { AddTaskModal } from "@/components/dashboard/add-task-modal";
import { TaskList, type TaskWithProofs } from "@/components/dashboard/task-list";
import { CollapsibleSection } from "@/components/dashboard/collapsible-section";
import { GoalCard } from "@/components/goals/goal-card";
import { DailyProtocolCard } from "@/components/dashboard/daily-protocol-card";
import { SINGLE_TASK_TIMEFRAMES } from "@/lib/enums";
import { AlertCircle, CalendarDays, FolderKanban } from "lucide-react";

export const metadata: Metadata = { title: "Today" };

// How far back/forward the Overdue and Upcoming buckets reach. Overdue is
// capped so a long-broken penalty-sweep cron can't produce an unbounded
// query — a persistently large Overdue bucket means the cron isn't
// running, which is a separate ops concern, not something to paper over
// here. Upcoming is capped so a user with many future one-offs doesn't
// load an unbounded list.
const OVERDUE_LOOKBACK_DAYS = 14;
const UPCOMING_LOOKAHEAD_DAYS = 30;

export default async function DashboardPage() {
  const user = await requireOnboardedUser();
  await Promise.all([ensureTodayStepsForActiveGoals(user.id), ensureTodayTasksForRecurringTemplates(user.id)]);

  const today = todayStart();
  const todayEndDate = todayEnd();

  const [allTasks, longTermGoals, unresolvedMandatoryPenalty] = await Promise.all([
    prisma.dailyTask.findMany({
      where: {
        userId: user.id,
        OR: [
          { scheduledDate: { gte: today, lte: todayEndDate } },
          {
            scheduledDate: { gte: subDays(today, OVERDUE_LOOKBACK_DAYS), lt: today },
            status: { in: ["PENDING", "POSTPONED"] },
          },
          {
            scheduledDate: { gt: todayEndDate, lte: addDays(today, UPCOMING_LOOKAHEAD_DAYS) },
            status: { in: ["PENDING", "POSTPONED"] },
          },
        ],
      },
      include: {
        proofs: { orderBy: { submittedAt: "desc" } },
        parentGoal: true,
        sharedGroup: {
          include: { tasks: { select: { id: true, userId: true, status: true, user: { select: { name: true } } } } },
        },
      },
      orderBy: { scheduledDate: "asc" },
    }) as Promise<TaskWithProofs[]>,
    prisma.goal.findMany({
      where: { userId: user.id, status: "ACTIVE", timeframe: { notIn: [...SINGLE_TASK_TIMEFRAMES] } },
      include: { tasks: true },
      orderBy: { createdAt: "desc" },
    }),
    getUnresolvedMandatoryPenalty(user.id),
  ]);

  const overdueTasks = allTasks.filter((t) => new Date(t.scheduledDate) < today);
  const todayTasks = allTasks.filter((t) => new Date(t.scheduledDate) >= today && new Date(t.scheduledDate) <= todayEndDate);
  const upcomingTasks = allTasks.filter((t) => new Date(t.scheduledDate) > todayEndDate);

  const locked = Boolean(unresolvedMandatoryPenalty);
  const pendingCount = todayTasks.filter((t) => t.status === "PENDING" || t.status === "POSTPONED").length;

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
        <div className="space-y-6">
          <AddTaskModal locked={locked} />

          {overdueTasks.length > 0 && (
            <CollapsibleSection
              title="Overdue"
              icon={<AlertCircle className="h-4 w-4 text-destructive" />}
              count={overdueTasks.length}
              defaultOpen
            >
              <TaskList initialTasks={overdueTasks} locked={locked} showDate variant="overdue" />
            </CollapsibleSection>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold tracking-tight">Today&apos;s Execution List</h2>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                {pendingCount} Task{pendingCount === 1 ? "" : "s"} Remaining
              </span>
            </div>
            <TaskList initialTasks={todayTasks} locked={locked} />
          </div>

          {upcomingTasks.length > 0 && (
            <CollapsibleSection
              title="Upcoming"
              icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
              count={upcomingTasks.length}
            >
              <TaskList initialTasks={upcomingTasks} locked={locked} showDate variant="upcoming" />
            </CollapsibleSection>
          )}

          {longTermGoals.length > 0 && (
            <CollapsibleSection
              title="Projects"
              icon={<FolderKanban className="h-4 w-4 text-muted-foreground" />}
              count={longTermGoals.length}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {longTermGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} variant="tile" />
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>

        <div className="space-y-4">
          <DailyProtocolCard />
        </div>
      </div>
    </div>
  );
}
