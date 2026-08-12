import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json(
      { error: "VAPID keys are not configured. Run: npx web-push generate-vapid-keys" },
      { status: 400 },
    );
  }

  await sendPushToUser(session.user.id, {
    title: "LockedIn",
    body: "This is a test reminder. Your notifications are working.",
    url: "/dashboard",
  });

  return NextResponse.json({ ok: true });
}
