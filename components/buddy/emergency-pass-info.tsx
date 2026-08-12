import { ShieldCheck, Info } from "lucide-react";

export function EmergencyPassInfo({ available, limit }: { available: number; limit: number }) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-start gap-2 text-xs text-muted-foreground" title="How the Emergency Pass works">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          An Emergency Pass excuses a failed day, waives your penalty, and rescues your streak during a genuine
          real-world crisis. Caution: You only get ONE Emergency Pass per week. Your Buddy must approve the request.
        </p>
      </div>
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        Emergency Pass: {available}/{limit} Available This Week
      </p>
    </div>
  );
}
