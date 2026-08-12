import { BADGE_CATALOG, type BadgeKey } from "@/lib/badge-catalog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Footprints,
  CheckCircle2,
  Medal,
  Trophy,
  Flame,
  Target,
  RotateCcw,
  Lock,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Footprints,
  CheckCircle2,
  Medal,
  Trophy,
  Flame,
  Target,
  RotateCcw,
};

export function BadgesGrid({ earned }: { earned: { badgeKey: string; earnedAt: Date }[] }) {
  const earnedMap = new Map(earned.map((b) => [b.badgeKey, b.earnedAt]));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {(Object.keys(BADGE_CATALOG) as BadgeKey[]).map((key) => {
        const badge = BADGE_CATALOG[key];
        const earnedAt = earnedMap.get(key);
        const Icon = ICONS[badge.icon] ?? Trophy;

        return (
          <div
            key={key}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 text-center",
              earnedAt ? "bg-amber-50" : "opacity-50",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                earnedAt ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground",
              )}
            >
              {earnedAt ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
            </div>
            <p className="text-xs font-semibold">{badge.label}</p>
            <p className="text-[11px] text-muted-foreground">{badge.description}</p>
            {earnedAt && (
              <p className="text-[10px] font-medium text-amber-600">{format(earnedAt, "MMM d, yyyy")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
