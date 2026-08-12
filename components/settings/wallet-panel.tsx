"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatNaira } from "@/lib/currency";
import { Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Transaction = { id: string; type: string; amount: number; reason: string; createdAt: string | Date };

export function WalletPanel({
  balance,
  transactions,
  showDeficitWarning = false,
}: {
  balance: number;
  transactions: Transaction[];
  showDeficitWarning?: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("1000");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (showDeficitWarning) {
      toast.error("Your wallet is negative — settle up before creating new goals.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTopUp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/wallet/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount) }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to top up wallet");
      return;
    }

    toast.success(`Wallet topped up ${formatNaira(Number(amount))}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <StatCard
        label="Wallet Balance"
        value={formatNaira(balance)}
        icon={Wallet}
        tone={balance < 0 ? "destructive" : "default"}
      />

      <form onSubmit={handleTopUp} className="flex gap-2">
        <Input
          type="number"
          min={1}
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Top-up amount in Naira"
          className="max-w-40"
        />
        <Button type="submit" disabled={submitting}>
          {submitting && <Spinner />} Top Up Wallet
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Virtual balance for now — no real payment is charged. Missed tasks debit this balance in real time when
        your penalty preference is Financial Stake.
      </p>

      {transactions.length > 0 && (
        <div className="space-y-1.5">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                {tx.type === "CREDIT" ? (
                  <ArrowUpCircle className="h-4 w-4 text-amber-500" />
                ) : (
                  <ArrowDownCircle className="h-4 w-4 text-destructive" />
                )}
                <span>{tx.reason}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("font-mono font-medium", tx.type === "CREDIT" ? "text-amber-600" : "text-destructive")}>
                  {tx.type === "CREDIT" ? "+" : "-"}
                  {formatNaira(tx.amount)}
                </span>
                <span className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), "MMM d")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
