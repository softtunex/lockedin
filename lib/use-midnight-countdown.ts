"use client";

import { useEffect, useState } from "react";
import { msUntilMidnight } from "./date";

export function useMsUntilMidnight(): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    setRemaining(msUntilMidnight());
    const id = setInterval(() => setRemaining(msUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  return remaining;
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
