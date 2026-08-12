import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DayStatus } from "./heatmap-calendar";

export function RecentDaysList({ days }: { days: { date: string; status: DayStatus | null }[] }) {
  return (
    <div className="space-y-2">
      {days.map(({ date, status }) => {
        const hasActivity = !!status && status.total > 0;
        const failed = hasActivity && status.failed > 0;
        const complete = hasActivity && !failed && status.completed === status.total;

        return (
          <Link
            key={date}
            href={`/history/${date}`}
            className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5 text-sm shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="font-medium">{format(new Date(date), "EEEE, MMM d")}</span>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                !hasActivity && "bg-muted text-muted-foreground",
                hasActivity && !failed && !complete && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                complete && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                failed && "bg-destructive/10 text-destructive",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  !hasActivity && "bg-muted-foreground/40",
                  hasActivity && !failed && "bg-amber-500",
                  failed && "bg-destructive",
                )}
              />
              {!hasActivity ? "No tasks" : failed ? "Failed" : `${status.completed}/${status.total} done`}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
