"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ShieldCheck } from "lucide-react";

export function EmergencyPassReviewCard({ id, requesterName, taskTitle }: { id: string; requesterName: string; taskTitle: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [resolved, setResolved] = useState<"approve" | "decline" | null>(null);

  async function respond(action: "approve" | "decline") {
    setBusy(action);
    const res = await fetch(`/api/buddy/emergency-pass/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Something went wrong");
      return;
    }
    setResolved(action);
    router.refresh();
  }

  if (resolved) {
    return (
      <Card>
        <CardContent className="p-3 text-sm text-muted-foreground">
          {resolved === "approve" ? "Pass granted" : "Pass declined"} — {taskTitle}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-3">
        <div className="flex min-w-0 items-center gap-2">
          <ShieldCheck className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm">
            {requesterName} wants a pass on <span className="font-medium">{taskTitle}</span>
          </span>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" disabled={busy !== null} onClick={() => respond("approve")}>
            {busy === "approve" && <Spinner />} Approve
          </Button>
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => respond("decline")}>
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
