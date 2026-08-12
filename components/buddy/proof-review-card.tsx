"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link2, FileText, Check, X } from "lucide-react";

type Item = {
  id: string;
  taskTitle: string;
  proofType: string;
  proofData: string;
  isMandatoryResolution: boolean;
};

export function ProofReviewCard({ item }: { item: Item }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [resolved, setResolved] = useState<"approve" | "reject" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function respond(action: "approve" | "reject", rejectReason?: string) {
    setBusy(action);
    const res = await fetch(`/api/buddy/proof/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: rejectReason }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Something went wrong");
      return;
    }
    setRejectOpen(false);
    setResolved(action);
    router.refresh();
  }

  function confirmReject() {
    if (!reason.trim()) return;
    respond("reject", reason.trim());
  }

  if (resolved) {
    return (
      <Card>
        <CardContent className="p-3 text-sm text-muted-foreground">
          {resolved === "approve" ? "Approved" : "Rejected"} — {item.taskTitle}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{item.taskTitle}</p>
            {item.isMandatoryResolution && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                Mandatory — approval unlocks their account
              </span>
            )}
          </div>

          {item.proofType === "IMAGE" ? (
            <a href={item.proofData} target="_blank" rel="noreferrer">
              <Image
                src={item.proofData}
                alt={item.taskTitle}
                width={128}
                height={128}
                unoptimized
                className="h-32 w-32 rounded-md border border-border object-cover"
              />
            </a>
          ) : item.proofType === "URL" ? (
            <a
              href={item.proofData}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-1.5 text-sm text-primary underline break-all"
            >
              <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {item.proofData}
            </a>
          ) : (
            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {item.proofData}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            size="icon-sm"
            className="h-11 w-11 sm:h-7 sm:w-7"
            disabled={busy !== null}
            onClick={() => respond("approve")}
            aria-label="Approve"
          >
            {busy === "approve" ? <Spinner /> : <Check className="h-4 w-4" />}
          </Button>
          <Button
            size="icon-sm"
            variant="destructive"
            className="h-11 w-11 sm:h-7 sm:w-7"
            disabled={busy !== null}
            onClick={() => setRejectOpen(true)}
            aria-label="Reject"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this proof?</DialogTitle>
            <DialogDescription>
              Let them know what needs fixing — the task moves back to pending so they can redo it.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., The photo doesn't actually show the finished work"
            rows={3}
            maxLength={300}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive-solid" disabled={busy !== null || !reason.trim()} onClick={confirmReject}>
              {busy === "reject" && <Spinner />} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
