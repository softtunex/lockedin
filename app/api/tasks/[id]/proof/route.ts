import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveProofFile } from "@/lib/storage";
import { proofSubmitSchema } from "@/lib/validations";
import { safeJson } from "@/lib/api";
import { checkAndAwardBadges } from "@/lib/badges";
import { sendPushToUser } from "@/lib/push";
import { getBuddyIds } from "@/lib/buddy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.dailyTask.findFirst({ where: { id, userId: session.user.id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (task.status === "PENDING_ASSIGNMENT") {
    return NextResponse.json({ error: "Waiting for your buddy to assign this task first." }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let proofType: string;
  let proofData: string;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    proofType = String(form.get("proofType") ?? "IMAGE");
    const file = form.get("file");

    if (proofType !== "IMAGE" || !(file instanceof File)) {
      return NextResponse.json({ error: "An image file is required for IMAGE proof" }, { status: 400 });
    }

    try {
      proofData = await saveProofFile(session.user.id, file);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
  } else {
    const body = await safeJson(request);
    const parsed = proofSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    proofType = parsed.data.proofType;
    proofData = parsed.data.proofData;
  }

  // A Mandatory Task / Double Workload penalty task doesn't self-complete on
  // proof — it needs a buddy's approval first (see
  // app/api/buddy/proof/[id]/route.ts), so the hard lockout in
  // lib/session.ts's getUnresolvedMandatoryPenalty stays in effect until
  // then.
  const unresolvedPenaltyLog = task.isPenaltyTask
    ? await prisma.penaltyLog.findFirst({ where: { dailyTaskId: task.id, isResolved: false } })
    : null;
  const isMandatoryResolution = Boolean(unresolvedPenaltyLog);

  const [proof, updatedTask] = await prisma.$transaction([
    prisma.proofOfWork.create({
      data: { dailyTaskId: task.id, proofType, proofData },
    }),
    prisma.dailyTask.update({
      where: { id: task.id },
      data: isMandatoryResolution
        ? { status: "PENDING_APPROVAL" }
        : { status: "COMPLETED", isMuted: true },
    }),
    ...(isMandatoryResolution
      ? []
      : [
          prisma.penaltyLog.updateMany({
            where: { dailyTaskId: task.id, isResolved: false },
            data: { isResolved: true, resolvedAt: new Date() },
          }),
        ]),
  ]);

  const newBadges = isMandatoryResolution
    ? []
    : await (async () => {
        const completedTaskCount = await prisma.dailyTask.count({
          where: { userId: session.user.id, status: "COMPLETED" },
        });
        return checkAndAwardBadges(session.user.id, {
          completedTaskCount,
          comeback: task.isPenaltyTask,
        });
      })();

  const submitter = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });
  const buddyIds = await getBuddyIds(session.user.id);
  if (buddyIds.length > 0) {
    await prisma.proofVerification.createMany({
      data: buddyIds.map((buddyId) => ({
        proofOfWorkId: proof.id,
        reviewerId: buddyId,
        status: "PENDING",
        isMandatoryResolution,
      })),
    });
    await Promise.all(
      buddyIds.map((buddyId) =>
        sendPushToUser(buddyId, {
          title: isMandatoryResolution ? "Mandatory task proof to approve" : "Proof to review",
          body: `${submitter?.name} submitted proof for "${task.title}" — take a look.`,
          url: "/buddy",
        }),
      ),
    );
  }

  return NextResponse.json({ proof, task: updatedTask, newBadges }, { status: 201 });
}
