"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";

type Task = { id: string; title: string };

export function RequestEmergencyPass({
  tasks,
  buddyUserId,
  available,
}: {
  tasks: Task[];
  buddyUserId: string;
  available: number;
}) {
  const router = useRouter();
  const [taskId, setTaskId] = useState<string>(tasks[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  if (tasks.length === 0) {
    return <p className="text-xs text-muted-foreground">Nothing to excuse today — you&apos;re all caught up.</p>;
  }

  if (available <= 0) {
    return <p className="text-xs text-muted-foreground">You&apos;ve used your emergency pass this week.</p>;
  }

  async function submit() {
    if (!taskId) return;
    setSubmitting(true);
    const res = await fetch("/api/buddy/emergency-pass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyTaskId: taskId, buddyUserId }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Couldn't request a pass");
      return;
    }
    toast.success("Request sent to your buddy");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Select value={taskId} onValueChange={(value) => setTaskId(value ?? "")}>
        <SelectTrigger className="sm:w-64">
          <SelectValue placeholder="Choose a task" />
        </SelectTrigger>
        <SelectContent>
          {tasks.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="secondary" disabled={submitting || !taskId} onClick={submit}>
        {submitting ? <Spinner /> : <ShieldCheck className="h-4 w-4" />} Request Emergency Pass
      </Button>
    </div>
  );
}
