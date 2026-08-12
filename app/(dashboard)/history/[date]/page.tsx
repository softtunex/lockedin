import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { dayStart, dayEnd } from "@/lib/date";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ExecutionFailureBanner } from "@/components/history/execution-failure-banner";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, XCircle, Clock3, FileText, Link2, CheckCircle } from "lucide-react";
import type { PenaltyType } from "@/lib/enums";

const STATUS_ICON: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-amber-500" />,
  FAILED_PENALIZED: <XCircle className="h-4 w-4 text-destructive" />,
  POSTPONED: <Clock3 className="h-4 w-4 text-slate-400" />,
  PENDING: <Clock3 className="h-4 w-4 text-muted-foreground" />,
};

export const metadata: Metadata = { title: "Day Recap" };

export default async function DayRecapPage({ params }: { params: Promise<{ date: string }> }) {
  const user = await requireOnboardedUser();
  const { date } = await params;
  const parsed = parseISO(date);
  if (!isValid(parsed)) notFound();

  const tasks = await prisma.dailyTask.findMany({
    where: { userId: user.id, scheduledDate: { gte: dayStart(parsed), lte: dayEnd(parsed) } },
    include: { proofs: true, parentGoal: true },
    orderBy: { createdAt: "asc" },
  });

  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  const failed = tasks.filter((t) => t.status === "FAILED_PENALIZED");
  const proofs = tasks.flatMap((t) => t.proofs.map((p) => ({ ...p, taskTitle: t.title })));
  const executionRate = tasks.length === 0 ? 100 : Math.round((completed / tasks.length) * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/history" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to history
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Daily Audit</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{format(parsed, "MMM d, yyyy")}</h1>
        </div>
        {tasks.length > 0 && (
          <StatCard
            label={`${completed} of ${tasks.length} Goals Accomplished`}
            value={`${executionRate}%`}
            icon={CheckCircle}
            tone={executionRate === 100 ? "success" : failed.length > 0 ? "destructive" : "default"}
          />
        )}
      </div>

      {failed.length > 0 && (
        <ExecutionFailureBanner
          failedTitles={failed.map((t) => t.title)}
          penaltyType={user.penaltyPreference as PenaltyType}
        />
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Task Manifest</h2>
        <div className="space-y-2">
          {tasks.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No tasks were scheduled this day.
              </CardContent>
            </Card>
          )}
          {tasks.map((task) => (
            <Card
              key={task.id}
              className={cn(
                task.status === "COMPLETED" && "border-amber-200 bg-amber-50",
                task.status === "FAILED_PENALIZED" && "border-destructive/30 bg-destructive/5",
              )}
            >
              <CardContent className="flex items-center gap-3 p-4">
                {STATUS_ICON[task.status]}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      (task.status === "COMPLETED" || task.status === "FAILED_PENALIZED") &&
                        "line-through opacity-60",
                    )}
                  >
                    {task.title}
                  </p>
                  {task.parentGoal && <p className="text-xs text-muted-foreground">{task.parentGoal.title}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {proofs.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Proof of Work Log</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {proofs.map((proof) => (
              <a
                key={proof.id}
                href={proof.proofType === "TEXT" ? undefined : proof.proofData}
                target="_blank"
                rel="noreferrer"
                className="block rounded-md border border-border p-2 text-xs"
              >
                {proof.proofType === "IMAGE" ? (
                  <Image
                    src={proof.proofData}
                    alt={proof.taskTitle}
                    width={200}
                    height={200}
                    unoptimized
                    className="mb-1 h-24 w-full rounded object-cover"
                  />
                ) : proof.proofType === "URL" ? (
                  <Link2 className="mb-1 h-6 w-6 text-muted-foreground" />
                ) : (
                  <FileText className="mb-1 h-6 w-6 text-muted-foreground" />
                )}
                <p className="line-clamp-2 text-muted-foreground">{proof.taskTitle}</p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
