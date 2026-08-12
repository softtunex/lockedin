import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({
  steps,
  currentStep,
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <div className="flex items-center">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const active = stepNum === currentStep;
        const done = stepNum < currentStep;
        return (
          <div key={label} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  active && "border-primary bg-primary text-primary-foreground",
                  done && "border-primary bg-primary text-primary-foreground",
                  !active && !done && "border-border bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  (active || done) ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("mx-2 h-0.5 flex-1 rounded-full", done ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
