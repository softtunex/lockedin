import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assignPenaltyTaskSchema } from "@/lib/validations";
import { safeJson } from "@/lib/api";
import { sendPushToUser } from "@/lib/push";
import { getBuddyIds } from "@/lib/buddy";

// A Buddy-Assigned Penalty Task starts as a placeholder (status
// PENDING_ASSIGNMENT, no real content) — this is where a connected buddy
// writes the actual task, which is what makes it proof-submittable. Multiple
// buddies can see the same pending assignment; first to respond wins, same
// as proof review.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.dailyTask.findUnique({ where: { id } });
  if (!task || !task.isPenaltyTask) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (task.status !== "PENDING_ASSIGNMENT") {
    return NextResponse.json({ error: "This task has already been assigned" }, { status: 409 });
  }

  const buddyIds = await getBuddyIds(task.userId);
  if (!buddyIds.includes(session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await safeJson(request);
  const parsed = assignPenaltyTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.dailyTask.update({
    where: { id },
    data: { title: parsed.data.title, description: parsed.data.description, status: "PENDING" },
  });

  const assigner = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
  await sendPushToUser(task.userId, {
    title: "Your penalty task was assigned",
    body: `${assigner?.name} assigned you: "${parsed.data.title}"`,
    url: "/dashboard",
  });

  return NextResponse.json(updated);
}
