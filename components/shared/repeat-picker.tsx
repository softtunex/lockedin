"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { WEEKDAY_CODES, type ScheduleRule, type WeekdayCode } from "@/lib/schedule";

const WEEKDAY_SHORT: Record<WeekdayCode, string> = {
  SUN: "S",
  MON: "M",
  TUE: "T",
  WED: "W",
  THU: "T",
  FRI: "F",
  SAT: "S",
};

type Mode = "ONCE" | "DAILY" | "EVERY_X_DAYS" | "WEEKLY";

const MODE_LABELS: Record<Mode, string> = {
  ONCE: "Does not repeat (Once)",
  DAILY: "Every day",
  EVERY_X_DAYS: "Every X days",
  WEEKLY: "Specific days of week",
};

// `value: null` means "does not repeat" — only meaningful when `allowOnce`
// is true (the standalone Add Task form). Goal-wizard steps always recur,
// so they never pass allowOnce and never see a null value.
export function RepeatPicker({
  value,
  onChange,
  allowOnce = false,
  anchorDate,
}: {
  value: ScheduleRule | null;
  onChange: (value: ScheduleRule | null) => void;
  allowOnce?: boolean;
  anchorDate: string; // yyyy-MM-dd, used as the EVERY_X_DAYS anchor
}) {
  const mode: Mode = value === null ? "ONCE" : value.frequency;

  function setMode(next: Mode) {
    switch (next) {
      case "ONCE":
        onChange(null);
        break;
      case "DAILY":
        onChange({ frequency: "DAILY" });
        break;
      case "EVERY_X_DAYS":
        onChange({ frequency: "EVERY_X_DAYS", intervalDays: 2, anchorDate });
        break;
      case "WEEKLY":
        onChange({ frequency: "WEEKLY", daysOfWeek: [] });
        break;
    }
  }

  function toggleWeekday(day: WeekdayCode) {
    if (!value || value.frequency !== "WEEKLY") return;
    const has = value.daysOfWeek.includes(day);
    onChange({
      frequency: "WEEKLY",
      daysOfWeek: has ? value.daysOfWeek.filter((d) => d !== day) : [...value.daysOfWeek, day],
    });
  }

  return (
    <div className="space-y-2">
      <Select value={mode} onValueChange={(v) => setMode((v ?? "DAILY") as Mode)}>
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue placeholder="Repeat">{(v) => MODE_LABELS[(v as Mode) ?? "DAILY"]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allowOnce && <SelectItem value="ONCE">Does not repeat (Once)</SelectItem>}
          <SelectItem value="DAILY">Every day</SelectItem>
          <SelectItem value="EVERY_X_DAYS">Every X days</SelectItem>
          <SelectItem value="WEEKLY">Specific days of week</SelectItem>
        </SelectContent>
      </Select>

      {value?.frequency === "EVERY_X_DAYS" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Every
          <Input
            type="number"
            min={1}
            max={365}
            className="h-8 w-16"
            value={value.intervalDays}
            onChange={(e) =>
              onChange({
                frequency: "EVERY_X_DAYS",
                intervalDays: Math.max(1, Number(e.target.value) || 1),
                anchorDate: value.anchorDate,
              })
            }
          />
          days
        </div>
      )}

      {value?.frequency === "WEEKLY" && (
        <div className="flex gap-1.5">
          {WEEKDAY_CODES.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleWeekday(day)}
              aria-pressed={value.daysOfWeek.includes(day)}
              aria-label={day}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                value.daysOfWeek.includes(day)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              {WEEKDAY_SHORT[day]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
