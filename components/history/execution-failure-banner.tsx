"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PENALTY_LABELS, type PenaltyType } from "@/lib/enums";

export function ExecutionFailureBanner({
  failedTitles,
  penaltyType,
}: {
  failedTitles: string[];
  penaltyType: PenaltyType;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  if (acknowledged || failedTitles.length === 0) return null;

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
        <AlertTriangle className="h-4 w-4" />
        Execution Failure Detected
      </div>
      <p className="mt-1 text-sm text-foreground">
        {failedTitles.length === 1
          ? `Task "${failedTitles[0]}" was marked FAILED.`
          : `${failedTitles.length} tasks were marked FAILED: ${failedTitles.join(", ")}.`}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-destructive/20 bg-background px-3 py-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Assigned Penalty
          </p>
          <p className="text-sm font-semibold">{PENALTY_LABELS[penaltyType]}</p>
        </div>
        <Button variant="destructive-solid" size="sm" onClick={() => setAcknowledged(true)}>
          Acknowledge
        </Button>
      </div>
    </div>
  );
}
