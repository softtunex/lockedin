"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Send } from "lucide-react";

export function BuddyMessageForm({ buddyUserId }: { buddyUserId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    const res = await fetch("/api/buddy/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: buddyUserId, message: message.trim() }),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Couldn't send message");
      return;
    }
    setMessage("");
    toast.success("Message sent");
    router.refresh();
  }

  return (
    <form onSubmit={send} className="flex gap-2">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Drop a quick message..."
        maxLength={300}
        aria-label="Message your buddy"
      />
      <Button type="submit" variant="secondary" disabled={sending || !message.trim()}>
        {sending ? <Spinner /> : <Send className="h-4 w-4" />} Send
      </Button>
    </form>
  );
}
