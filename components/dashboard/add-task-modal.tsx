"use client";

import { forwardRef, useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RepeatPicker } from "@/components/shared/repeat-picker";
import { VoiceInputButton } from "@/components/shared/voice-input-button";
import { Plus, CalendarDays, Repeat, Tag, Bell, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleRule } from "@/lib/schedule";
import { describeSchedule } from "@/lib/schedule";
import { SHARED_COMPLETION_MODES, SHARED_COMPLETION_MODE_LABELS, type SharedCompletionMode } from "@/lib/enums";

type Buddy = { id: string; name: string };

// A pill-shaped button — the building block of the chip bar below the
// title input. Each chip shows its own current-value summary so the modal
// stays scannable without expanding every field at once (progressive
// disclosure instead of one long always-visible form). forwardRef + prop
// spreading so it works as a PopoverTrigger's `render` target, which
// clone-merges its own onClick/aria-expanded/ref onto whatever element is
// passed in.
const Chip = forwardRef<HTMLButtonElement, ComponentProps<typeof Button> & { active?: boolean }>(
  ({ active, className, ...props }, ref) => (
    <Button
      ref={ref}
      variant="outline"
      size="sm"
      className={cn("rounded-full", active && "border-primary/40 bg-primary/10 text-primary", className)}
      {...props}
    />
  ),
);
Chip.displayName = "Chip";

export function AddTaskModal({ locked = false }: { locked?: boolean }) {
  const router = useRouter();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"single" | "batch">("single");
  const batchMode = mode === "batch";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [date, setDate] = useState(todayStr);
  const [schedule, setSchedule] = useState<ScheduleRule | null>(null);
  const [notificationTime, setNotificationTime] = useState("");
  const [batchText, setBatchText] = useState("");
  const [category, setCategory] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [sharedTask, setSharedTask] = useState(false);
  const [sharedBuddyId, setSharedBuddyId] = useState("");
  const [completionMode, setCompletionMode] = useState<SharedCompletionMode>("INDEPENDENT");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/tasks/categories")
      .then((res) => (res.ok ? res.json() : []))
      .then(setCategoryOptions)
      .catch(() => {});
    fetch("/api/buddy/list")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: Buddy[]) => {
        setBuddies(list);
        setSharedBuddyId((prev) => prev || list[0]?.id || "");
      })
      .catch(() => {});
  }, [open]);

  function reset() {
    setMode("single");
    setTitle("");
    setDescription("");
    setShowDescription(false);
    setDate(todayStr);
    setSchedule(null);
    setNotificationTime("");
    setBatchText("");
    setCategory("");
    setSharedTask(false);
    setCompletionMode("INDEPENDENT");
  }

  function handleModeChange(next: "single" | "batch") {
    setMode(next);
    if (next === "batch") setSharedTask(false);
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

    if (sharedTask) {
      if (!sharedBuddyId) {
        toast.error("Pick a buddy to share this task with");
        return;
      }
      setSubmitting(true);
      const res = await fetch("/api/tasks/shared", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          scheduledDate: date,
          dueTime: notificationTime || undefined,
          category: category.trim() || undefined,
          buddyUserId: sharedBuddyId,
          completionMode,
        }),
      });
      setSubmitting(false);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to add shared task");
        if (res.status === 423 && data.reason === "MANDATORY_TASK") router.push("/penalty-lock");
        return;
      }

      reset();
      setOpen(false);
      router.refresh();
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

  const dateChipLabel = date === todayStr ? "Today" : format(parseISO(date), "MMM d");
  const repeatChipLabel = schedule === null ? "Never" : describeSchedule(schedule);
  const buddyName = buddies.find((b) => b.id === sharedBuddyId)?.name;

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

          <Tabs value={mode} onValueChange={(v) => handleModeChange((v ?? "single") as "single" | "batch")}>
            <TabsList className="w-full">
              <TabsTrigger value="single" className="flex-1">
                Single Task
              </TabsTrigger>
              <TabsTrigger value="batch" className="flex-1">
                Batch Mode
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-3">
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
              <div className="flex items-center gap-2">
                <Input
                  id="new-task-title"
                  placeholder="What needs to be done?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-base"
                  autoFocus
                />
                <VoiceInputButton onTranscript={(text) => setTitle((prev) => (prev ? `${prev} ${text}` : text))} />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger
                  render={
                    <Chip>
                      <CalendarDays /> {dateChipLabel}
                    </Chip>
                  }
                />
                <PopoverContent>
                  <DateLabel id="new-task-date" label="Date" value={date} onChange={setDate} min={todayStr} />
                </PopoverContent>
              </Popover>

              {!batchMode && !sharedTask && (
                <Popover>
                  <PopoverTrigger
                    render={
                      <Chip active={schedule !== null}>
                        <Repeat /> Repeat: {repeatChipLabel}
                      </Chip>
                    }
                  />
                  <PopoverContent className="w-80">
                    <RepeatPicker value={schedule} onChange={setSchedule} allowOnce anchorDate={date} />
                  </PopoverContent>
                </Popover>
              )}

              <Popover>
                <PopoverTrigger
                  render={
                    <Chip active={Boolean(category.trim())}>
                      <Tag /> {category.trim() || "Category"}
                    </Chip>
                  }
                />
                <PopoverContent>
                  <div className="space-y-2">
                    <Label htmlFor="new-task-category">Category / list</Label>
                    <Input
                      id="new-task-category"
                      list="task-category-options"
                      placeholder='e.g. "Work", "Personal"'
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      autoFocus
                    />
                    <datalist id="task-category-options">
                      {categoryOptions.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </PopoverContent>
              </Popover>

              {!batchMode && (
                <Popover>
                  <PopoverTrigger
                    render={
                      <Chip active={Boolean(notificationTime)}>
                        <Bell /> {notificationTime || "Reminder"}
                      </Chip>
                    }
                  />
                  <PopoverContent>
                    <div className="space-y-2">
                      <Label htmlFor="new-task-time">Notification time</Label>
                      <Input
                        id="new-task-time"
                        type="time"
                        value={notificationTime}
                        onChange={(e) => setNotificationTime(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Get a push notification for this task specifically, instead of a generic daily nudge.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {!batchMode && buddies.length > 0 && (
                <Popover>
                  <PopoverTrigger
                    render={
                      <Chip active={sharedTask}>
                        <Users /> {sharedTask && buddyName ? `With ${buddyName}` : "Solo"}
                      </Chip>
                    }
                  />
                  <PopoverContent className="w-80">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="shared-task" className="cursor-pointer text-sm font-normal">
                          Co-op / Shared Task
                        </Label>
                        <Switch id="shared-task" checked={sharedTask} onCheckedChange={setSharedTask} />
                      </div>
                      {sharedTask && (
                        <>
                          <div className="space-y-2">
                            <Label>Buddy</Label>
                            <Select value={sharedBuddyId} onValueChange={(v) => setSharedBuddyId(v ?? "")}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose a buddy" />
                              </SelectTrigger>
                              <SelectContent>
                                {buddies.map((b) => (
                                  <SelectItem key={b.id} value={b.id}>
                                    {b.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Completion</Label>
                            <Select
                              value={completionMode}
                              onValueChange={(v) => setCompletionMode((v ?? "INDEPENDENT") as SharedCompletionMode)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SHARED_COMPLETION_MODES.map((m) => (
                                  <SelectItem key={m} value={m}>
                                    {SHARED_COMPLETION_MODE_LABELS[m]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Both of you get your own copy of this task and must each submit your own proof.
                          </p>
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {!batchMode &&
              (showDescription ? (
                <div className="space-y-2">
                  <Label htmlFor="new-task-description">Description</Label>
                  <Textarea
                    id="new-task-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    autoFocus
                  />
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowDescription(true)}>
                  <Plus /> Add description
                </Button>
              ))}
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
