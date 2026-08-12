"use client";

import { useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { useMsUntilMidnight, formatCountdown } from "@/lib/use-midnight-countdown";
import { Target, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Task = { id: string; title: string };

export function BuddyTasksToday({ total, tasks }: { total: number; tasks: Task[] }) {
  const [expanded, setExpanded] = useState(false);
  const remaining = tasks.length;
  const msRemaining = useMsUntilMidnight();

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        disabled={total === 0}
        className="w-full text-left disabled:cursor-default"
      >
        <StatCard
          label="Tasks Left Today"
          value={total === 0 ? "No tasks" : `${remaining} of ${total}`}
          icon={Target}
          tone={total > 0 && remaining === 0 ? "success" : "default"}
        />
      </button>

      {expanded && (
        tasks.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="truncate">{t.title}</span>
                <span className="ml-2 shrink-0 font-mono text-xs text-muted-foreground">
                  {msRemaining !== null ? `${formatCountdown(msRemaining)} left` : "—"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">All caught up — nothing pending today.</p>
        )
      )}

      {total > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
          {expanded ? "Hide" : "Show"} tasks
        </button>
      )}
    </div>
  );
}
