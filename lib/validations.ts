import { z } from "zod";
import {
  SELECTABLE_PENALTY_PREFERENCES,
  PROOF_TYPES,
  TASK_STATUSES,
  TIMEFRAMES,
  SHARED_COMPLETION_MODES,
  isSingleTaskTimeframe,
} from "./enums";
import { WEEKDAY_CODES } from "./schedule";

export const scheduleRuleSchema = z.discriminatedUnion("frequency", [
  z.object({ frequency: z.literal("DAILY") }),
  z.object({
    frequency: z.literal("EVERY_X_DAYS"),
    intervalDays: z.coerce.number().int().min(1).max(365),
    anchorDate: z.string().min(1),
  }),
  z.object({
    frequency: z.literal("WEEKLY"),
    daysOfWeek: z.array(z.enum(WEEKDAY_CODES)).min(1, "Pick at least one day"),
  }),
]);

export const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(80),
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const onboardingSchema = z.object({
  penaltyPreference: z.enum(SELECTABLE_PENALTY_PREFERENCES),
  accountabilityEmail: z.string().email().optional().or(z.literal("")),
  penaltyStakeAmount: z.coerce.number().min(0).optional(),
  // Optional funds to add to the wallet in the same request — how a brand
  // new user (walletBalance always starts at 0) can actually afford to
  // enable Financial Stake during onboarding, before the Settings wallet
  // panel exists in their world yet.
  walletTopUp: z.coerce.number().min(0).optional(),
});

const notificationTimeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);

export const dailyStepInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "Step title is required"),
  description: z.string().optional(),
  // null = does not repeat (a single occurrence on startDate).
  schedule: scheduleRuleSchema.nullable().default({ frequency: "DAILY" }),
  // The date this step starts applying from — and, for a does-not-repeat
  // step, the exact date it occurs on. Defaults to today server-side if
  // omitted.
  startDate: z.string().optional(),
  // Stops materializing after this date. Unset means "whenever the goal
  // itself ends."
  endDate: z.string().optional(),
  // "HH:mm" — when set, this step's materialized task gets a push
  // notification at this time (see lib/push.ts).
  notificationTime: notificationTimeSchema.optional(),
});

// Same shape, without `id` — used to append a step to an already-created
// goal (the server assigns a fresh id, see app/api/goals/[id]/steps/route.ts).
export const addGoalStepSchema = dailyStepInputSchema.omit({ id: true });

export const goalCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(140),
  description: z.string().optional(),
  timeframe: z.enum(TIMEFRAMES),
  startDate: z.string(),
  endDate: z.string(),
  targetCompletionDate: z.string().optional(),
  dailySteps: z.array(dailyStepInputSchema).default([]),
}).superRefine((data, ctx) => {
  if (!isSingleTaskTimeframe(data.timeframe) && data.dailySteps.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one daily action step is required for non-daily goals",
      path: ["dailySteps"],
    });
  }
});

export const taskCreateSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().optional(),
  scheduledDate: z.string(),
  parentGoalId: z.string().optional(),
  // "HH:mm" — when set, this task gets a push notification at this time.
  dueTime: notificationTimeSchema.optional(),
  category: z.string().max(60).optional(),
  proofRequired: z.boolean().default(true),
});

export const recurringTaskCreateSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().optional(),
  schedule: scheduleRuleSchema,
  // Date this recurrence starts counting from. Defaults to today
  // server-side if omitted.
  startDate: z.string().optional(),
  notificationTime: notificationTimeSchema.optional(),
  category: z.string().max(60).optional(),
  proofRequired: z.boolean().default(true),
});

// Batch Mode: one line of pasted/typed text per task, all one-off (no
// recurrence — that would defeat the point of a fast multi-task paste) and
// sharing the same date/category/proof-required setting.
export const batchTaskCreateSchema = z.object({
  titles: z.array(z.string().min(1).max(140)).min(1, "Add at least one task").max(50, "50 tasks at a time, max"),
  scheduledDate: z.string(),
  category: z.string().max(60).optional(),
  proofRequired: z.boolean().default(true),
});

// Co-op/Shared Task — always proof-required (there's nothing to jointly
// verify otherwise) and never recurring (each occurrence is created fresh,
// same reasoning as batch mode).
export const sharedTaskCreateSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().optional(),
  scheduledDate: z.string(),
  dueTime: notificationTimeSchema.optional(),
  category: z.string().max(60).optional(),
  buddyUserId: z.string().min(1),
  completionMode: z.enum(SHARED_COMPLETION_MODES).default("INDEPENDENT"),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(1).max(140).optional(),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  scheduledDate: z.string().optional(),
  // Accepts "" to explicitly clear an existing notification time.
  dueTime: z.union([notificationTimeSchema, z.literal("")]).optional(),
});

export const proofSubmitSchema = z.object({
  proofType: z.enum(PROOF_TYPES),
  proofData: z.string().min(1, "Proof content is required"),
});

export const walletTopupSchema = z.object({
  amount: z.coerce.number().min(1, "Enter an amount").max(1_000_000, "That's too large"),
});

export const buddyRequestSchema = z
  .object({
    toUserId: z.string().min(1).optional(),
    toEmail: z.string().email().optional(),
  })
  .refine((data) => Boolean(data.toUserId) !== Boolean(data.toEmail), {
    message: "Provide either a user to invite or an email address, not both",
  });

export const buddyInviteActionSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export const assignPenaltyTaskSchema = z.object({
  title: z.string().min(1, "Give the task a title").max(140),
  description: z.string().optional(),
});

export const buddyProofActionSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    reason: z.string().max(300).optional(),
  })
  .refine((data) => data.action !== "reject" || Boolean(data.reason?.trim()), {
    message: "Please provide a reason for rejecting this proof",
    path: ["reason"],
  });

export const emergencyPassRequestSchema = z.object({
  dailyTaskId: z.string().min(1),
  buddyUserId: z.string().min(1),
});

export const emergencyPassActionSchema = z.object({
  action: z.enum(["approve", "decline"]),
});

export const buddyMessageSchema = z.object({
  toUserId: z.string().min(1),
  message: z.string().min(1, "Message can't be empty").max(300, "Keep it under 300 characters"),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});
