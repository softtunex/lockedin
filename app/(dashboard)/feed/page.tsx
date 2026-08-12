import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Megaphone } from "lucide-react";

export const metadata: Metadata = { title: "Feed" };

export default async function FeedPage() {
  await requireOnboardedUser();

  const posts = await prisma.penaltyLog.findMany({
    where: { penaltyType: "SHAME_POST" },
    include: { dailyTask: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shame feed</h1>
        <p className="mt-1 text-muted-foreground">
          Missed tasks from everyone who chose the social-wall penalty. Public and permanent.
        </p>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nobody has missed a task yet. Keep it that way.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <Avatar>
                  <AvatarFallback>{post.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{post.user.name}</span>{" "}
                    <span className="text-muted-foreground">missed</span>{" "}
                    <span className="font-medium">&quot;{post.dailyTask.title}&quot;</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Megaphone className="h-3 w-3" />
                    {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
