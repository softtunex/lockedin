import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { TaskList, type TaskWithProofs } from "@/components/dashboard/task-list";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = { title: "Penalty Lock" };

export default async function PenaltyLockPage() {
  const user = await requireOnboardedUser();

  const penalties = await prisma.penaltyLog.findMany({
    where: { userId: user.id, penaltyType: "MANDATORY_TASK", isResolved: false },
    orderBy: { createdAt: "desc" },
  });

  if (penalties.length === 0) redirect("/dashboard");

  const tasks = (await prisma.dailyTask.findMany({
    where: { id: { in: penalties.map((p) => p.dailyTaskId) } },
    include: { proofs: { orderBy: { submittedAt: "desc" } }, parentGoal: true },
  })) as TaskWithProofs[];

  if (tasks.length === 0) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {tasks.length > 1 ? "You missed a task and owe a double penalty" : "You missed a task yesterday"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Full app access is locked — no new tasks, goals, or snoozes — until{" "}
          {tasks.length > 1 ? "these penalty tasks are" : "this penalty task is"} completed with proof and approved
          by your buddy.
        </p>
      </div>
      <Card>
        <CardContent className="p-4 text-left">
          <TaskList initialTasks={tasks} locked />
        </CardContent>
      </Card>
    </div>
  );
}
