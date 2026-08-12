"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

type Invite = {
  id: string;
  fromUser?: { name: string } | null;
  toUser?: { name: string } | null;
  toEmail: string | null;
};

export function PendingRequests({ incoming, outgoing }: { incoming: Invite[]; outgoing: Invite[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function respond(id: string, action: "accept" | "decline") {
    setBusyId(id);
    const res = await fetch(`/api/buddy/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Something went wrong");
      return;
    }
    toast.success(action === "accept" ? "You're paired up!" : "Request declined");
    router.refresh();
  }

  if (incoming.length === 0 && outgoing.length === 0) return null;

  return (
    <div className="space-y-4">
      {incoming.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Requests for you</h3>
          <div className="space-y-2">
            {incoming.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <p className="text-sm">{inv.fromUser?.name ?? "Someone"} wants to be your buddy</p>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busyId === inv.id} onClick={() => respond(inv.id, "accept")}>
                      {busyId === inv.id && <Spinner />} Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === inv.id}
                      onClick={() => respond(inv.id, "decline")}
                    >
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Sent</h3>
          <div className="space-y-2">
            {outgoing.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="p-3 text-sm text-muted-foreground">
                  Waiting on {inv.toUser?.name ?? inv.toEmail ?? "a response"}…
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
