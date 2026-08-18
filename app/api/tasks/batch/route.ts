import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { batchTaskCreateSchema } from "@/lib/validations";
import { dayStart } from "@/lib/date";
import { safeJson } from "@/lib/api";
import { getUnresolvedMandatoryPenalty } from "@/lib/session";

// Batch Mode: one DailyTask per line, all one-off (no recurrence), sharing
// the same date/category/proof-required setting picked once in the modal.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const blockingPenalty = await getUnresolvedMandatoryPenalty(session.user.id);
  if (blockingPenalty) {
    return NextResponse.json(
      { error: "Complete your pending penalty task before adding new tasks.", reason: "MANDATORY_TASK" },
      { status: 423 },
    );
  }

  const body = await safeJson(request);
  const parsed = batchTaskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { titles, scheduledDate, category, proofRequired } = parsed.data;
  const scheduled = dayStart(scheduledDate);

  const { count } = await prisma.dailyTask.createMany({
    data: titles.map((title) => ({
      userId: session.user.id,
      title,
      category,
      proofRequired,
      scheduledDate: scheduled,
    })),
  });

  return NextResponse.json({ count }, { status: 201 });
}
