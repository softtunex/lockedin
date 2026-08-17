import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardingSchema } from "@/lib/validations";
import { safeJson } from "@/lib/api";
import { creditWallet } from "@/lib/wallet";
import { formatNaira } from "@/lib/currency";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await safeJson(request);
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { penaltyPreference, accountabilityEmail, penaltyStakeAmount, walletTopUp } = parsed.data;

  const stakeAmount = penaltyStakeAmount ?? 500;

  if (penaltyPreference === "FINANCIAL_STAKE") {
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { walletBalance: true },
    });
    const projectedBalance = (currentUser?.walletBalance ?? 0) + (walletTopUp ?? 0);

    if (projectedBalance < stakeAmount) {
      const shortfall = stakeAmount - (currentUser?.walletBalance ?? 0);
      return NextResponse.json(
        {
          error: `Financial Stake needs money behind it. Fund your wallet with at least ${formatNaira(shortfall)} to cover one missed task.`,
        },
        { status: 400 },
      );
    }

    if (walletTopUp && walletTopUp > 0) {
      await creditWallet(session.user.id, walletTopUp, "Wallet top-up (onboarding)");
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      penaltyPreference,
      accountabilityEmail: accountabilityEmail || null,
      penaltyStakeAmount: penaltyPreference === "FINANCIAL_STAKE" ? stakeAmount : null,
      onboardingComplete: true,
    },
  });

  return NextResponse.json({ id: user.id });
}
