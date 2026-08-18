"use client";

import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { DateLabel } from "@/components/ui/date-label";
import { Spinner } from "@/components/ui/spinner";
import { RepeatPicker } from "@/components/shared/repeat-picker";
import { VoiceInputButton } from "@/components/shared/voice-input-button";
import { Plus } from "lucide-react";
import type { ScheduleRule } from "@/lib/schedule";

export function AddTaskModal({ locked = false }: { locked?: boolean }) {
  const router = useRouter();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [open, setOpen] = useState(false);
  const [batchMode, setBatchMode] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayStr);
  const [schedule, setSchedule] = useState<ScheduleRule | null>(null);
  const [notificationTime, setNotificationTime] = useState("");
  const [batchText, setBatchText] = useState("");
  const [category, setCategory] = useState("");
  const [proofRequired, setProofRequired] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/tasks/categories")
      .then((res) => (res.ok ? res.json() : []))
      .then(setCategoryOptions)
      .catch(() => {});
  }, [open]);

  function reset() {
    setBatchMode(false);
    setTitle("");
    setDescription("");
    setDate(todayStr);
    setSchedule(null);
    setNotificationTime("");
    setBatchText("");
    setCategory("");
    setProofRequired(true);
  }

  async function handleSubmit() {
    if (batchMode) {
      const titles = batchText
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);
      if (titles.length === 0) {
        toast.error("Add at least one task, one per line");
        return;
      }
      setSubmitting(true);
      const res = await fetch("/api/tasks/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titles,
          scheduledDate: date,
          category: category.trim() || undefined,
          proofRequired,
        }),
      });
      setSubmitting(false);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to add tasks");
        if (res.status === 423 && data.reason === "MANDATORY_TASK") router.push("/penalty-lock");
        return;
      }

      const data = await res.json().catch(() => ({}));
      toast.success(`Added ${data.count ?? titles.length} task${(data.count ?? titles.length) === 1 ? "" : "s"}`);
      reset();
      setOpen(false);
      router.refresh();
      return;
    }

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
            category: category.trim() || undefined,
            proofRequired,
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
            category: category.trim() || undefined,
            proofRequired,
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
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label htmlFor="batch-mode" className="cursor-pointer text-sm font-normal">
                Batch Mode — paste or dictate multiple tasks at once
              </Label>
              <Switch id="batch-mode" checked={batchMode} onCheckedChange={setBatchMode} />
            </div>

            {batchMode ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="batch-text">One task per line</Label>
                  <VoiceInputButton onTranscript={(text) => setBatchText((prev) => (prev ? `${prev}\n${text}` : text))} />
                </div>
                <Textarea
                  id="batch-text"
                  placeholder={'"Read 20 pages"\n"Call the dentist"\n"Submit expense report"'}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  rows={6}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-task-title">Title</Label>
                    <VoiceInputButton onTranscript={(text) => setTitle((prev) => (prev ? `${prev} ${text}` : text))} />
                  </div>
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
              </>
            )}

            <DateLabel id="new-task-date" label="Date" value={date} onChange={setDate} min={todayStr} />

            {!batchMode && (
              <div className="space-y-2">
                <Label>Repeat</Label>
                <RepeatPicker value={schedule} onChange={setSchedule} allowOnce anchorDate={date} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-task-category">Category / list (optional)</Label>
              <Input
                id="new-task-category"
                list="task-category-options"
                placeholder='e.g. "Work", "Personal"'
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <datalist id="task-category-options">
                {categoryOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {!batchMode && (
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
            )}

            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <Label htmlFor="proof-required" className="cursor-pointer text-sm font-normal">
                  Proof required
                </Label>
                <p className="text-xs text-muted-foreground">
                  {proofRequired ? "Checking this off opens the Proof Modal." : "Checking this off completes it immediately — no proof."}
                </p>
              </div>
              <Switch id="proof-required" checked={proofRequired} onCheckedChange={setProofRequired} />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={submitting || (batchMode ? !batchText.trim() : !title.trim())}
              className="w-full"
            >
              {submitting && <Spinner />} {submitting ? "Adding..." : batchMode ? "Add tasks" : "Add task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
