"use client";

import { useState } from "react";
import { addDays, format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateLabel } from "@/components/ui/date-label";
import { Spinner } from "@/components/ui/spinner";
import type { TaskWithProofs } from "./task-list";

export function SnoozeModal({
  task,
  open,
  onOpenChange,
  onSnoozed,
}: {
  task: TaskWithProofs | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSnoozed: (taskId: string) => void;
}) {
  const [date, setDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  async function handleSnooze() {
    if (!task) return;
    setSaving(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledDate: date }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to reschedule task");
      return;
    }

    toast.success(`Moved to ${format(new Date(date), "EEEE, MMM d")}`);
    onSnoozed(task.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Do later</DialogTitle>
          <DialogDescription>Move &quot;{task?.title}&quot; to a future date.</DialogDescription>
        </DialogHeader>
        <DateLabel
          id="snooze-date"
          label="New date"
          value={date}
          onChange={setDate}
          min={format(new Date(), "yyyy-MM-dd")}
        />
        <DialogFooter>
          <Button onClick={handleSnooze} disabled={saving} className="w-full">
            {saving && <Spinner />} {saving ? "Rescheduling..." : "Reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
