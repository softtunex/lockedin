import { prisma } from "./prisma";
import { type BadgeKey } from "./badge-catalog";

export type { BadgeKey } from "./badge-catalog";
export { BADGE_CATALOG } from "./badge-catalog";

type BadgeSignals = {
  completedTaskCount?: number;
  longestStreak?: number;
  hasGoal?: boolean;
  comeback?: boolean;
};

function candidateKeys(signals: BadgeSignals): BadgeKey[] {
  const keys: BadgeKey[] = [];
  if (signals.completedTaskCount !== undefined) {
    if (signals.completedTaskCount >= 1) keys.push("FIRST_TASK");
    if (signals.completedTaskCount >= 10) keys.push("TASKS_10");
    if (signals.completedTaskCount >= 50) keys.push("TASKS_50");
    if (signals.completedTaskCount >= 100) keys.push("TASKS_100");
  }
  if (signals.longestStreak !== undefined) {
    if (signals.longestStreak >= 3) keys.push("STREAK_3");
    if (signals.longestStreak >= 7) keys.push("STREAK_7");
    if (signals.longestStreak >= 30) keys.push("STREAK_30");
  }
  if (signals.hasGoal) keys.push("FIRST_GOAL");
  if (signals.comeback) keys.push("COMEBACK");
  return keys;
}

// Evaluates only the signals passed in against the catalog's thresholds and
// inserts any newly-qualifying UserBadge rows (the unique (userId, badgeKey)
// constraint makes re-checking an already-earned badge a safe no-op).
// Returns the keys that were newly awarded by this call, for toasting.
export async function checkAndAwardBadges(userId: string, signals: BadgeSignals): Promise<BadgeKey[]> {
  const candidates = candidateKeys(signals);
  if (candidates.length === 0) return [];

  const existing = await prisma.userBadge.findMany({
    where: { userId, badgeKey: { in: candidates } },
    select: { badgeKey: true },
  });
  const already = new Set(existing.map((b) => b.badgeKey));
  const toAward = candidates.filter((k) => !already.has(k));
  if (toAward.length === 0) return [];

  // skipDuplicates isn't supported on SQLite — the `already` filter above
  // already prevents re-inserting an earned badge in the normal request
  // flow, this createMany only ever sees genuinely-new keys.
  await prisma.userBadge.createMany({
    data: toAward.map((badgeKey) => ({ userId, badgeKey })),
  });

  return toAward as BadgeKey[];
}

// checkAndAwardBadges only ever sees the signal(s) relevant to whatever
// action just happened (a task completed, a goal was created, ...), so any
// milestone reached *before* a given badge existed in the catalog — or
// before this call site was added — silently never gets checked. This
// recomputes every signal from the user's full history and re-runs the
// check, so it's safe (and cheap enough) to call on every Settings page
// load: already-earned badges are always skipped via the unique
// constraint, so it only ever fills real gaps.
export async function backfillBadgesFromHistory(userId: string): Promise<BadgeKey[]> {
  const [user, completedTaskCount, hasGoal, comeback] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { longestStreak: true } }),
    prisma.dailyTask.count({ where: { userId, status: "COMPLETED" } }),
    prisma.goal.findFirst({ where: { userId, timeframe: { not: "TEST_10S" } }, select: { id: true } }),
    prisma.penaltyLog.findFirst({
      where: { userId, penaltyType: "MANDATORY_TASK", isResolved: true },
      select: { id: true },
    }),
  ]);

  return checkAndAwardBadges(userId, {
    completedTaskCount,
    longestStreak: user?.longestStreak ?? 0,
    hasGoal: !!hasGoal,
    comeback: !!comeback,
  });
}
