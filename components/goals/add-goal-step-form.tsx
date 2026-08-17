"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateLabel } from "@/components/ui/date-label";
import { Spinner } from "@/components/ui/spinner";
import { RepeatPicker } from "@/components/shared/repeat-picker";
import { Plus } from "lucide-react";
import type { ScheduleRule } from "@/lib/schedule";

export function AddGoalStepForm({ goalId, goalStartDate, goalEndDate }: { goalId: string; goalStartDate: string; goalEndDate: string }) {
  const router = useRouter();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState<ScheduleRule | null>({ frequency: "DAILY" });
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState("");
  const [notificationTime, setNotificationTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!title.trim()) {
      toast.error("Give the step a title");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/goals/${goalId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        schedule,
        startDate,
        endDate: endDate || undefined,
        notificationTime: notificationTime || undefined,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Couldn't add step");
      return;
    }

    toast.success("Step added");
    setTitle("");
    setDescription("");
    setSchedule({ frequency: "DAILY" });
    setStartDate(todayStr);
    setEndDate("");
    setNotificationTime("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Add step
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <Input placeholder='Step title, e.g. "Write 500 words"' value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input placeholder="Optional details" value={description} onChange={(e) => setDescription(e.target.value)} />
      <RepeatPicker value={schedule} onChange={setSchedule} allowOnce anchorDate={startDate} />
      <div className="grid gap-3 sm:grid-cols-3">
        <DateLabel
          id="new-step-start"
          label={schedule === null ? "Date" : "Starts"}
          value={startDate}
          onChange={setStartDate}
          min={goalStartDate}
        />
        {schedule !== null && (
          <DateLabel id="new-step-end" label="Ends (optional)" value={endDate} onChange={setEndDate} min={startDate} />
        )}
        <div className="space-y-2">
          <Label htmlFor="new-step-time">Notification time (optional)</Label>
          <Input id="new-step-time" type="time" value={notificationTime} onChange={(e) => setNotificationTime(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {schedule === null
          ? "This step happens once, on the date above."
          : `Leave Ends blank to run through this goal's own end date (${format(new Date(goalEndDate), "MMM d, yyyy")}).`}
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={submitting}>
          {submitting && <Spinner />} {submitting ? "Adding..." : "Add step"}
        </Button>
      </div>
    </div>
  );
}
