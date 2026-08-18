"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Spinner } from "@/components/ui/spinner";
import { Trash2 } from "lucide-react";
import { isWithinDeleteWindow } from "@/lib/date";
import type { TaskWithProofs } from "./task-list";

export function EditTaskModal({
  task,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: {
  task: TaskWithProofs | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (task: TaskWithProofs) => void;
  onDeleted: (taskId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notificationTime, setNotificationTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = Boolean(task) && !task!.isPenaltyTask && isWithinDeleteWindow(new Date(task!.createdAt));

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setNotificationTime(task.dueTime ?? "");
    }
  }, [task]);

  async function handleSave() {
    if (!task) return;
    setSaving(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, dueTime: notificationTime }),
    });
    setSaving(false);

    if (!res.ok) {
      toast.error("Failed to save changes");
      return;
    }

    const updated = await res.json();
    onSaved({ ...task, ...updated });
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!task) return;
    setDeleting(true);
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    setDeleting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to delete task");
      return;
    }

    onDeleted(task.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notification-time">Notification time</Label>
            <Input
              id="edit-notification-time"
              type="time"
              value={notificationTime}
              onChange={(e) => setNotificationTime(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Spinner />} {saving ? "Saving..." : "Save changes"}
          </Button>
          {canDelete && (
            <Button
              onClick={handleDelete}
              disabled={deleting}
              variant="destructive-solid"
              className="w-full"
            >
              {deleting ? <Spinner /> : <Trash2 className="h-4 w-4" />} {deleting ? "Deleting..." : "Delete task"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
