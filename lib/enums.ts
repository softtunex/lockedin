// SQLite has no native Prisma enum support, so these string-union "enums"
// back the String columns in prisma/schema.prisma and are the single
// source of truth for valid values across the app.

export const TIMEFRAMES = ["DAILY", "MONTHLY", "SIX_MONTHS", "YEARLY", "CUSTOM", "TEST_10S"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

// DAILY and TEST_10S are both "the goal IS today's single task" — no daily
// action steps to break down, just a different deadline mechanism (real
// midnight vs. a 10-second test timer). Everywhere else that branches on
// "long-term goal needing a breakdown" should check this instead of
// hand-rolling `timeframe !== "DAILY"`.
export const SINGLE_TASK_TIMEFRAMES = ["DAILY", "TEST_10S"] as const;
export function isSingleTaskTimeframe(timeframe: string): boolean {
  return (SINGLE_TASK_TIMEFRAMES as readonly string[]).includes(timeframe);
}

export const GOAL_STATUSES = ["ACTIVE", "COMPLETED", "FAILED"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const TASK_STATUSES = [
  "PENDING",
  "COMPLETED",
  "POSTPONED",
  "FAILED_PENALIZED",
  "EXCUSED",
  "PENDING_APPROVAL",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PROOF_TYPES = ["IMAGE", "URL", "TEXT"] as const;
export type ProofType = (typeof PROOF_TYPES)[number];

// Full historical union — includes STREAK_RESET even though it's no longer
// selectable, so old PenaltyLog rows and labels still render correctly.
export const PENALTY_TYPES = ["SHAME_POST", "MANDATORY_TASK", "STREAK_RESET", "DOUBLE_WORKLOAD", "FINANCIAL_STAKE"] as const;
export type PenaltyType = (typeof PENALTY_TYPES)[number];

// The 4 penalty preferences a user can actually choose in onboarding/settings,
// in the exact order they should be presented. Streak death is compulsory
// app-wide now (see lib/penalty-engine.ts), so it's deliberately excluded here.
export const SELECTABLE_PENALTY_PREFERENCES = [
  "MANDATORY_TASK",
  "DOUBLE_WORKLOAD",
  "SHAME_POST",
  "FINANCIAL_STAKE",
] as const;
export type SelectablePenaltyPreference = (typeof SELECTABLE_PENALTY_PREFERENCES)[number];

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  DAILY: "Daily",
  MONTHLY: "1 Month",
  SIX_MONTHS: "6 Months",
  YEARLY: "1 Year",
  CUSTOM: "Custom",
  TEST_10S: "10 Seconds (Test)",
};

export const PENALTY_LABELS: Record<PenaltyType, string> = {
  SHAME_POST: "Shame Feed (Social Wall)",
  MANDATORY_TASK: "Mandatory Penalty Task",
  STREAK_RESET: "Streak Death",
  DOUBLE_WORKLOAD: "Double Workload (Penalty Stacking)",
  FINANCIAL_STAKE: "Financial Stake",
};

export const PENALTY_DESCRIPTIONS: Record<PenaltyType, string> = {
  SHAME_POST: "A missed task is posted publicly to the in-app community feed.",
  MANDATORY_TASK:
    "You're hard-locked out of the app — no new tasks, goals, or snoozes — until you complete a randomized penalty task and your buddy approves it.",
  STREAK_RESET: "Your current streak resets to zero and a Failed Day badge appears in your history.",
  DOUBLE_WORKLOAD:
    "Tomorrow you're assigned 2 mandatory penalty tasks instead of 1 — both need buddy approval before the app unlocks.",
  FINANCIAL_STAKE: "Your configured stake amount is deducted from your wallet balance in real time — it can go negative.",
};

export const WALLET_TRANSACTION_TYPES = ["CREDIT", "DEBIT"] as const;
export type WalletTransactionType = (typeof WALLET_TRANSACTION_TYPES)[number];

export const BUDDY_ROLES = ["INVITER", "INVITEE"] as const;
export type BuddyRole = (typeof BUDDY_ROLES)[number];

export const BUDDY_INVITE_STATUSES = ["PENDING", "ACCEPTED", "DECLINED", "CANCELED"] as const;
export type BuddyInviteStatus = (typeof BUDDY_INVITE_STATUSES)[number];

export const PROOF_VERIFICATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ProofVerificationStatus = (typeof PROOF_VERIFICATION_STATUSES)[number];

export const EMERGENCY_PASS_STATUSES = ["PENDING", "APPROVED", "DECLINED"] as const;
export type EmergencyPassStatus = (typeof EMERGENCY_PASS_STATUSES)[number];

export const PENALTY_TASK_BANK = [
  "Do 50 pushups and upload a video or photo as proof.",
  "Write a 500-word reflection on why you procrastinated today.",
  "Go for a 30-minute walk or run and submit a screenshot of your tracked route/time.",
  "Clean and declutter one room in your home; upload a before/after photo.",
  "Read 20 pages of a book and summarize the key takeaway in a few sentences.",
  "Do a 10-minute cold shower or breathing exercise and describe how it felt.",
  "Write down 3 concrete changes you'll make tomorrow to hit your goals.",
  "Do 100 bodyweight squats and upload proof.",
];
