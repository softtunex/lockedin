import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { BuddySearch } from "@/components/buddy/buddy-search";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Find a Buddy" };

export default async function OnboardingBuddyPage() {
  const user = await requireUser();
  if (!user.onboardingComplete) redirect("/onboarding");

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Want an accountability partner?</h1>
        <p className="mt-1 text-muted-foreground">
          Pair with someone who sees your progress, nudges you, and gets alerted if you fall behind. Optional —
          you can always do this later from Settings.
        </p>
      </div>

      <BuddySearch />

      <Button render={<Link href="/dashboard" />} nativeButton={false} variant="ghost" className="mt-8 self-center">
        Skip for now
      </Button>
    </div>
  );
}
