import Link from "next/link";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isFuture,
  isSameMonth,
  startOfMonth,
} from "date-fns";
import { cn } from "@/lib/utils";

export type DayStatus = { completed: number; failed: number; total: number };

// Steps 0-1 are light amber (dark text reads better on them); 2-4 are dark
// enough for white text — see the lightText computation below.
const AMBER_SCALE = ["bg-amber-100", "bg-amber-300", "bg-amber-500", "bg-amber-600", "bg-amber-700"];

function intensityStep(status: DayStatus): number {
  const ratio = status.completed / status.total;
  return Math.min(AMBER_SCALE.length - 1, Math.floor(ratio * AMBER_SCALE.length));
}

export function HeatmapCalendar({
  month,
  statusByDate,
}: {
  month: Date;
  statusByDate: Record<string, DayStatus>;
}) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const leadingBlanks = getDay(start);

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-0.5 text-center text-[9px] font-semibold uppercase text-muted-foreground sm:gap-1 sm:text-[11px]">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const status = statusByDate[key];
          const future = isFuture(day);
          const inMonth = isSameMonth(day, month);
          const hasActivity = !future && !!status && status.total > 0;
          const step = hasActivity ? intensityStep(status) : -1;
          const colorClass = !hasActivity
            ? "bg-muted"
            : status.failed > 0
              ? "bg-destructive"
              : AMBER_SCALE[step];
          const lightText = hasActivity && (status.failed > 0 || step >= 2);

          return (
            <Link
              key={key}
              href={`/history/${key}`}
              className={cn(
                "flex aspect-square items-center justify-center rounded-sm text-[9px] font-medium transition-colors sm:text-[11px]",
                colorClass,
                lightText ? "text-white/90" : "text-muted-foreground",
                !inMonth && "opacity-40",
                future && "pointer-events-none opacity-30",
              )}
              title={status ? `${status.completed}/${status.total} completed` : "No data"}
            >
              {format(day, "d")}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
