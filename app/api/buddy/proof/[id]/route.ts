import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buddyProofActionSchema } from "@/lib/validations";
import { safeJson } from "@/lib/api";
import { sendPushToUser } from "@/lib/push";
import { checkAndAwardBadges } from "@/lib/badges";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const verification = await prisma.proofVerification.findUnique({
    where: { id },
    include: { proof: { include: { dailyTask: true } } },
  });
  if (!verification || verification.reviewerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (verification.status !== "PENDING") {
    return NextResponse.json({ error: "This proof has already been reviewed" }, { status: 409 });
  }

  const body = await safeJson(request);
  const parsed = buddyProofActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const isReject = parsed.data.action === "reject";
  const status = isReject ? "REJECTED" : "APPROVED";

  // Multi-buddy fan-out means several ProofVerification rows can exist for
  // the same proof — first response wins. If another buddy already resolved
  // this task (approved/rejected before us), skip the redundant task-level
  // side effects and just record this reviewer's verdict.
  const currentTask = await prisma.dailyTask.findUnique({ where: { id: verification.proof.dailyTaskId } });
  const taskStillActionable = isReject
    ? currentTask?.status === "PENDING_APPROVAL" || currentTask?.status === "COMPLETED" || currentTask?.status === "FAILED_PENALIZED"
    : currentTask?.status === "PENDING_APPROVAL";

  const [updated] = await prisma.$transaction([
    prisma.proofVerification.update({
      where: { id },
      data: { status, reviewedAt: new Date(), rejectionReason: isReject ? parsed.data.reason : undefined },
    }),
    ...(isReject && taskStillActionable
      ? [prisma.dailyTask.update({ where: { id: verification.proof.dailyTaskId }, data: { status: "PENDING", isMuted: false } })]
      : []),
    // Mandatory Task / Double Workload proof only completes the task and
    // resolves its PenaltyLog once a buddy actually approves it — proof
    // submission alone (app/api/tasks/[id]/proof/route.ts) never does.
    ...(!isReject && verification.isMandatoryResolution && taskStillActionable
      ? [
          prisma.dailyTask.update({ where: { id: verification.proof.dailyTaskId }, data: { status: "COMPLETED", isMuted: true } }),
          prisma.penaltyLog.updateMany({
            where: { dailyTaskId: verification.proof.dailyTaskId, isResolved: false },
            data: { isResolved: true, resolvedAt: new Date() },
          }),
        ]
      : []),
  ]);

  if (!isReject && verification.isMandatoryResolution && taskStillActionable) {
    const completedTaskCount = await prisma.dailyTask.count({
      where: { userId: verification.proof.dailyTask.userId, status: "COMPLETED" },
    });
    await checkAndAwardBadges(verification.proof.dailyTask.userId, { completedTaskCount, comeback: true });
  }

  const reviewer = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
  await sendPushToUser(verification.proof.dailyTask.userId, {
    title: isReject ? "Proof rejected" : "Proof approved",
    body: isReject
      ? `${reviewer?.name} rejected your proof for "${verification.proof.dailyTask.title}": "${parsed.data.reason}"`
      : `${reviewer?.name} approved your proof for "${verification.proof.dailyTask.title}".`,
    url: "/dashboard",
  });

  return NextResponse.json(updated);
}
