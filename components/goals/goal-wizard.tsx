"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addMonths, addYears, format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DateLabel } from "@/components/ui/date-label";
import { Spinner } from "@/components/ui/spinner";
import { Stepper } from "@/components/goals/stepper";
import { Plus, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIMEFRAMES, TIMEFRAME_LABELS, isSingleTaskTimeframe, type Timeframe } from "@/lib/enums";
import { BADGE_CATALOG, type BadgeKey } from "@/lib/badge-catalog";
import { RepeatPicker } from "@/components/shared/repeat-picker";
import type { ScheduleRule } from "@/lib/schedule";

type Step = {
  id: string;
  title: string;
  description: string;
  schedule: ScheduleRule;
  // Duration bounds — unset means "whenever the goal itself runs."
  startDate?: string;
  endDate?: string;
  // Informational due time, display-only.
  timeOfDay?: string;
};

function newStep(): Step {
  return { id: crypto.randomUUID(), title: "", description: "", schedule: { frequency: "DAILY" } };
}

function defaultEndDate(timeframe: Timeframe, start: Date): string {
  switch (timeframe) {
    case "DAILY":
    case "TEST_10S":
      return format(start, "yyyy-MM-dd");
    case "MONTHLY":
      return format(addMonths(start, 1), "yyyy-MM-dd");
    case "SIX_MONTHS":
      return format(addMonths(start, 6), "yyyy-MM-dd");
    case "YEARLY":
      return format(addYears(start, 1), "yyyy-MM-dd");
    case "CUSTOM":
      return format(addMonths(start, 1), "yyyy-MM-dd");
  }
}

export function GoalWizard() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const todayStr = format(today, "yyyy-MM-dd");

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeframe, setTimeframe] = useState<Timeframe>("MONTHLY");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(defaultEndDate("MONTHLY", today));
  const [steps, setSteps] = useState<Step[]>([newStep()]);
  const [submitting, setSubmitting] = useState(false);

  const needsBreakdown = !isSingleTaskTimeframe(timeframe);
  const stepLabels = needsBreakdown ? ["Vision", "Breakdown", "Commit"] : ["Vision", "Commit"];
  const totalSteps = stepLabels.length;

  function handleTimeframeChange(value: Timeframe) {
    setTimeframe(value);
    setEndDate(defaultEndDate(value, new Date(startDate)));
  }

  function updateStepField<K extends "title" | "description" | "startDate" | "endDate" | "timeOfDay">(
    index: number,
    field: K,
    value: Step[K],
  ) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function updateStepSchedule(index: number, schedule: ScheduleRule) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, schedule } : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, newStep()]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  const cleanedSteps = steps
    .map((s) => ({
      ...s,
      title: s.title.trim(),
      startDate: s.startDate || undefined,
      endDate: s.endDate || undefined,
      timeOfDay: s.timeOfDay || undefined,
    }))
    .filter((s) => s.title.length > 0);

  function goNext() {
    if (step === 1 && title.trim().length === 0) {
      toast.error("Give this goal a title");
      return;
    }
    if (step === 1 && needsBreakdown === false) {
      setStep(totalSteps);
      return;
    }
    if (needsBreakdown && step === 2 && cleanedSteps.length === 0) {
      toast.error("Add at least one daily action step for this goal");
      return;
    }
    setStep((s) => Math.min(totalSteps, s + 1));
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit() {
    setSubmitting(true);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        timeframe,
        startDate,
        endDate,
        dailySteps: cleanedSteps,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 423) {
        toast.error(data.error);
        router.push(data.reason === "WALLET_DEFICIT" ? "/settings?insufficientFunds=1" : "/penalty-lock");
        return;
      }
      toast.error(data.error ?? "Something went wrong");
      return;
    }

    const data = await res.json().catch(() => ({}));
    toast.success("Goal created");
    for (const key of data.newBadges ?? []) {
      const badge = BADGE_CATALOG[key as BadgeKey];
      if (badge) toast(`🏅 Badge earned: ${badge.label}`, { description: badge.description });
    }
    router.push("/goals");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <Stepper steps={stepLabels} currentStep={step} />

      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Timeframe</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => handleTimeframeChange(tf)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    timeframe === tf
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-accent",
                  )}
                >
                  {TIMEFRAME_LABELS[tf]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="title">
              Goal title
            </label>
            <Input
              id="title"
              placeholder="e.g., Ship MVP Beta"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="description">
              Description (optional)
            </label>
            <Textarea
              id="description"
              placeholder="Briefly detail the specific outcome..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {isSingleTaskTimeframe(timeframe) ? (
            <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {timeframe === "TEST_10S"
                ? "This goal becomes today's task and fails automatically 10 seconds after you commit it, if still incomplete — for exercising the penalty flow without waiting for real midnight."
                : "This goal becomes today's task, due by midnight."}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <DateLabel
                id="startDate"
                label="Start date"
                value={startDate}
                onChange={(v) => {
                  setStartDate(v);
                  setEndDate(defaultEndDate(timeframe, new Date(v)));
                }}
              />
              <DateLabel
                id="endDate"
                label="Target end date"
                value={endDate}
                onChange={setEndDate}
                disabled={timeframe !== "CUSTOM"}
              />
            </div>
          )}
        </div>
      )}

      {step === 2 && needsBreakdown && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Daily action steps (required)</p>
            <Button type="button" size="sm" variant="secondary" onClick={addStep}>
              <Plus className="h-3.5 w-3.5" /> Add step
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            These micro-steps will show up on your dashboard every day this goal is active.
          </p>
          <div className="space-y-3">
            {steps.map((s, i) => (
              <Card key={s.id}>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex-1 space-y-3">
                    <Input
                      placeholder={`Step ${i + 1} title, e.g. "Write 500 words"`}
                      value={s.title}
                      onChange={(e) => updateStepField(i, "title", e.target.value)}
                    />
                    <Input
                      placeholder="Optional details"
                      value={s.description}
                      onChange={(e) => updateStepField(i, "description", e.target.value)}
                    />
                    <RepeatPicker
                      value={s.schedule}
                      onChange={(schedule) => updateStepSchedule(i, schedule ?? { frequency: "DAILY" })}
                      anchorDate={todayStr}
                    />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <DateLabel
                        id={`step-${s.id}-start`}
                        label="Starts (optional)"
                        value={s.startDate ?? ""}
                        onChange={(v) => updateStepField(i, "startDate", v)}
                        min={startDate}
                      />
                      <DateLabel
                        id={`step-${s.id}-end`}
                        label="Ends (optional)"
                        value={s.endDate ?? ""}
                        onChange={(v) => updateStepField(i, "endDate", v)}
                        min={s.startDate || startDate}
                      />
                      <div className="space-y-2">
                        <Label htmlFor={`step-${s.id}-time`}>Due time (optional)</Label>
                        <Input
                          id={`step-${s.id}-time`}
                          type="time"
                          value={s.timeOfDay ?? ""}
                          onChange={(e) => updateStepField(i, "timeOfDay", e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave Starts/Ends blank to run for this goal&apos;s whole window ({format(new Date(startDate), "MMM d")} &rarr; {format(new Date(endDate), "MMM d")}).
                    </p>
                  </div>
                  {steps.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(i)}
                      aria-label="Remove step"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {step === totalSteps && (
        <div className="space-y-4">
          <p className="text-sm font-medium">Review &amp; commit</p>
          <Card>
            <CardContent className="space-y-3 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Title</span>
                <span className="font-medium">{title || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timeframe</span>
                <span className="font-medium">{TIMEFRAME_LABELS[timeframe]}</span>
              </div>
              {timeframe === "TEST_10S" ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deadline</span>
                  <span className="font-medium">10 seconds after you commit</span>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Window</span>
                  <span className="font-medium">
                    {format(new Date(startDate), "MMM d, yyyy")} &rarr; {format(new Date(endDate), "MMM d, yyyy")}
                  </span>
                </div>
              )}
              {needsBreakdown && (
                <div>
                  <p className="mb-1 text-muted-foreground">Daily action steps</p>
                  <ul className="list-inside list-disc space-y-1">
                    {cleanedSteps.map((s) => (
                      <li key={s.id} className="font-medium">
                        {s.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-between border-t border-border pt-6">
        {step > 1 ? (
          <Button type="button" variant="outline" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        ) : (
          <span />
        )}
        {step < totalSteps ? (
          <Button type="button" onClick={goNext}>
            Next Step <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Spinner />} {submitting ? "Committing..." : "Commit Goal"}
          </Button>
        )}
      </div>
    </div>
  );
}
