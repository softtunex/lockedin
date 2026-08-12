"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function InviteResponse({ inviteId, fromName }: { inviteId: string; fromName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);

  async function respond(action: "accept" | "decline") {
    setBusy(action);
    const res = await fetch(`/api/buddy/requests/${inviteId}`, {
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
    if (action === "accept") {
      toast.success(`You and ${fromName} are paired up`);
      router.push("/buddy");
    } else {
      toast.success("Invite declined");
      router.push("/dashboard");
    }
  }

  return (
    <div className="flex gap-3">
      <Button className="flex-1" disabled={busy !== null} onClick={() => respond("accept")}>
        {busy === "accept" && <Spinner />} Accept
      </Button>
      <Button variant="outline" className="flex-1" disabled={busy !== null} onClick={() => respond("decline")}>
        {busy === "decline" && <Spinner />} Decline
      </Button>
    </div>
  );
}
