"use client";

import { useMsUntilMidnight, formatCountdown } from "@/lib/use-midnight-countdown";
import { cn } from "@/lib/utils";

export function MidnightCountdown() {
  const remaining = useMsUntilMidnight();
  if (remaining === null) return null;

  const urgent = remaining < 60 * 60 * 1000;

  return (
    <div className="text-right">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Time Until Midnight (Local)
      </p>
      <p
        className={cn(
          "font-mono text-2xl font-semibold tabular-nums",
          urgent ? "text-destructive" : "text-foreground",
        )}
      >
        {formatCountdown(remaining)}
      </p>
    </div>
  );
}
