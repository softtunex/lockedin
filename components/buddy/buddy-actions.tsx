"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Bell, UserX } from "lucide-react";

export function NudgeButton({ buddyUserId }: { buddyUserId: string }) {
  const [sending, setSending] = useState(false);

  async function nudge() {
    setSending(true);
    const res = await fetch("/api/buddy/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buddyUserId }),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Couldn't send nudge");
      return;
    }
    toast.success("Nudge sent");
  }

  return (
    <Button variant="secondary" disabled={sending} onClick={nudge}>
      {sending ? <Spinner /> : <Bell className="h-4 w-4" />} Nudge
    </Button>
  );
}

export function UnpairButton({ buddyUserId }: { buddyUserId: string }) {
  const router = useRouter();
  const [unpairing, setUnpairing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function unpair() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setUnpairing(true);
    const res = await fetch("/api/buddy/unpair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buddyUserId }),
    });
    setUnpairing(false);
    if (!res.ok) {
      toast.error("Couldn't unpair");
      return;
    }
    toast.success("Unpaired");
    router.refresh();
  }

  return (
    <Button variant={confirming ? "destructive-solid" : "outline"} disabled={unpairing} onClick={unpair}>
      {unpairing ? <Spinner /> : <UserX className="h-4 w-4" />} {confirming ? "Confirm unpair?" : "Unpair"}
    </Button>
  );
}
