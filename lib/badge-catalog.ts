// Pure data — safe to import from client components (toast copy) as well
// as server code (lib/badges.ts). Must never import lib/prisma.ts here:
// that pulls the pg client into the client bundle.
export type BadgeKey =
  | "FIRST_TASK"
  | "TASKS_10"
  | "TASKS_50"
  | "TASKS_100"
  | "STREAK_3"
  | "STREAK_7"
  | "STREAK_30"
  | "FIRST_GOAL"
  | "COMEBACK";

export const BADGE_CATALOG: Record<BadgeKey, { label: string; description: string; icon: string }> = {
  FIRST_TASK: { label: "First Steps", description: "Completed your first task with proof.", icon: "Footprints" },
  TASKS_10: { label: "Getting Started", description: "Completed 10 tasks.", icon: "CheckCircle2" },
  TASKS_50: { label: "Half Century", description: "Completed 50 tasks.", icon: "Medal" },
  TASKS_100: { label: "Century Club", description: "Completed 100 tasks.", icon: "Trophy" },
  STREAK_3: { label: "On a Roll", description: "Reached a 3-day streak.", icon: "Flame" },
  STREAK_7: { label: "Week Warrior", description: "Reached a 7-day streak.", icon: "Flame" },
  STREAK_30: { label: "Iron Will", description: "Reached a 30-day streak.", icon: "Flame" },
  FIRST_GOAL: { label: "Goal Setter", description: "Created your first goal.", icon: "Target" },
  COMEBACK: { label: "Comeback", description: "Bounced back from a mandatory penalty task.", icon: "RotateCcw" },
};
