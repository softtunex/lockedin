"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { UploadCloud, X } from "lucide-react";
import type { TaskWithProofs } from "./task-list";
import { BADGE_CATALOG, type BadgeKey } from "@/lib/badge-catalog";

function inferProofType(text: string): "URL" | "TEXT" {
  return /^https?:\/\//i.test(text.trim()) ? "URL" : "TEXT";
}

export function ProofModal({
  task,
  open,
  onOpenChange,
  onCompleted,
}: {
  task: TaskWithProofs | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: (task: TaskWithProofs) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setFile(null);
    setText("");
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  async function handleSubmit() {
    if (!task) return;

    if (!file && text.trim().length === 0) {
      toast.error("Attach a screenshot or add an evidence link / note");
      return;
    }

    setSubmitting(true);
    let res: Response;

    if (file) {
      const form = new FormData();
      form.set("proofType", "IMAGE");
      form.set("file", file);
      res = await fetch(`/api/tasks/${task.id}/proof`, { method: "POST", body: form });
    } else {
      res = await fetch(`/api/tasks/${task.id}/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofType: inferProofType(text), proofData: text.trim() }),
      });
    }

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to submit proof");
      return;
    }

    const data = await res.json();
    toast.success("Proof submitted. Task complete.");
    for (const key of data.newBadges ?? []) {
      const badge = BADGE_CATALOG[key as BadgeKey];
      if (badge) toast(`🏅 Badge earned: ${badge.label}`, { description: badge.description });
    }
    onCompleted({ ...task, status: "COMPLETED", isMuted: true, proofs: [data.proof, ...task.proofs] });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg">Verification Required: {task?.title}</DialogTitle>
          <DialogDescription>Proof of execution is mandatory to check off this task.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:bg-muted/50",
            )}
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center gap-2 text-sm font-medium">
                {file.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setFile(null);
                  }}
                  aria-label="Remove file"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Drag and drop screenshot</p>
                <p className="text-xs text-muted-foreground">or click to browse</p>
              </>
            )}
          </label>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proof-text" className="text-[11px] font-bold uppercase tracking-wider">
              Evidence link / notes
            </Label>
            <Textarea
              id="proof-text"
              placeholder="e.g., github.com/commit/... or a summary of what you did"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Spinner />} {submitting ? "Verifying..." : "Verify & Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
