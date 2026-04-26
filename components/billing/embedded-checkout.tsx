"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmbeddedCheckoutPanel({ planId }: { planId: string }) {
  return (
    <div className="rounded border border-border bg-card p-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          Checkout placeholder - <span className="capitalize">{planId}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Payments are not available yet.
        </p>
        <Button asChild type="button" variant="outline" size="sm">
          <Link href="/plans">Back to plans</Link>
        </Button>
      </div>
    </div>
  );
}
