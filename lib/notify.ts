import { prisma } from "./prisma";
import { sendPushToUser } from "./push";
import { sendNotificationEmail } from "./email";

// Fires both channels for an event worth reaching someone even if they
// never see the push notification — a buddy request, a missed-task
// penalty, an emergency pass decision, and so on. Deliberately not used for
// every push in the app: fast back-and-forth events (proof approved/
// rejected, a buddy chat message) stay push-only via sendPushToUser
// directly, since an inbox isn't the right place for those.
export async function notifyUser(
  userId: string,
  payload: { title: string; body: string; url?: string; ctaLabel?: string },
) {
  const [user] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    sendPushToUser(userId, { title: payload.title, body: payload.body, url: payload.url }),
  ]);

  if (user?.email) {
    await sendNotificationEmail({
      to: user.email,
      heading: payload.title,
      body: payload.body,
      ctaLabel: payload.ctaLabel ?? (payload.url ? "Open LockedIn" : undefined),
      ctaUrl: payload.url,
    });
  }
}

// Per-task reminders — each task/step carries its own optional
// notification time (DailyTask.dueTime, "HH:mm") set at creation, rather
// than a blanket set of times configured once for the whole account. A
// task with no dueTime set just never reminds. Matches the current minute
// against every still-pending task scheduled for today whose dueTime is
// now, and notifies (push + email) once per match.
export async function sendPendingTaskReminders(referenceDate: Date = new Date()) {
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
    await notifyUser(task.userId, {
      title: "LockedIn Reminder",
      body: `"${task.title}" is due — don't risk the penalty!`,
      url: "/dashboard",
    });
  }
}
