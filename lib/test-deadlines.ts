import { prisma } from "./prisma";
import { penalizeTaskNow } from "./penalty-engine";

// Polled every second by scripts/cron-worker.ts. Cheap no-op query when
// nobody has an active "10 Seconds (Test)" goal — only tasks with a
// testDeadline set are ever touched here, real DAILY/MONTHLY/etc. tasks are
// untouched and still only handled by the real midnight sweep.
export async function checkTestDeadlines(): Promise<void> {
  const due = await prisma.dailyTask.findMany({
    where: {
      testDeadline: { lte: new Date() },
      status: { in: ["PENDING", "POSTPONED"] },
    },
    select: { id: true },
  });

  for (const task of due) {
    await penalizeTaskNow(task.id);
  }
}
