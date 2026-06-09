"use client";

import Link from "next/link";
import { LogInIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HeaderSessionActions } from "@/components/layout/header-session-actions";
import { useSession } from "@/lib/auth-client";
import Logo from "../brand/logo";

export default function Header() {
  const { data: session, isPending } = useSession();
  const user = session?.user;

  return (
    <header className="relative h-0 shrink-0">
      <div
        className={cn(
          "absolute top-6 left-1/2 z-10 flex w-full max-w-5xl -translate-x-1/2 flex-wrap items-start justify-between gap-2 sm:top-8 sm:flex-nowrap sm:items-center sm:gap-3",
          "px-4 md:px-8",
        )}
      >
        <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Link href="/">
            <Button variant="outline" size="icon">
              <Logo size={16} />
            </Button>
          </Link>
          <Link
            href="/plans"
            className="rounded border border-border/70 bg-muted/20 px-2 py-1 text-[10px] text-muted-foreground transition hover:bg-muted/40 hover:text-foreground sm:px-2.5 sm:text-[11px]"
          >
            Plans
          </Link>
          {user ? (
            <Link
              href="/account/profile"
              className="rounded border border-border/70 bg-muted/20 px-2 py-1 text-[10px] text-muted-foreground transition hover:bg-muted/40 hover:text-foreground sm:px-2.5 sm:text-[11px]"
            >
              Profile
            </Link>
          ) : null}
        </nav>
        {isPending ? (
          <Button
            disabled
            variant="outline"
            className="size-9 shrink-0 cursor-not-allowed rounded-lg p-0"
            aria-label="Loading session"
          >
            <Loader2Icon className="size-3.5 animate-spin" />
          </Button>
        ) : !user ? (
          <Button
            asChild
            variant="outline"
            className="size-9 shrink-0 rounded-lg p-0"
          >
            <Link href="/sign-in" aria-label="Sign in">
              <LogInIcon className="size-3.5" aria-hidden />
            </Link>
          </Button>
        ) : (
          <HeaderSessionActions user={user} />
        )}
      </div>
    </header>
  );
}
