import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBuddyIds } from "@/lib/buddy";

// { id, name }[] of the user's connected buddies — powers client-side
// pickers (Shared Task partner select) that need names, not just ids.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const buddyIds = await getBuddyIds(session.user.id);
  if (buddyIds.length === 0) return NextResponse.json([]);

  const buddies = await prisma.user.findMany({
    where: { id: { in: buddyIds } },
    select: { id: true, name: true },
  });

  return NextResponse.json(buddies);
}
