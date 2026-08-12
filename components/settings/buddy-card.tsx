import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HeartHandshake } from "lucide-react";

export function BuddyCard({ buddies }: { buddies: { id: string; name: string }[] }) {
  if (buddies.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HeartHandshake className="h-4 w-4" />
            No accountability partners yet.
          </div>
          <Button size="sm" render={<Link href="/buddy" />} nativeButton={false}>
            Find a buddy
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2 text-sm">
          <HeartHandshake className="h-4 w-4 text-primary" />
          Paired with <span className="font-medium">{buddies.map((b) => b.name).join(", ")}</span>
        </div>
        <Button size="sm" variant="outline" render={<Link href="/buddy" />} nativeButton={false}>
          Manage in Buddy Hub
        </Button>
      </CardContent>
    </Card>
  );
}
