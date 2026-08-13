import { NextResponse } from "next/server";
import { sendPendingTaskReminders } from "@/lib/push";

// Suitable as a GitHub Actions / Vercel Cron target — call every few
// minutes. Matches each user's configured reminder time against the
// current HH:mm, so it only needs to run roughly that often to feel
// on-time; scripts/cron-worker.ts calls the same function every minute
// locally instead of hitting this over HTTP.
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await sendPendingTaskReminders();
  return NextResponse.json({ ok: true });
}
