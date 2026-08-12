import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { creditWallet } from "@/lib/wallet";
import { walletTopupSchema } from "@/lib/validations";
import { safeJson } from "@/lib/api";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await safeJson(request);
  const parsed = walletTopupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  await creditWallet(session.user.id, parsed.data.amount, "Wallet top-up");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  return NextResponse.json({ walletBalance: user?.walletBalance ?? 0 });
}
