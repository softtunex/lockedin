import { differenceInCalendarDays, getDay } from "date-fns";
import { dayStart } from "@/lib/date";

// "SUN".."SAT" — matches date-fns's getDay() index (0=Sun..6=Sat).
export const WEEKDAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
export type WeekdayCode = (typeof WEEKDAY_CODES)[number];

export type ScheduleRule =
  | { frequency: "DAILY" }
  | { frequency: "EVERY_X_DAYS"; intervalDays: number; anchorDate: string } // yyyy-MM-dd
  | { frequency: "WEEKLY"; daysOfWeek: WeekdayCode[] };

// Whether an occurrence governed by `rule` falls on `date`.
// EVERY_X_DAYS counts forward from the rule's anchorDate so the cadence
// never drifts, regardless of when this is evaluated.
export function isScheduledOn(rule: ScheduleRule, date: Date): boolean {
  switch (rule.frequency) {
    case "DAILY":
      return true;
    case "EVERY_X_DAYS": {
      if (rule.intervalDays < 1) return false;
      const daysSinceAnchor = differenceInCalendarDays(dayStart(date), dayStart(rule.anchorDate));
      return daysSinceAnchor >= 0 && daysSinceAnchor % rule.intervalDays === 0;
    }
    case "WEEKLY":
      return rule.daysOfWeek.includes(WEEKDAY_CODES[getDay(date)]);
  }
}
