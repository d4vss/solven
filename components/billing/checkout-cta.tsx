"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CheckoutCta({
  planId,
  disabled,
}: {
  planId: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    if (disabled || loading) return;
    setLoading(true);
    try {
      const r = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const j = (await r.json()) as { error?: string; url?: string };
      if (!r.ok || !j.url) {
        throw new Error(j.error ?? "Could not start checkout.");
      }
      window.location.href = j.url;
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" disabled={disabled || loading} onClick={() => void startCheckout()}>
      {loading ? "Redirecting..." : "Upgrade"}
    </Button>
  );
}
