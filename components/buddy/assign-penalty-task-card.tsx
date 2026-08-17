"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { ClipboardEdit } from "lucide-react";

export function AssignPenaltyTaskCard({ taskId, buddyName }: { taskId: string; buddyName: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [assigned, setAssigned] = useState(false);

  async function submit() {
    if (!title.trim()) {
      toast.error("Give the task a title");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/buddy/penalty-task/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Couldn't assign task");
      return;
    }

    setAssigned(true);
    router.refresh();
  }

  if (assigned) {
    return (
      <Card>
        <CardContent className="p-3 text-sm text-muted-foreground">Task assigned to {buddyName}.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-2.5 p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ClipboardEdit className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          {buddyName} missed a task — write their penalty task
        </div>
        <Input
          placeholder='e.g. "50 pushups and send a video"'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          placeholder="Optional details"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <Button type="button" size="sm" disabled={submitting || !title.trim()} onClick={submit}>
          {submitting && <Spinner />} {submitting ? "Assigning..." : "Assign task"}
        </Button>
      </CardContent>
    </Card>
  );
}
