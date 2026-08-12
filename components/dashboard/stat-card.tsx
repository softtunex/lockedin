import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  mono = true,
  className,
  iconClassName,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "destructive";
  mono?: boolean;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md",
        tone === "success" && "border-amber-200 bg-amber-50",
        tone === "destructive" && "border-destructive/30 bg-destructive/5",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {Icon && (
          <Icon
            className={cn(
              "h-3.5 w-3.5",
              tone === "success" && "text-amber-600",
              tone === "destructive" && "text-destructive",
              iconClassName,
            )}
          />
        )}
        {label}
      </div>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold",
          mono && "font-mono tabular-nums",
          tone === "success" && "text-amber-600",
          tone === "destructive" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}
