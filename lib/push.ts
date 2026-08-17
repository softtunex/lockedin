import webpush from "web-push";
import { prisma } from "./prisma";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;

  webpush.setVapidDetails(VAPID_SUBJECT ?? "mailto:you@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  if (!ensureConfigured()) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }),
  );
}

// Per-task reminders — each task/step carries its own optional
// notification time (DailyTask.dueTime, "HH:mm") set at creation, rather
// than a blanket set of times configured once for the whole account. A
// task with no dueTime set just never reminds. Matches the current minute
// against every still-pending task scheduled for today whose dueTime is
// now, and sends one task-specific push per match.
export async function sendPendingTaskReminders(referenceDate: Date = new Date()) {
  if (!ensureConfigured()) return;

  const hhmm = `${String(referenceDate.getHours()).padStart(2, "0")}:${String(referenceDate.getMinutes()).padStart(2, "0")}`;

  const dayStart = new Date(referenceDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(referenceDate);
  dayEnd.setHours(23, 59, 59, 999);

  const dueTasks = await prisma.dailyTask.findMany({
    where: {
      dueTime: hhmm,
      status: { in: ["PENDING", "POSTPONED"] },
      scheduledDate: { gte: dayStart, lte: dayEnd },
    },
  });

  for (const task of dueTasks) {
    await sendPushToUser(task.userId, {
      title: "LockedIn Reminder",
      body: `"${task.title}" is due — don't risk the penalty!`,
      url: "/dashboard",
    });
  }
}
