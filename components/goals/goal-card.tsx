import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoalProgressBar } from "@/components/goals/goal-progress-bar";
import { TIMEFRAME_LABELS, type Timeframe } from "@/lib/enums";
import type { Goal, DailyTask } from "@/generated/prisma/client";

type GoalWithTasks = Goal & { tasks: DailyTask[] };

// "tile": full card — title/badge header, optional description, progress.
// "row": compact bordered row — title/badge/progress only, no description.
// Both link to the goal's detail page. Single source of truth for what was
// previously three near-identical copies (goals list, history page,
// dashboard sidebar's Momentum panel).
export function GoalCard({ goal, variant = "tile" }: { goal: GoalWithTasks; variant?: "tile" | "row" }) {
  const completed = goal.tasks.filter((t) => t.status === "COMPLETED").length;
  const timeframeLabel = TIMEFRAME_LABELS[goal.timeframe as Timeframe];

  if (variant === "row") {
    return (
      <Link href={`/goals/${goal.id}`}>
        <Card className="border-border/50 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{goal.title}</p>
              <span className="text-xs text-muted-foreground">{timeframeLabel}</span>
            </div>
            <GoalProgressBar completed={completed} total={goal.tasks.length} />
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/goals/${goal.id}`}>
      <Card className="h-full border-border/50 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{goal.title}</CardTitle>
            <Badge variant={goal.status === "ACTIVE" ? "default" : "secondary"}>{timeframeLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {goal.description && <p className="line-clamp-2 text-sm text-muted-foreground">{goal.description}</p>}
          <GoalProgressBar completed={completed} total={goal.tasks.length} />
        </CardContent>
      </Card>
    </Link>
  );
}
