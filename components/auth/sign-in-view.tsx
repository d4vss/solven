"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2Icon } from "lucide-react";
import { SiGithub } from "react-icons/si";
import { FcGoogle } from "react-icons/fc";
import Logo from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLastUsedLoginMethod, signInWithOAuth, useSession } from "@/lib/auth-client";
import { SOCIAL_SIGN_IN_PENDING_KEY } from "@/lib/auth-toast-storage";

type OAuthProvider = "github" | "google";

function lastUsedPill() {
  return (
    <span className="pointer-events-none absolute -top-2 -right-2 z-10 whitespace-nowrap rounded-md border border-border/70 bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
      Last used
    </span>
  );
}

function safeNextPath(raw: string | null): string {
  if (!raw?.startsWith("/") || raw.startsWith("//")) return "/account";
  if (raw.startsWith("/sign-in") || raw.startsWith("/signin")) return "/account";
  return raw;
}

export function SignInView() {
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [lastMethod] = useState<string | null>(() => {
    const raw = getLastUsedLoginMethod();
    return raw ? raw.trim().toLowerCase() : null;
  });
  const busy = pending !== null;
  const callbackURL = safeNextPath(searchParams.get("next"));

  useEffect(() => {
    if (isPending || !session?.user) return;
    window.location.assign(callbackURL);
  }, [callbackURL, isPending, session?.user]);

  function start(provider: OAuthProvider) {
    setPending(provider);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SOCIAL_SIGN_IN_PENDING_KEY, provider);
    }
    void signInWithOAuth(provider, { callbackURL }).catch(() => {
      setPending(null);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(SOCIAL_SIGN_IN_PENDING_KEY);
      }
    });
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col md:grid md:min-h-[calc(100dvh-4.5rem)] md:grid-cols-2">
      <div className="relative flex flex-col justify-center gap-6 border-border/40 px-6 py-8 md:gap-8 md:border-r md:px-12 md:py-12 lg:px-20">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_40%,oklch(0.35_0.08_264/0.35),transparent_55%),radial-gradient(ellipse_60%_50%_at_80%_80%,oklch(0.3_0.02_264/0.2),transparent_50%)]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Logo size={40} />
          </Link>
          <div className="space-y-3">
            <h1 className="font-heading text-3xl font-medium tracking-tight text-balance md:text-4xl">
              Welcome back
            </h1>
            <p className="max-w-md text-muted-foreground text-pretty leading-relaxed">
              Sign in to upload, share, and manage your files with the same
              security and speed you expect from Solven.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-8 md:px-10 md:py-12">
        <Card
          className="relative w-full max-w-md overflow-visible border-border/60 shadow-xl shadow-black/20"
          aria-busy={busy}
        >
          <CardHeader className="border-b border-border/40 pb-4">
            <Link
              href="/"
              className="mb-3 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
              Back to home
            </Link>
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>
              Choose a provider to continue. We never post on your behalf.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 overflow-visible pt-2">
            <div className="relative w-full">
              {lastMethod === "github" ? lastUsedPill() : null}
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="h-9 w-full cursor-pointer justify-center gap-2 rounded-lg border-border/80 px-3 text-sm hover:bg-muted/60 disabled:opacity-60 data-[variant=default]:border-transparent [&_svg]:size-4"
                onClick={() => start("github")}
              >
                {pending === "github" ? (
                  <Loader2Icon
                    className="size-4 shrink-0 animate-spin"
                    aria-hidden
                  />
                ) : (
                  <SiGithub className="shrink-0" aria-hidden />
                )}
                Sign in with GitHub
              </Button>
            </div>
            <div className="relative w-full">
              {lastMethod === "google" ? lastUsedPill() : null}
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="h-9 w-full cursor-pointer justify-center gap-2 rounded-lg border-border/80 px-3 text-sm hover:bg-muted/60 disabled:opacity-60 data-[variant=default]:border-transparent [&_svg]:size-4"
                onClick={() => start("google")}
              >
                {pending === "google" ? (
                  <Loader2Icon
                    className="size-4 shrink-0 animate-spin"
                    aria-hidden
                  />
                ) : (
                  <FcGoogle className="shrink-0" aria-hidden />
                )}
                Sign in with Google
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
