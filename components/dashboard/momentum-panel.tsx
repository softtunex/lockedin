import { TrendingUp } from "lucide-react";
import { GoalProgressBar } from "@/components/goals/goal-progress-bar";
import { TIMEFRAME_LABELS, type Timeframe } from "@/lib/enums";
import type { Goal, DailyTask } from "@/generated/prisma/client";

export function MomentumPanel({ goals }: { goals: (Goal & { tasks: DailyTask[] })[] }) {
  if (goals.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center gap-1.5 text-sm font-semibold">
        <TrendingUp className="h-4 w-4 text-primary" />
        Momentum
      </div>
      <div className="space-y-4">
        {goals.map((goal) => {
          const completed = goal.tasks.filter((t) => t.status === "COMPLETED").length;
          return (
            <div key={goal.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{goal.title}</span>
                <span className="text-xs text-muted-foreground">
                  {TIMEFRAME_LABELS[goal.timeframe as Timeframe]}
                </span>
              </div>
              <GoalProgressBar completed={completed} total={goal.tasks.length} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
