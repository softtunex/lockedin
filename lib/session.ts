import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Lazily backfills User.username for accounts created before buddy search
// existed — same idempotent-cheap-check pattern as backfillBadgesFromHistory.
async function ensureUsername<T extends { id: string; name: string }>(user: T) {
  const base = user.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20) || "user";

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      return await prisma.user.update({ where: { id: user.id }, data: { username: candidate } });
    } catch {
      // Unique constraint collision — retry with a new random suffix.
    }
  }
  return prisma.user.findUniqueOrThrow({ where: { id: user.id } });
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    // The session JWT is valid but its userId is gone from the DB (e.g. a
    // DB reset/migration under an already-logged-in browser). Route through
    // clear-session instead of straight to /login — otherwise the stale
    // cookie makes proxy.ts think this browser is logged in and bounces it
    // right back off of /login, looping forever.
    redirect("/api/auth/clear-session");
  }

  return user.username ? user : ensureUsername(user);
}

export async function requireOnboardedUser() {
  const user = await requireUser();
  if (!user.onboardingComplete) redirect("/onboarding");
  return user;
}

export async function getUnresolvedMandatoryPenalty(userId: string) {
  return prisma.penaltyLog.findFirst({
    where: { userId, penaltyType: "MANDATORY_TASK", isResolved: false },
    include: { dailyTask: true },
    orderBy: { createdAt: "desc" },
  });
}

// Financial Stake with a balance that's gone negative and never been paid
// back down is the same class of problem MANDATORY_TASK already solves for
// (real consequence, not just a number nobody has to act on) — same lock:
// no new goals until it's settled.
export async function getWalletDeficit(userId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true, penaltyPreference: true },
  });
  if (user?.penaltyPreference === "FINANCIAL_STAKE" && user.walletBalance < 0) {
    return user.walletBalance;
  }
  return null;
}
