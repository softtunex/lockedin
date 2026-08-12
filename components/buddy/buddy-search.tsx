"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Search, Mail } from "lucide-react";

type SearchResult = { id: string; username: string | null; name: string };

export function BuddySearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  async function runSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    setSearching(false);
    if (res.ok) setResults(await res.json());
  }

  async function sendRequest(toUserId: string) {
    setSendingId(toUserId);
    const res = await fetch("/api/buddy/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId }),
    });
    setSendingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Couldn't send request");
      return;
    }
    toast.success("Request sent");
    setResults((r) => r.filter((u) => u.id !== toUserId));
    router.refresh();
  }

  async function sendEmailInvite(e: React.FormEvent) {
    e.preventDefault();
    setSendingEmail(true);
    const res = await fetch("/api/buddy/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toEmail: email }),
    });
    setSendingEmail(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Couldn't send invite");
      return;
    }
    toast.success(`Invite sent to ${email}`);
    setEmail("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="buddy-search">Find someone by username, name, or email</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="buddy-search"
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Search..."
            className="pl-9"
          />
        </div>

        {searching && <p className="text-xs text-muted-foreground">Searching…</p>}

        <div className="space-y-2">
          {results.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                </div>
                <Button size="sm" disabled={sendingId === u.id} onClick={() => sendRequest(u.id)}>
                  {sendingId === u.id && <Spinner />} Invite
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <Label htmlFor="buddy-email">Or invite by email</Label>
        <form onSubmit={sendEmailInvite} className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="buddy-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={sendingEmail}>
            {sendingEmail && <Spinner />} Send Invite
          </Button>
        </form>
      </div>
    </div>
  );
}
