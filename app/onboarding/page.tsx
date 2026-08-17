import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const metadata: Metadata = { title: "Set Your Terms" };

export default async function OnboardingPage() {
  const user = await requireUser();
  if (user.onboardingComplete) redirect("/dashboard");

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Set your terms</h1>
        <p className="mt-1 text-muted-foreground">
          Choose what happens when you don&apos;t follow through.
        </p>
      </div>
      <OnboardingForm defaultWalletBalance={user.walletBalance} nextPath="/onboarding/buddy" />
    </div>
  );
}
