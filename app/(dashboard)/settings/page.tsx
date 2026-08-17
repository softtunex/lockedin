import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { WalletPanel } from "@/components/settings/wallet-panel";
import { BadgesGrid } from "@/components/settings/badges-grid";
import { BuddyCard } from "@/components/settings/buddy-card";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { StatCard } from "@/components/dashboard/stat-card";
import { PENALTY_LABELS, type PenaltyType, type SelectablePenaltyPreference } from "@/lib/enums";
import { backfillBadgesFromHistory } from "@/lib/badges";
import { getBuddyIds } from "@/lib/buddy";
import { Flame, Trophy, ShieldAlert } from "lucide-react";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ insufficientFunds?: string }>;
}) {
  const user = await requireOnboardedUser();
  const { insufficientFunds } = await searchParams;

  // Catches any badge the user already qualifies for but never got checked
  // for — e.g. milestones reached before this badge existed in the catalog,
  // or before a given trigger point was wired up. Idempotent, cheap enough
  // to run on every Settings visit.
  await backfillBadgesFromHistory(user.id);

  const [transactions, badges, buddyIds] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.userBadge.findMany({ where: { userId: user.id } }),
    getBuddyIds(user.id),
  ]);
  const buddies = buddyIds.length
    ? await prisma.user.findMany({ where: { id: { in: buddyIds } }, select: { id: true, name: true } })
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-muted-foreground">Your terms, reminders, and standing.</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Current Streak"
          value={`${user.currentStreak} days`}
          icon={Flame}
          iconClassName={user.currentStreak > 0 ? "animate-pulse text-orange-500" : undefined}
        />
        <StatCard label="Longest Streak" value={`${user.longestStreak} days`} icon={Trophy} />
        <StatCard
          label="Penalty Preference"
          value={PENALTY_LABELS[user.penaltyPreference as PenaltyType]}
          icon={ShieldAlert}
          mono={false}
          className="[&_p]:text-base"
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Wallet</h2>
        <WalletPanel
          balance={user.walletBalance}
          transactions={transactions}
          showDeficitWarning={insufficientFunds === "1"}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Badges</h2>
        <BadgesGrid earned={badges} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Accountability Partner</h2>
        <BuddyCard buddies={buddies} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Reminder notifications</h2>
        <NotificationSettings />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Terms</h2>
        <OnboardingForm
          mode="settings"
          defaultPenaltyPreference={user.penaltyPreference as SelectablePenaltyPreference}
          defaultAccountabilityEmail={user.accountabilityEmail ?? ""}
          defaultPenaltyStakeAmount={String(user.penaltyStakeAmount ?? 500)}
          defaultWalletBalance={user.walletBalance}
        />
      </div>
    </div>
  );
}
