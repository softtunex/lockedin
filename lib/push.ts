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

export async function sendPendingTaskReminders(referenceDate: Date = new Date()) {
  if (!ensureConfigured()) return;

  const hhmm = `${String(referenceDate.getHours()).padStart(2, "0")}:${String(referenceDate.getMinutes()).padStart(2, "0")}`;

  const users = await prisma.user.findMany({ where: { onboardingComplete: true } });
  const dayStart = new Date(referenceDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(referenceDate);
  dayEnd.setHours(23, 59, 59, 999);

  for (const user of users) {
    const reminderTimes = JSON.parse(user.reminderTimes || "[]") as string[];
    if (!reminderTimes.includes(hhmm)) continue;

    const pendingCount = await prisma.dailyTask.count({
      where: { userId: user.id, scheduledDate: { gte: dayStart, lte: dayEnd }, status: "PENDING" },
    });

    if (pendingCount === 0) continue;

    await sendPushToUser(user.id, {
      title: "LockedIn Alert",
      body: `You still have ${pendingCount} pending task${pendingCount === 1 ? "" : "s"} today. Don't risk the penalty!`,
      url: "/dashboard",
    });
  }
}
