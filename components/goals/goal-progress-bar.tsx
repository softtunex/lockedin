import { Progress } from "@/components/ui/progress";

export function GoalProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {completed} / {total} steps completed
        </span>
        <span>{pct}%</span>
      </div>
      <Progress value={pct} />
    </div>
  );
}
