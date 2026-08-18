import type { Metadata } from "next";
import Link from "next/link";
import { addMonths, addDays, format, parse, startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { type DayStatus } from "@/components/history/heatmap-calendar";
import { HistoryViewToggle } from "@/components/history/history-view-toggle";
import { GoalCard } from "@/components/goals/goal-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SINGLE_TASK_TIMEFRAMES } from "@/lib/enums";
import { todayStart } from "@/lib/date";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireOnboardedUser();
  const { month: monthParam } = await searchParams;
  const month = monthParam ? parse(monthParam, "yyyy-MM", new Date()) : new Date();

  const tasks = await prisma.dailyTask.findMany({
    where: {
      userId: user.id,
      scheduledDate: { gte: startOfMonth(month), lte: endOfMonth(month) },
    },
  });

  const statusByDate: Record<string, DayStatus> = {};
  for (const task of tasks) {
    const key = format(task.scheduledDate, "yyyy-MM-dd");
    const entry = statusByDate[key] ?? { completed: 0, failed: 0, total: 0 };
    entry.total += 1;
    if (task.status === "COMPLETED") entry.completed += 1;
    if (task.status === "FAILED_PENALIZED") entry.failed += 1;
    statusByDate[key] = entry;
  }

  const recentDates = [0, 1, 2].map((n) => addDays(todayStart(), -n));
  const recentTasks = await prisma.dailyTask.findMany({
    where: {
      userId: user.id,
      scheduledDate: { gte: recentDates[2], lte: recentDates[0] },
    },
  });
  const recentStatusByDate: Record<string, DayStatus> = {};
  for (const task of recentTasks) {
    const key = format(task.scheduledDate, "yyyy-MM-dd");
    const entry = recentStatusByDate[key] ?? { completed: 0, failed: 0, total: 0 };
    entry.total += 1;
    if (task.status === "COMPLETED") entry.completed += 1;
    if (task.status === "FAILED_PENALIZED") entry.failed += 1;
    recentStatusByDate[key] = entry;
  }
  const recentDays = recentDates.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return { date: key, status: recentStatusByDate[key] ?? null };
  });

  const activeGoals = await prisma.goal.findMany({
    where: { userId: user.id, status: "ACTIVE", timeframe: { notIn: [...SINGLE_TASK_TIMEFRAMES] } },
    include: { tasks: true },
    orderBy: { createdAt: "desc" },
  });

  const prevMonth = format(addMonths(month, -1), "yyyy-MM");
  const nextMonth = format(addMonths(month, 1), "yyyy-MM");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="mt-1 text-muted-foreground">Every day, tracked. No deleting the record.</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{format(month, "MMMM yyyy")}</CardTitle>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
              {user.currentStreak} Day Streak
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              render={<Link href={`/history?month=${prevMonth}`} aria-label="Previous month" />}
              nativeButton={false}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              render={<Link href={`/history?month=${nextMonth}`} aria-label="Next month" />}
              nativeButton={false}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <HistoryViewToggle month={month} statusByDate={statusByDate} recentDays={recentDays} />
        </CardContent>
      </Card>

      {activeGoals.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Long-term goal progress</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} variant="row" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
