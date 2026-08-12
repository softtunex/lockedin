"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { subscribeToPush } from "@/lib/push-client";
import { Bell, Send } from "lucide-react";

export function NotificationSettings() {
  const [status, setStatus] = useState<"idle" | "subscribing" | "subscribed">("idle");
  const [testing, setTesting] = useState(false);

  async function handleEnable() {
    setStatus("subscribing");
    const result = await subscribeToPush();

    if (result === "unsupported") {
      toast.error("Push notifications aren't supported in this browser, or VAPID keys aren't configured.");
      setStatus("idle");
      return;
    }
    if (result === "denied") {
      toast.error("Notification permission was denied.");
      setStatus("idle");
      return;
    }

    setStatus("subscribed");
    toast.success("Reminders enabled on this device.");
  }

  async function handleTest() {
    setTesting(true);
    const res = await fetch("/api/push/test", { method: "POST" });
    setTesting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to send test notification");
      return;
    }
    toast.success("Test notification sent.");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={handleEnable} disabled={status === "subscribing"}>
        <Bell className="h-4 w-4" />
        {status === "subscribed" ? "Notifications enabled" : "Enable notifications on this device"}
      </Button>
      <Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
        <Send className="h-4 w-4" />
        {testing ? "Sending..." : "Send test notification"}
      </Button>
    </div>
  );
}
