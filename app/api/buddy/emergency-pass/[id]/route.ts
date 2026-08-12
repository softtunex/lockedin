import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emergencyPassActionSchema } from "@/lib/validations";
import { safeJson } from "@/lib/api";
import { sendPushToUser } from "@/lib/push";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const use = await prisma.emergencyPassUse.findUnique({ where: { id } });
  if (!use || use.buddyUserId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (use.status !== "PENDING") {
    return NextResponse.json({ error: "This request has already been answered" }, { status: 409 });
  }

  const body = await safeJson(request);
  const parsed = emergencyPassActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const approve = parsed.data.action === "approve";
  const [updated] = await prisma.$transaction([
    prisma.emergencyPassUse.update({
      where: { id },
      data: { status: approve ? "APPROVED" : "DECLINED", respondedAt: new Date() },
    }),
    ...(approve
      ? [prisma.dailyTask.update({ where: { id: use.dailyTaskId }, data: { status: "EXCUSED" } })]
      : []),
  ]);

  const reviewer = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
  await sendPushToUser(use.userId, {
    title: approve ? "Emergency pass approved" : "Emergency pass declined",
    body: approve
      ? `${reviewer?.name} excused your task — no penalty today.`
      : `${reviewer?.name} declined your emergency pass request.`,
    url: "/dashboard",
  });

  return NextResponse.json(updated);
}
