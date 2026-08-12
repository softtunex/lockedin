import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const goal = await prisma.goal.findFirst({
    where: { id, userId: session.user.id },
    include: { tasks: { orderBy: { scheduledDate: "asc" } } },
  });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(goal);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.goal.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await safeJson(request)) as Record<string, unknown> | null;
  const data: Record<string, unknown> = {};
  if (typeof body?.title === "string") data.title = body.title;
  if (typeof body?.description === "string") data.description = body.description;
  if (typeof body?.status === "string") data.status = body.status;

  const goal = await prisma.goal.update({ where: { id }, data });
  return NextResponse.json(goal);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.goal.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
