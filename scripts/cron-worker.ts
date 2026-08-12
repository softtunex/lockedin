import "dotenv/config";
import cron from "node-cron";
import { runEodSweep } from "../lib/penalty-engine";
import { sendPendingTaskReminders } from "../lib/push";
import { checkTestDeadlines } from "../lib/test-deadlines";

// Local stand-in for Vercel Cron / Upstash QStash: runs the same
// penalty-engine logic at real midnight, and checks every minute whether
// any user has a reminder configured for the current HH:mm. Run alongside
// `next dev`/`next start` via `npm run worker`.

console.log("[worker] LockedIn cron worker started.");

cron.schedule("0 0 * * *", async () => {
  console.log("[worker] Running midnight EOD sweep...");
  try {
    const result = await runEodSweep();
    console.log(`[worker] Sweep complete: ${result.usersProcessed} users, ${result.tasksPenalized} tasks penalized.`);
  } catch (err) {
    console.error("[worker] EOD sweep failed:", err);
  }
});

cron.schedule("* * * * *", async () => {
  try {
    await sendPendingTaskReminders(new Date());
  } catch (err) {
    console.error("[worker] Reminder sweep failed:", err);
  }
});

// Cheap 1s poll for "10 Seconds (Test)" goals — lets the penalty flow be
// exercised on demand without waiting for real midnight. No-op when no
// test-timeframe tasks are pending.
setInterval(async () => {
  try {
    await checkTestDeadlines();
  } catch (err) {
    console.error("[worker] Test-deadline check failed:", err);
  }
}, 1000);
