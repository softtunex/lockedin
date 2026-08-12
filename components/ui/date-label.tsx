"use client";

import { format, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Native <input type="date"> renders in whatever format the OS locale
// dictates (MM/DD vs DD/MM), which reads as ambiguous/untrustworthy —
// especially for "Do Later" reschedules. Pairing it with an explicit,
// locale-independent caption removes the ambiguity without pulling in a
// full calendar/popover dependency.
export function DateLabel({
  id,
  label,
  value,
  onChange,
  min,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="date" value={value} min={min} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <p className="text-xs font-medium text-primary">{format(parseISO(value), "EEEE, MMMM d, yyyy")}</p>
      )}
    </div>
  );
}
