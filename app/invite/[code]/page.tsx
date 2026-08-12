import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { InviteResponse } from "@/components/buddy/invite-response";

export const metadata: Metadata = { title: "Buddy Invite" };

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireUser();

  const invite = await prisma.buddyInvite.findUnique({
    where: { inviteCode: code },
    include: { fromUser: { select: { name: true } } },
  });

  if (!invite || invite.status !== "PENDING") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12 text-center">
        <h1 className="text-xl font-semibold">This invite isn&apos;t available</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may have already been used or canceled.</p>
      </div>
    );
  }

  const isRecipient =
    invite.toUserId === user.id || (invite.toUserId === null && invite.toEmail === user.email);
  if (!isRecipient) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Accountability partner invite</h1>
        <p className="mt-2 text-muted-foreground">
          <span className="font-medium text-foreground">{invite.fromUser.name}</span> wants to pair up with you.
        </p>
      </div>
      <InviteResponse inviteId={invite.id} fromName={invite.fromUser.name} />
    </div>
  );
}
