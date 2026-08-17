"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { isSameDay } from "date-fns";
import type { DailyTask, ProofOfWork, Goal } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Pencil, Clock3, Link2, FileText, Target, Timer, FlaskConical } from "lucide-react";
import { ProofModal } from "./proof-modal";
import { EditTaskModal } from "./edit-task-modal";
import { SnoozeModal } from "./snooze-modal";
import { useMsUntilMidnight, formatCountdown } from "@/lib/use-midnight-countdown";

export type TaskWithProofs = DailyTask & { proofs: ProofOfWork[]; parentGoal: Goal | null };

const URGENT_THRESHOLD_MS = 2 * 60 * 60 * 1000;

function TestDeadlineBadge({ deadline, onExpire }: { deadline: Date; onExpire: () => void }) {
  // `remaining` depends on Date.now(), which differs between the server
  // render and the moment the client hydrates — computing it eagerly (even
  // via useState's lazy initializer) causes a hydration text mismatch.
  // Start at `null` (renders identically on server and client) and only
  // compute real values inside an effect, same pattern as
  // lib/use-midnight-countdown.ts.
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    setRemaining(deadline.getTime() - Date.now());
    const id = setInterval(() => {
      const next = deadline.getTime() - Date.now();
      setRemaining(next);
      if (next <= 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [deadline]);

  useEffect(() => {
    if (remaining === null || remaining > 0) return;
    // Give the worker's 1s poll (scripts/cron-worker.ts) a moment to
    // actually flip the task to FAILED_PENALIZED before refreshing.
    const t = setTimeout(onExpire, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining !== null && remaining <= 0]);

  if (remaining === null) return null;

  return (
    <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
      <FlaskConical className="h-3 w-3" />
      {remaining > 0 ? `Test deadline in ${Math.ceil(remaining / 1000)}s` : "Penalizing…"}
    </span>
  );
}

export function TaskList({ initialTasks, locked = false }: { initialTasks: TaskWithProofs[]; locked?: boolean }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  // The dashboard/goal-detail/penalty-lock pages that render this are
  // Server Components: router.refresh() (e.g. after adding a standalone
  // task) re-fetches `initialTasks` server-side, but this component's own
  // `tasks` state was already seeded on first mount and won't pick up the
  // new prop on its own — resync it whenever the server gives us a new copy.
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);
  const [proofTask, setProofTask] = useState<TaskWithProofs | null>(null);
  const [editTask, setEditTask] = useState<TaskWithProofs | null>(null);
  const [snoozeTask, setSnoozeTask] = useState<TaskWithProofs | null>(null);
  const msRemaining = useMsUntilMidnight();
  const isUrgent = msRemaining !== null && msRemaining < URGENT_THRESHOLD_MS;

  function updateTask(updated: TaskWithProofs) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Nothing scheduled for today. Add a task or create a goal.
        </CardContent>
      </Card>
    );
  }

  // Resolved tasks (done or failed) sink to the bottom so what's still
  // actionable is what you see first. Array.sort is stable, so relative
  // order within each group is preserved.
  const RESOLVED_STATUSES = new Set(["COMPLETED", "FAILED_PENALIZED", "EXCUSED"]);
  const sortedTasks = [...tasks].sort(
    (a, b) => Number(RESOLVED_STATUSES.has(a.status)) - Number(RESOLVED_STATUSES.has(b.status)),
  );

  return (
    <div className="space-y-2">
      {sortedTasks.map((task) => {
        const isDone = task.status === "COMPLETED";
        const isFailed = task.status === "FAILED_PENALIZED";
        const isPendingAssignment = task.status === "PENDING_ASSIGNMENT";
        const isActionable = !isDone && !isFailed && !isPendingAssignment;
        const alreadySnoozedToday = Boolean(task.lastSnoozedAt) && isSameDay(new Date(task.lastSnoozedAt!), new Date());
        const proof = task.proofs[0];

        return (
          <Card
            key={task.id}
            className={cn(
              "border-l-4 border-border/50 shadow-sm transition-shadow hover:shadow-md",
              isFailed && "border-l-destructive bg-destructive/5",
              isDone && "border-l-amber-500 bg-amber-500/5",
              isPendingAssignment && "border-l-amber-500/50 bg-amber-500/5",
              isActionable && "border-l-primary",
            )}
          >
            <CardContent className="flex flex-wrap items-start gap-3 p-4">
              <button
                type="button"
                disabled={isDone || isFailed || isPendingAssignment}
                onClick={() => setProofTask(task)}
                aria-label={isDone ? "Completed" : isPendingAssignment ? "Waiting for buddy to assign" : "Mark as done"}
                className={cn(
                  "relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors before:absolute before:-inset-3 before:content-['']",
                  isDone && "animate-in zoom-in-50 duration-300 border-amber-500 bg-amber-500 text-white",
                  isFailed && "border-destructive/50",
                  isPendingAssignment && "border-amber-500/40",
                  isActionable && "border-muted-foreground/40 hover:border-primary",
                )}
              >
                {isDone && <Check className="h-3 w-3" />}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      (isDone || isFailed) && "line-through opacity-50",
                    )}
                  >
                    {task.title}
                  </p>
                  {task.isPenaltyTask && (
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                      Penalty task
                    </span>
                  )}
                  {isPendingAssignment && (
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                      Waiting for buddy to assign
                    </span>
                  )}
                  {task.parentGoal && (
                    <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                      <Target className="h-3 w-3" />
                      {task.parentGoal.title}
                    </span>
                  )}
                  {task.dueTime && (
                    <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      Notify {task.dueTime}
                    </span>
                  )}
                  {isFailed && (
                    <span className="rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                      Failed day
                    </span>
                  )}
                  {isActionable && isUrgent && msRemaining !== null && (
                    <span className="flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-destructive">
                      <Timer className="h-3 w-3" />
                      {formatCountdown(msRemaining)} left — edit or reschedule now
                    </span>
                  )}
                  {isActionable && task.testDeadline && (
                    <TestDeadlineBadge
                      deadline={task.testDeadline}
                      onExpire={() => router.refresh()}
                    />
                  )}
                </div>
                {task.description && (
                  <p className={cn("mt-0.5 text-sm text-muted-foreground", isDone && "opacity-50")}>
                    {task.description}
                  </p>
                )}

                {proof && (
                  <div className="mt-2">
                    {proof.proofType === "IMAGE" ? (
                      <a href={proof.proofData} target="_blank" rel="noreferrer">
                        <Image
                          src={proof.proofData}
                          alt="Proof of work"
                          width={96}
                          height={96}
                          className="h-24 w-24 rounded-md border border-border object-cover opacity-80"
                          unoptimized
                        />
                      </a>
                    ) : proof.proofType === "URL" ? (
                      <a
                        href={proof.proofData}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground underline"
                      >
                        <Link2 className="h-3 w-3" /> {proof.proofData}
                      </a>
                    ) : (
                      <p className="flex items-start gap-1 text-xs text-muted-foreground">
                        <FileText className="mt-0.5 h-3 w-3 shrink-0" /> {proof.proofData}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {isActionable && (
                <div className="flex w-full shrink-0 justify-end gap-1 sm:w-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 sm:h-7"
                    onClick={() => setEditTask(task)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 sm:h-7"
                    disabled={alreadySnoozedToday || locked}
                    onClick={() => setSnoozeTask(task)}
                    aria-label={locked ? "Locked" : alreadySnoozedToday ? "Already rescheduled today" : "Do later"}
                  >
                    <Clock3 className="h-3.5 w-3.5" /> {alreadySnoozedToday ? "Rescheduled" : "Do Later"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <ProofModal
        task={proofTask}
        open={!!proofTask}
        onOpenChange={(o) => !o && setProofTask(null)}
        onCompleted={(t) => {
          updateTask(t);
          toast.success("Nice work. Logged for today.");
        }}
      />
      <EditTaskModal
        task={editTask}
        open={!!editTask}
        onOpenChange={(o) => !o && setEditTask(null)}
        onSaved={updateTask}
        onDeleted={removeTask}
      />
      <SnoozeModal
        task={snoozeTask}
        open={!!snoozeTask}
        onOpenChange={(o) => !o && setSnoozeTask(null)}
        onSnoozed={removeTask}
      />
    </div>
  );
}
