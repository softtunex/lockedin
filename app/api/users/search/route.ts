import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: {
      id: { not: session.user.id },
      OR: [
        { username: { contains: q } },
        { name: { contains: q } },
        { email: { contains: q } },
      ],
    },
    select: { id: true, username: true, name: true },
    take: 10,
  });

  return NextResponse.json(users);
}
