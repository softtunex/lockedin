import { requireOnboardedUser, getUnresolvedMandatoryPenalty } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/sidebar";
import { LockoutBanner } from "@/components/dashboard/lockout-banner";

async function getBuddyBadgeCount(userId: string) {
  const [pendingInvites, pendingProofReviews, pendingPassRequests] = await Promise.all([
    prisma.buddyInvite.count({ where: { toUserId: userId, status: "PENDING" } }),
    prisma.proofVerification.count({ where: { reviewerId: userId, status: "PENDING" } }),
    prisma.emergencyPassUse.count({ where: { buddyUserId: userId, status: "PENDING" } }),
  ]);
  return pendingInvites + pendingProofReviews + pendingPassRequests;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();
  const [buddyBadgeCount, unresolvedMandatoryPenalty] = await Promise.all([
    getBuddyBadgeCount(user.id),
    getUnresolvedMandatoryPenalty(user.id),
  ]);
  const locked = Boolean(unresolvedMandatoryPenalty);

  return (
    <div className="flex min-h-screen flex-col bg-background sm:flex-row">
      <Sidebar streak={user.currentStreak} buddyBadgeCount={buddyBadgeCount} />
      <div className="min-w-0 flex-1">
        {locked && <LockoutBanner />}
        <main className="px-4 py-6 pb-24 sm:px-8 sm:py-8 sm:pb-8">{children}</main>
      </div>
    </div>
  );
}
