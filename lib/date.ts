import { startOfDay, endOfDay, format, parseISO } from "date-fns";

// The whole app deliberately works off the server's local midnight as the
// single global cut-off (documented MVP limitation — no per-user timezone).
export function todayStart(): Date {
  return startOfDay(new Date());
}

export function todayEnd(): Date {
  return endOfDay(new Date());
}

export function dayStart(date: Date | string): Date {
  return startOfDay(typeof date === "string" ? parseISO(date) : date);
}

export function dayEnd(date: Date | string): Date {
  return endOfDay(typeof date === "string" ? parseISO(date) : date);
}

export function dateKey(date: Date | string): string {
  return format(typeof date === "string" ? parseISO(date) : date, "yyyy-MM-dd");
}

export function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

// How long after creation a task/goal can still be outright deleted (as
// opposed to just edited/postponed) — long enough to undo a typo or
// duplicate, short enough that it can't be used to dodge a day's
// accountability by deleting a task hours after creating it.
export const DELETE_GRACE_PERIOD_MS = 10 * 60 * 1000;

export function isWithinDeleteWindow(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() <= DELETE_GRACE_PERIOD_MS;
}
