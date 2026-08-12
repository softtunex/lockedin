"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { Spinner } from "@/components/ui/spinner";
import { RepeatPicker } from "@/components/shared/repeat-picker";
import type { ScheduleRule } from "@/lib/schedule";

export function AddTaskForm({ locked = false }: { locked?: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [schedule, setSchedule] = useState<ScheduleRule | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || locked) return;

    setSubmitting(true);
    const res = schedule
      ? await fetch("/api/recurring-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), schedule }),
        })
      : await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), scheduledDate: todayStr }),
        });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to add task");
      if (res.status === 423 && data.reason === "MANDATORY_TASK") router.push("/penalty-lock");
      return;
    }

    setTitle("");
    setSchedule(null);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Add a standalone task for today..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={locked}
        />
        <Button type="submit" disabled={submitting || !title.trim() || locked}>
          {submitting ? <Spinner /> : <Plus className="h-4 w-4" />} Add
        </Button>
      </div>
      {!locked && (
        <RepeatPicker value={schedule} onChange={setSchedule} allowOnce anchorDate={todayStr} />
      )}
      {locked && (
        <p className="text-xs text-destructive">
          Locked — complete your mandatory penalty task and get buddy approval to add tasks again.
        </p>
      )}
    </form>
  );
}
