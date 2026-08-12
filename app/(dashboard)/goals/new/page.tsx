import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOnboardedUser, getUnresolvedMandatoryPenalty, getWalletDeficit } from "@/lib/session";
import { GoalWizard } from "@/components/goals/goal-wizard";

export const metadata: Metadata = { title: "New Goal" };

export default async function NewGoalPage() {
  const user = await requireOnboardedUser();
  const blockingPenalty = await getUnresolvedMandatoryPenalty(user.id);
  if (blockingPenalty) redirect("/penalty-lock");

  const walletDeficit = await getWalletDeficit(user.id);
  if (walletDeficit !== null) redirect("/settings?insufficientFunds=1");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Initialize Goal</h1>
        <p className="mt-1 text-muted-foreground">Commit to a path. Define the steps. Execute.</p>
      </div>
      <GoalWizard />
    </div>
  );
}
