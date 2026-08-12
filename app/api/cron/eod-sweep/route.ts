import { NextResponse } from "next/server";
import { runEodSweep } from "@/lib/penalty-engine";

// Suitable as a Vercel Cron / Upstash QStash target in production (schedule
// it for just after local midnight). Locally, scripts/cron-worker.ts calls
// runEodSweep() directly instead of hitting this over HTTP.
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runEodSweep();
  return NextResponse.json(result);
}
