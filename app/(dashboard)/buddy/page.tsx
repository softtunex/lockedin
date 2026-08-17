import type { Metadata } from "next";
import { startOfWeek } from "date-fns";
import { requireOnboardedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { todayStart, todayEnd } from "@/lib/date";
import { getActiveBuddyPairs } from "@/lib/buddy";
import { StatCard } from "@/components/dashboard/stat-card";
import { BuddySearch } from "@/components/buddy/buddy-search";
import { PendingRequests } from "@/components/buddy/pending-requests";
import { ProofReviewCard } from "@/components/buddy/proof-review-card";
import { AssignPenaltyTaskCard } from "@/components/buddy/assign-penalty-task-card";
import { EmergencyPassReviewCard } from "@/components/buddy/emergency-pass-review-card";
import { RequestEmergencyPass } from "@/components/buddy/request-emergency-pass";
import { EmergencyPassInfo } from "@/components/buddy/emergency-pass-info";
import { NudgeButton, UnpairButton } from "@/components/buddy/buddy-actions";
import { BuddyMessageForm } from "@/components/buddy/buddy-message-form";
import { BuddyTasksToday } from "@/components/buddy/buddy-tasks-today";
import { BuddyDirectory, type BuddySummary } from "@/components/buddy/buddy-directory";
import { Flame, Trophy } from "lucide-react";
import { format } from "date-fns";

const WEEKLY_PASS_LIMIT = 1;

export const metadata: Metadata = { title: "Buddy Hub" };

export default async function BuddyPage() {
  const user = await requireOnboardedUser();

  const [pairs, incoming, outgoing, myPendingTasks, myUsedThisWeek] = await Promise.all([
    getActiveBuddyPairs(user.id),
    prisma.buddyInvite.findMany({
      where: { toUserId: user.id, status: "PENDING" },
      include: { fromUser: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.buddyInvite.findMany({
      where: { fromUserId: user.id, status: "PENDING" },
      include: { toUser: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dailyTask.findMany({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "POSTPONED"] },
        scheduledDate: { gte: todayStart(), lte: todayEnd() },
      },
      select: { id: true, title: true },
    }),
    prisma.emergencyPassUse.count({
      where: {
        userId: user.id,
        status: { not: "DECLINED" },
        requestedAt: { gte: startOfWeek(new Date(), { weekStartsOn: 0 }) },
      },
    }),
  ]);

  const passesAvailable = Math.max(0, WEEKLY_PASS_LIMIT - myUsedThisWeek);
  const buddyIds = pairs.map((pair) => (pair.user1Id === user.id ? pair.user2Id : pair.user1Id));

  const buddyDetails = await Promise.all(
    buddyIds.map(async (buddyId) => {
      const [buddy, pendingProofReviews, pendingPassRequests, buddyTasksToday, buddyPendingTasks, messages, pendingAssignments] =
        await Promise.all([
          prisma.user.findUnique({ where: { id: buddyId }, select: { name: true, currentStreak: true, longestStreak: true } }),
          prisma.proofVerification.findMany({
            where: { reviewerId: user.id, status: "PENDING", proof: { dailyTask: { userId: buddyId } } },
            include: { proof: { include: { dailyTask: true } } },
            orderBy: { createdAt: "desc" },
          }),
          prisma.emergencyPassUse.findMany({
            where: { buddyUserId: user.id, userId: buddyId, status: "PENDING" },
            include: { user: { select: { name: true } } },
            orderBy: { requestedAt: "desc" },
          }),
          prisma.dailyTask.count({
            where: { userId: buddyId, scheduledDate: { gte: todayStart(), lte: todayEnd() } },
          }),
          prisma.dailyTask.findMany({
            where: {
              userId: buddyId,
              scheduledDate: { gte: todayStart(), lte: todayEnd() },
              status: { in: ["PENDING", "POSTPONED"] },
            },
            select: { id: true, title: true },
          }),
          prisma.buddyMessage.findMany({
            where: { OR: [{ fromUserId: user.id, toUserId: buddyId }, { fromUserId: buddyId, toUserId: user.id }] },
            orderBy: { createdAt: "desc" },
            take: 10,
          }),
          prisma.dailyTask.findMany({
            where: { userId: buddyId, isPenaltyTask: true, status: "PENDING_ASSIGNMENT" },
            select: { id: true },
          }),
        ]);

      const passTargets = await prisma.dailyTask.findMany({
        where: { id: { in: pendingPassRequests.map((p) => p.dailyTaskId) } },
        select: { id: true, title: true },
      });
      const taskTitleById = new Map(passTargets.map((t) => [t.id, t.title]));

      return {
        id: buddyId,
        name: buddy?.name ?? "Buddy",
        currentStreak: buddy?.currentStreak ?? 0,
        longestStreak: buddy?.longestStreak ?? 0,
        pendingProofReviews,
        pendingPassRequests,
        buddyTasksToday,
        buddyPendingTasks,
        messages,
        taskTitleById,
        pendingAssignments,
      };
    }),
  );

  const summaries: BuddySummary[] = buddyDetails.map((b) => ({
    id: b.id,
    name: b.name,
    currentStreak: b.currentStreak,
    pendingCount: b.pendingProofReviews.length + b.pendingPassRequests.length + b.pendingAssignments.length,
  }));

  const panels: Record<string, React.ReactNode> = {};
  for (const b of buddyDetails) {
    panels[b.id] = (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{b.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your accountability partner</p>
          </div>
          <div className="flex gap-2">
            <NudgeButton buddyUserId={b.id} />
            <UnpairButton buddyUserId={b.id} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Current Streak" value={`${b.currentStreak} days`} icon={Flame} />
          <StatCard label="Longest Streak" value={`${b.longestStreak} days`} icon={Trophy} />
          <BuddyTasksToday total={b.buddyTasksToday} tasks={b.buddyPendingTasks} />
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Messages</h3>
          <div className="space-y-3">
            <BuddyMessageForm buddyUserId={b.id} />
            {b.messages.length > 0 && (
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {b.messages.map((m) => (
                  <div key={m.id} className="rounded-md border border-border px-3 py-2 text-sm">
                    <span className="font-medium">{m.fromUserId === user.id ? "You" : b.name}: </span>
                    {m.message}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {format(new Date(m.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {b.pendingAssignments.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Penalty tasks to assign</h3>
            <div className="space-y-2">
              {b.pendingAssignments.map((t) => (
                <AssignPenaltyTaskCard key={t.id} taskId={t.id} buddyName={b.name} />
              ))}
            </div>
          </div>
        )}

        {b.pendingProofReviews.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Proof to review</h3>
            <div className="space-y-2">
              {b.pendingProofReviews.map((v) => (
                <ProofReviewCard
                  key={v.id}
                  item={{
                    id: v.id,
                    taskTitle: v.proof.dailyTask.title,
                    proofType: v.proof.proofType,
                    proofData: v.proof.proofData,
                    isMandatoryResolution: v.isMandatoryResolution,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {b.pendingPassRequests.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Emergency pass requests</h3>
            <div className="space-y-2">
              {b.pendingPassRequests.map((p) => (
                <EmergencyPassReviewCard
                  key={p.id}
                  id={p.id}
                  requesterName={p.user.name}
                  taskTitle={b.taskTitleById.get(p.dailyTaskId) ?? "a task"}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Need a pass today?</h3>
          <div className="space-y-3">
            <EmergencyPassInfo available={passesAvailable} limit={WEEKLY_PASS_LIMIT} />
            <RequestEmergencyPass tasks={myPendingTasks} buddyUserId={b.id} available={passesAvailable} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Buddy Hub</h1>
        <p className="mt-1 text-muted-foreground">
          Your accountability partners — pair up with more people who can see your progress, nudge you, and back
          you up.
        </p>
      </div>

      <PendingRequests incoming={incoming} outgoing={outgoing} />
      <BuddySearch />

      {summaries.length > 0 ? (
        <BuddyDirectory buddies={summaries} panels={panels} />
      ) : (
        <p className="text-sm text-muted-foreground">No accountability partners yet — invite one above.</p>
      )}
    </div>
  );
}
