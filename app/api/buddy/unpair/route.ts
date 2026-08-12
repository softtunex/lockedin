import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unpairUsers } from "@/lib/buddy";
import { safeJson } from "@/lib/api";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await safeJson(request)) as Record<string, unknown> | null;
  const buddyUserId = typeof body?.buddyUserId === "string" ? body.buddyUserId : null;
  if (!buddyUserId) return NextResponse.json({ error: "buddyUserId is required" }, { status: 400 });

  await unpairUsers(session.user.id, buddyUserId);
  return NextResponse.json({ ok: true });
}
