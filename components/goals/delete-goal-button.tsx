"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Trash2 } from "lucide-react";

export function DeleteGoalButton({ goalId }: { goalId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
    setDeleting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Couldn't delete goal");
      setConfirming(false);
      return;
    }

    toast.success("Goal deleted");
    router.push("/goals");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant={confirming ? "destructive-solid" : "outline"}
      size="sm"
      disabled={deleting}
      onClick={handleDelete}
    >
      {deleting ? <Spinner /> : <Trash2 className="h-3.5 w-3.5" />} {confirming ? "Confirm delete?" : "Delete goal"}
    </Button>
  );
}
