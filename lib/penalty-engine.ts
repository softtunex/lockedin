import { prisma } from "./prisma";
import { dayStart, dayEnd, todayStart } from "./date";
import { PENALTY_TASK_BANK, type PenaltyType } from "./enums";
import { debitWallet, creditWallet } from "./wallet";
import { checkAndAwardBadges } from "./badges";
import { notifyBuddyOfFailure, getBuddyIds } from "./buddy";
import { addDays } from "date-fns";
import type { User } from "@/generated/prisma/client";

export type SweepResult = {
  usersProcessed: number;
  tasksPenalized: number;
};

/**
 * Sweeps the day that just ended (yesterday, relative to the server's local
 * midnight) for every user: any task still PENDING *or POSTPONED* for that
 * day is marked FAILED_PENALIZED and the user's configured consequence is
 * applied. POSTPONED is included deliberately — "Do Later" moves a task to
 * a new deadline, it doesn't grant immunity, so a task whose snoozed date
 * arrives and passes unresolved fails exactly like one that was never
 * touched. Streak accounting is universal (any failed day breaks it, a
 * fully completed day extends it) independent of the chosen penalty type —
 * the penalty type only decides what *additional* consequence fires per
 * missed task. Idempotent via User.lastSweepDate so re-running for the same
 * day (cron + worker both firing, or a retry) is a no-op.
 */
export async function runEodSweep(referenceDate: Date = new Date()): Promise<SweepResult> {
  const targetDay = dayStart(addDays(referenceDate, -1));
  const targetDayEnd = dayEnd(targetDay);

  const users = await prisma.user.findMany({
    where: {
      OR: [{ lastSweepDate: null }, { lastSweepDate: { lt: targetDay } }],
    },
  });

  let usersProcessed = 0;
  let tasksPenalized = 0;

  for (const user of users) {
    const tasks = await prisma.dailyTask.findMany({
      where: { userId: user.id, scheduledDate: { gte: targetDay, lte: targetDayEnd } },
    });

    if (tasks.length === 0) {
      await prisma.user.update({ where: { id: user.id }, data: { lastSweepDate: targetDay } });
      continue;
    }

    const pending = tasks.filter((t) => t.status === "PENDING" || t.status === "POSTPONED");

    for (const task of pending) {
      await prisma.dailyTask.update({ where: { id: task.id }, data: { status: "FAILED_PENALIZED" } });
      await notifyBuddyOfFailure(user, task.title);
      await applyPenalty(user, task.id, task.title, user.penaltyPreference as PenaltyType, user.penaltyStakeAmount);
      tasksPenalized += 1;
    }

    const anyFailed = pending.length > 0;
    // EXCUSED (an approved Emergency Pass) counts as a non-failure for
    // streak purposes, same as COMPLETED.
    const allCompleted = tasks.every((t) => t.status === "COMPLETED" || t.status === "EXCUSED");

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        currentStreak: anyFailed ? 0 : allCompleted ? { increment: 1 } : user.currentStreak,
        lastSweepDate: targetDay,
      },
    });

    if (updated.currentStreak > updated.longestStreak) {
      await prisma.user.update({ where: { id: user.id }, data: { longestStreak: updated.currentStreak } });
      // No request/response round trip at 3am to toast this on — log it
      // for the worker console instead. The Settings badges grid picks up
      // the earned UserBadge row on next page load either way.
      const newBadges = await checkAndAwardBadges(user.id, { longestStreak: updated.currentStreak });
      if (newBadges.length > 0) {
        console.log(`[penalty-engine] ${user.email} earned badges: ${newBadges.join(", ")}`);
      }
    }

    usersProcessed += 1;
  }

  return { usersProcessed, tasksPenalized };
}

/**
 * Penalizes a single task immediately, outside the daily sweep — used for
 * the "10 Seconds (Test)" goal timeframe (lib/enums.ts TEST_TIMEFRAME) so
 * the whole enforcement flow can be exercised on demand instead of waiting
 * for real midnight. Applies the same consequence logic as the real sweep,
 * plus an immediate streak reset (the daily sweep's streak accounting is a
 * whole-day aggregate, which doesn't apply to a single instant test task).
 */
export async function penalizeTaskNow(dailyTaskId: string): Promise<void> {
  const task = await prisma.dailyTask.findUnique({ where: { id: dailyTaskId } });
  if (!task || (task.status !== "PENDING" && task.status !== "POSTPONED")) return;

  const user = await prisma.user.findUnique({ where: { id: task.userId } });
  if (!user) return;

  await prisma.dailyTask.update({ where: { id: task.id }, data: { status: "FAILED_PENALIZED" } });
  await notifyBuddyOfFailure(user, task.title);
  await applyPenalty(user, task.id, task.title, user.penaltyPreference as PenaltyType, user.penaltyStakeAmount);
  await prisma.user.update({ where: { id: user.id }, data: { currentStreak: 0 } });
}

// Creates one randomized mandatory penalty task + its unresolved PenaltyLog.
// Shared by MANDATORY_TASK (once) and DOUBLE_WORKLOAD (twice) — both are
// subject to the same hard lockout + buddy-approval gate (see
// app/api/tasks/[id]/proof/route.ts and lib/session.ts's
// getUnresolvedMandatoryPenalty, which checks penaltyType: "MANDATORY_TASK"
// regardless of which preference created the log).
async function createMandatoryPenaltyTask(userId: string) {
  const description = PENALTY_TASK_BANK[Math.floor(Math.random() * PENALTY_TASK_BANK.length)];
  const penaltyTask = await prisma.dailyTask.create({
    data: {
      userId,
      title: description,
      scheduledDate: todayStart(),
      isPenaltyTask: true,
    },
  });
  await prisma.penaltyLog.create({
    data: { userId, dailyTaskId: penaltyTask.id, penaltyType: "MANDATORY_TASK", isResolved: false },
  });
}

async function applyPenalty(
  user: Pick<User, "id" | "name">,
  dailyTaskId: string,
  taskTitle: string,
  penaltyType: PenaltyType,
  stakeAmount: number | null,
) {
  const userId = user.id;
  switch (penaltyType) {
    case "MANDATORY_TASK": {
      await createMandatoryPenaltyTask(userId);
      break;
    }
    case "DOUBLE_WORKLOAD": {
      // Penalty stacking: 2 mandatory tasks instead of 1 — both need buddy
      // approval before the account unlocks again.
      await createMandatoryPenaltyTask(userId);
      await createMandatoryPenaltyTask(userId);
      break;
    }
    case "FINANCIAL_STAKE": {
      const amount = stakeAmount ?? 500;
      await debitWallet(userId, amount, `Missed task: ${taskTitle}`);
      // Stake Transfer: split the forfeited amount evenly across every
      // currently-active buddy instead of one buddy getting it all.
      const buddyIds = await getBuddyIds(userId);
      if (buddyIds.length > 0) {
        const share = amount / buddyIds.length;
        await Promise.all(
          buddyIds.map((buddyId) => creditWallet(buddyId, share, `Buddy stake transfer from ${user.name}`)),
        );
      }
      await prisma.penaltyLog.create({
        data: { userId, dailyTaskId, penaltyType, isResolved: true, resolvedAt: new Date() },
      });
      break;
    }
    case "SHAME_POST":
    case "STREAK_RESET":
    default: {
      await prisma.penaltyLog.create({
        data: { userId, dailyTaskId, penaltyType, isResolved: true, resolvedAt: new Date() },
      });
      break;
    }
  }
}
