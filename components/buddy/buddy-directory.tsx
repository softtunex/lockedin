"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

export type BuddySummary = {
  id: string;
  name: string;
  currentStreak: number;
  pendingCount: number;
};

// Server-renders every connected buddy's full detail panel up front (buddy
// counts are small in practice) and just toggles which one is visible —
// avoids a client-side fetch route for something this small, mirrors the
// History page's Month/3-Day toggle pattern.
export function BuddyDirectory({ buddies, panels }: { buddies: BuddySummary[]; panels: Record<string, ReactNode> }) {
  const [selectedId, setSelectedId] = useState(buddies[0]?.id ?? null);

  if (buddies.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0">
        {buddies.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setSelectedId(b.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors sm:w-full",
              selectedId === b.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-accent",
            )}
          >
            <span
              className={cn("h-2 w-2 shrink-0 rounded-full", b.pendingCount > 0 ? "bg-amber-500" : "bg-emerald-500")}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{b.name}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Flame className="h-3 w-3" /> {b.currentStreak}d streak
              </span>
            </span>
            {b.pendingCount > 0 && (
              <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                {b.pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="min-w-0">
        {buddies.map((b) => (
          <div key={b.id} className={cn(selectedId === b.id ? "block" : "hidden")}>
            {panels[b.id]}
          </div>
        ))}
      </div>
    </div>
  );
}
