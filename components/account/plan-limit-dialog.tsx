"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const UPGRADE_HREF = process.env.NEXT_PUBLIC_SOLVEN_UPGRADE_URL?.trim() || "/plans";

type PlanLimitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Server error text; if null, show generic upgrade copy. */
  message: string | null;
  currentPlanSlug: string;
};

export function PlanLimitDialog({
  open,
  onOpenChange,
  message,
  currentPlanSlug,
}: PlanLimitDialogProps) {
  const isFree = currentPlanSlug === "free";
  const generic =
    "Gold and Diamond include more storage, larger files, and flexible retention. Complete checkout to change your plan.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Upgrade your plan</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              {message ? (
                <p className="text-foreground/90">{message}</p>
              ) : (
                <p>{generic}</p>
              )}
              {isFree && message ? (
                <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                  This happened because of limits on the{" "}
                  <span className="font-medium text-foreground">Free</span> plan.
                </p>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button type="button" asChild>
            <Link
              href={UPGRADE_HREF}
              onClick={() => {
                onOpenChange(false);
              }}
            >
              View plans
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
