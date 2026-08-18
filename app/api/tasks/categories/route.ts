import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Powers the category input's <datalist> autocomplete — the user's own
// previously-used category strings, most recent first. No separate
// managed-category entity; this is just a distinct-values lookup.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.dailyTask.findMany({
    where: { userId: session.user.id, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(rows.map((r) => r.category).filter(Boolean));
}
