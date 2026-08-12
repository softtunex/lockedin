import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoalProgressBar } from "@/components/goals/goal-progress-bar";
import { TIMEFRAME_LABELS, type Timeframe } from "@/lib/enums";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Goals" };

export default async function GoalsPage() {
  const user = await requireOnboardedUser();
  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    include: { tasks: true },
    orderBy: { createdAt: "desc" },
  });

  // Resolved goals (completed or failed) sink to the bottom so active
  // commitments show first. Array.sort is stable, so the createdAt-desc
  // order from the query is preserved within each group.
  goals.sort((a, b) => Number(a.status !== "ACTIVE") - Number(b.status !== "ACTIVE"));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
          <p className="mt-1 text-muted-foreground">Everything you&apos;re committed to.</p>
        </div>
        <Button render={<Link href="/goals/new" />} nativeButton={false}>
          <Plus className="h-4 w-4" /> New goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No goals yet. Create one to get your daily action steps flowing.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const completed = goal.tasks.filter((t) => t.status === "COMPLETED").length;
            return (
              <Link key={goal.id} href={`/goals/${goal.id}`}>
                <Card className="h-full border-border/50 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{goal.title}</CardTitle>
                      <Badge variant={goal.status === "ACTIVE" ? "default" : "secondary"}>
                        {TIMEFRAME_LABELS[goal.timeframe as Timeframe]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {goal.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{goal.description}</p>
                    )}
                    <GoalProgressBar completed={completed} total={goal.tasks.length} />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
