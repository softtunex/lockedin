import { prisma } from "./prisma";

// Virtual wallet — no real payment provider wired up yet (would need a
// Paystack/Flutterwave account + API keys). creditWallet is called by the
// manual top-up endpoint today; swapping in real charging later just means
// calling creditWallet from a payment-webhook handler instead.
export async function creditWallet(userId: string, amount: number, reason: string): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { walletBalance: { increment: amount } } }),
    prisma.walletTransaction.create({ data: { userId, type: "CREDIT", amount, reason } }),
  ]);
}

// No floor — a negative balance is the intended real consequence of a
// FINANCIAL_STAKE penalty firing with insufficient funds.
export async function debitWallet(userId: string, amount: number, reason: string): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { walletBalance: { decrement: amount }, penaltyOwedTotal: { increment: amount } },
    }),
    prisma.walletTransaction.create({ data: { userId, type: "DEBIT", amount, reason } }),
  ]);
}
