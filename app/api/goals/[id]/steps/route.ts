import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addGoalStepSchema } from "@/lib/validations";
import { safeJson } from "@/lib/api";
import { isSingleTaskTimeframe } from "@/lib/enums";
import { materializeStepsForGoalToday, type StepTemplate } from "@/lib/daily-steps";
import { todayStart } from "@/lib/date";

// Appends a new recurring step to an already-created goal — only while the
// goal is still ACTIVE and its duration hasn't ended, matching how the
// materializer only ever looks at goals still inside their date window.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const goal = await prisma.goal.findFirst({ where: { id, userId: session.user.id } });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (isSingleTaskTimeframe(goal.timeframe)) {
    return NextResponse.json({ error: "This goal doesn't take recurring steps" }, { status: 400 });
  }
  if (goal.status !== "ACTIVE" || todayStart() > goal.endDate) {
    return NextResponse.json({ error: "This goal's duration has ended — steps can't be added" }, { status: 409 });
  }

  const body = await safeJson(request);
  const parsed = addGoalStepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const newStep: StepTemplate = { id: randomUUID(), ...parsed.data };
  const templates = JSON.parse(goal.dailyStepTemplates || "[]") as StepTemplate[];
  templates.push(newStep);

  const updated = await prisma.goal.update({
    where: { id },
    data: { dailyStepTemplates: JSON.stringify(templates) },
  });

  await materializeStepsForGoalToday(session.user.id, goal.id, [newStep], todayStart());

  return NextResponse.json(updated, { status: 201 });
}
