"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const PROTOCOL_LINES = [
  "Consistency is the only metric that matters today. No excuses.",
  "Proof of work beats intention every time. Log it or it didn't happen.",
  "The streak doesn't care how you feel. Show up anyway.",
  "Missed tasks compound faster than completed ones. Close the loop now.",
];

export function DailyProtocolCard() {
  const [expanded, setExpanded] = useState(false);
  const line = PROTOCOL_LINES[new Date().getDate() % PROTOCOL_LINES.length];

  return (
    <div className="rounded-lg border border-white/5 bg-[#1E293B] text-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between p-4 pb-3 text-left sm:pointer-events-none sm:pb-4"
      >
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Daily Protocol</p>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-white/60 transition-transform sm:hidden", expanded && "rotate-180")}
        />
      </button>
      <div className={cn("px-4 pb-4", expanded ? "block" : "hidden sm:block")}>
        <p className="text-sm leading-relaxed text-white/90">{line}</p>
        <Button
          render={<Link href="/settings" />}
          nativeButton={false}
          variant="secondary"
          className="mt-4 w-full bg-white/10 text-white hover:bg-white/20"
        >
          Review Penalties
        </Button>
      </div>
    </div>
  );
}
