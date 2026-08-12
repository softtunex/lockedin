import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pushSubscribeSchema } from "@/lib/validations";
import { safeJson } from "@/lib/api";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await safeJson(request);
  const parsed = pushSubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: session.user.id, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await safeJson(request)) as { endpoint?: string } | null;
  if (!body?.endpoint) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { userId: session.user.id, endpoint: body.endpoint } });

  return NextResponse.json({ ok: true });
}
