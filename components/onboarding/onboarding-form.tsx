"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  PENALTY_DESCRIPTIONS,
  PENALTY_LABELS,
  SELECTABLE_PENALTY_PREFERENCES,
  type SelectablePenaltyPreference,
} from "@/lib/enums";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { formatNaira } from "@/lib/currency";

export function OnboardingForm({
  defaultReminderTimes,
  defaultPenaltyPreference = "MANDATORY_TASK",
  defaultAccountabilityEmail = "",
  defaultPenaltyStakeAmount = "500",
  defaultWalletBalance = 0,
  mode = "onboarding",
  nextPath = "/dashboard",
}: {
  defaultReminderTimes: string[];
  defaultPenaltyPreference?: SelectablePenaltyPreference;
  defaultAccountabilityEmail?: string;
  defaultPenaltyStakeAmount?: string;
  defaultWalletBalance?: number;
  mode?: "onboarding" | "settings";
  nextPath?: string;
}) {
  const router = useRouter();
  const [penaltyPreference, setPenaltyPreference] = useState<SelectablePenaltyPreference>(defaultPenaltyPreference);
  const [accountabilityEmail, setAccountabilityEmail] = useState(defaultAccountabilityEmail);
  const [penaltyStakeAmount, setPenaltyStakeAmount] = useState(defaultPenaltyStakeAmount);
  const shortfall = Math.max(0, Number(defaultPenaltyStakeAmount) - defaultWalletBalance);
  const [walletTopUp, setWalletTopUp] = useState(String(shortfall));
  const [reminderTimes, setReminderTimes] = useState<string[]>(defaultReminderTimes);
  const [newTime, setNewTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function addReminderTime() {
    if (!newTime) return;
    if (reminderTimes.includes(newTime)) return;
    setReminderTimes([...reminderTimes, newTime].sort());
    setNewTime("");
  }

  function removeReminderTime(time: string) {
    setReminderTimes(reminderTimes.filter((t) => t !== time));
  }

  async function handleSubmit() {
    if (reminderTimes.length === 0) {
      toast.error("Add at least one reminder time");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        penaltyPreference,
        accountabilityEmail,
        penaltyStakeAmount: Number(penaltyStakeAmount) || undefined,
        walletTopUp: Number(walletTopUp) || 0,
        reminderTimes,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Something went wrong");
      return;
    }

    if (mode === "onboarding") {
      toast.success("Terms set. Let's go.");
      router.push(nextPath);
    } else {
      toast.success("Settings saved.");
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          If you miss a task, what happens?
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SELECTABLE_PENALTY_PREFERENCES.map((type) => (
            <Card
              key={type}
              onClick={() => setPenaltyPreference(type)}
              className={cn(
                "min-h-11 cursor-pointer border-border/50 shadow-sm transition-all hover:border-primary/40 hover:shadow-md",
                penaltyPreference === type && "border-primary bg-primary/5 ring-1 ring-primary",
              )}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                    penaltyPreference === type ? "border-primary" : "border-muted-foreground/40",
                  )}
                >
                  {penaltyPreference === type && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
                <div>
                  <p className="font-medium">{PENALTY_LABELS[type]}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{PENALTY_DESCRIPTIONS[type]}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {penaltyPreference === "SHAME_POST" && (
        <section className="space-y-2">
          <Label htmlFor="accountabilityEmail">Accountability buddy email (optional)</Label>
          <Input
            id="accountabilityEmail"
            type="email"
            placeholder="buddy@example.com"
            value={accountabilityEmail}
            onChange={(e) => setAccountabilityEmail(e.target.value)}
          />
        </section>
      )}

      {penaltyPreference === "FINANCIAL_STAKE" && (
        <section className="space-y-4 rounded-lg border border-border p-4">
          <div className="space-y-2">
            <Label htmlFor="stake">Stake per missed task (₦)</Label>
            <Input
              id="stake"
              type="number"
              min={1}
              step="1"
              value={penaltyStakeAmount}
              onChange={(e) => setPenaltyStakeAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Deducted from your wallet balance in real time when a task fails.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="walletTopUp">Fund your wallet now (₦)</Label>
            <Input
              id="walletTopUp"
              type="number"
              min={0}
              step="1"
              value={walletTopUp}
              onChange={(e) => setWalletTopUp(e.target.value)}
            />
            {(() => {
              const projected = defaultWalletBalance + (Number(walletTopUp) || 0);
              const needed = Number(penaltyStakeAmount) || 0;
              const covered = projected >= needed && needed > 0;
              return (
                <p className={cn("text-xs", covered ? "text-amber-600" : "text-destructive")}>
                  Current balance {formatNaira(defaultWalletBalance)} + this top-up ={" "}
                  {formatNaira(projected)}.{" "}
                  {covered
                    ? "That covers your stake."
                    : `You need at least ${formatNaira(Math.max(0, needed - projected))} more to enable Financial Stake.`}
                </p>
              );
            })()}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          When should we nudge you?
        </h2>
        <div className="flex flex-wrap gap-2">
          {reminderTimes.map((time) => (
            <span
              key={time}
              className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm"
            >
              {time}
              <button
                type="button"
                onClick={() => removeReminderTime(time)}
                className="relative text-muted-foreground before:absolute before:-inset-2.5 before:content-[''] hover:text-foreground"
                aria-label={`Remove ${time}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="h-11 w-40 sm:h-8" />
          <Button type="button" variant="secondary" className="h-11 sm:h-8" onClick={addReminderTime}>
            Add time
          </Button>
        </div>
      </section>

      <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
        {submitting && <Spinner />} {submitting ? "Saving..." : mode === "onboarding" ? "Start tracking" : "Save settings"}
      </Button>
    </div>
  );
}
