"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DateLabel } from "@/components/ui/date-label";
import { Spinner } from "@/components/ui/spinner";
import { RepeatPicker } from "@/components/shared/repeat-picker";
import { Plus } from "lucide-react";
import type { ScheduleRule } from "@/lib/schedule";

export function AddTaskModal({ locked = false }: { locked?: boolean }) {
  const router = useRouter();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayStr);
  const [schedule, setSchedule] = useState<ScheduleRule | null>(null);
  const [notificationTime, setNotificationTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setDate(todayStr);
    setSchedule(null);
    setNotificationTime("");
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Give the task a title");
      return;
    }

    setSubmitting(true);
    const res = schedule
      ? await fetch("/api/recurring-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            schedule,
            startDate: date,
            notificationTime: notificationTime || undefined,
          }),
        })
      : await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            scheduledDate: date,
            dueTime: notificationTime || undefined,
          }),
        });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to add task");
      if (res.status === 423 && data.reason === "MANDATORY_TASK") router.push("/penalty-lock");
      return;
    }

    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button disabled={locked} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add task
      </Button>
      {locked && (
        <p className="text-xs text-destructive">
          Locked — complete your mandatory penalty task and get buddy approval to add tasks again.
        </p>
      )}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-task-title">Title</Label>
              <Input
                id="new-task-title"
                placeholder='e.g. "Read 20 pages"'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-task-description">Description (optional)</Label>
              <Textarea id="new-task-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <DateLabel id="new-task-date" label="Date" value={date} onChange={setDate} min={todayStr} />
            <div className="space-y-2">
              <Label>Repeat</Label>
              <RepeatPicker value={schedule} onChange={setSchedule} allowOnce anchorDate={date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-task-time">Notification time (optional)</Label>
              <Input
                id="new-task-time"
                type="time"
                value={notificationTime}
                onChange={(e) => setNotificationTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Get a push notification for this task specifically, at this time — instead of a generic daily nudge.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={submitting || !title.trim()} className="w-full">
              {submitting && <Spinner />} {submitting ? "Adding..." : "Add task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
