import { ShieldAlert } from "lucide-react";

export function LockoutBanner() {
  return (
    <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-destructive/30 bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground sm:px-8">
      <ShieldAlert className="h-5 w-5 shrink-0" />
      <p>
        ACCOUNT LOCKED: Complete your Mandatory Penalty Task and get Buddy Approval to restore full app access.
      </p>
    </div>
  );
}
