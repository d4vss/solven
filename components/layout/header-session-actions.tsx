"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LogOutIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import { accountChipBorderClass } from "@/lib/plans/resolve";
import { cn } from "@/lib/utils";

export type SessionUser = {
  name?: string | null;
  email?: string | null;
};

function accountLabel(user: SessionUser) {
  const raw = user.name?.trim() || user.email?.trim() || null;
  if (!raw) return "Account";
  return raw;
}

export function HeaderSessionActions({ user }: { user: SessionUser }) {
  const label = accountLabel(user);
  const [planSlug, setPlanSlug] = useState<string | null>(null);

  const syncPlanSlug = useCallback(async () => {
    try {
      const r = await fetch("/api/account/plan");
      if (!r.ok) return;
      const j = (await r.json()) as { slug?: string };
      if (j.slug) setPlanSlug(j.slug);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void syncPlanSlug();
    const onPlan = () => void syncPlanSlug();
    window.addEventListener("solven-plan-changed", onPlan);
    return () => window.removeEventListener("solven-plan-changed", onPlan);
  }, [syncPlanSlug]);

  async function doSignOut() {
    await signOut();
    toast.success("Signed out");
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        asChild
        variant="outline"
        className={cn(
          "h-9 max-w-[min(16rem,calc(100vw-8rem))] shrink rounded-lg px-2.5 text-xs font-medium",
          accountChipBorderClass(planSlug ?? undefined),
        )}
      >
        <Link
          href="/account"
          className="flex min-w-0 items-center gap-1.5"
          aria-label={`Account, ${label}`}
        >
          <UserIcon className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 truncate font-mono tracking-tight">{label}</span>
        </Link>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="size-9 shrink-0 cursor-pointer rounded-lg p-0"
        aria-label="Sign out"
        onClick={() => void doSignOut()}
      >
        <LogOutIcon className="size-3.5" aria-hidden />
      </Button>
    </div>
  );
}
