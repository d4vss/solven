"use client";

import { useState } from "react";
import { FingerprintIcon } from "lucide-react";
import { SiGithub } from "react-icons/si";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import type {
  KnownOAuthProviderId,
  OAuthConnectionInfo,
} from "@/lib/account-oauth";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  deleteAccount,
  useSession,
} from "@/lib/auth-client";
import { toast } from "sonner";
import { AccountApiKeysPanel } from "@/components/account/account-api-keys";

function oauthLabel(id: KnownOAuthProviderId) {
  if (id === "github") return "GitHub";
  return "Google";
}

function oauthIcon(id: KnownOAuthProviderId) {
  if (id === "github") {
    return <SiGithub className="size-5" aria-hidden />;
  }
  return <FcGoogle className="size-5" aria-hidden />;
}

export function AccountSettings({
  connections = [],
}: {
  connections?: OAuthConnectionInfo[];
}) {
  const { data: session, isPending } = useSession();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onConfirmDelete() {
    setDeleting(true);
    try {
      const res = (await deleteAccount({ callbackURL: "/sign-in" })) as {
        error?: { message?: string } | null;
      };
      if (res.error) {
        toast.error("Could not delete account", {
          description: res.error.message ?? "Try again or contact support.",
        });
        return;
      }
      toast.success("Account deleted");
      window.location.href = "/sign-in";
    } catch {
      toast.error("Could not delete account.");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (isPending) {
    return (
      <div
        className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/10"
        aria-live="polite"
      >
        <p className="text-sm text-muted-foreground">Loading account…</p>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const connectionDisplayName =
    session.user.name?.trim() || session.user.email?.trim() || "—";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {connections.length > 0 ? (
        <>
          <section
            aria-labelledby="signin-heading"
            className="rounded border border-border bg-card"
          >
            <div className="flex items-start gap-3 border-b border-border bg-muted/20 px-3 py-2">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded border border-border/70 bg-muted/30 text-muted-foreground">
                <FingerprintIcon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 space-y-1">
                <h2
                  id="signin-heading"
                  className="text-base font-semibold tracking-tight text-foreground"
                >
                  Sign-in
                </h2>
              </div>
            </div>

            <ul className="space-y-2 px-3 py-3">
              {connections.map((c) => (
                <li
                  key={c.providerId}
                  className="flex items-center gap-3 rounded border border-border/70 bg-card/25 px-3 py-2"
                >
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background shadow-sm"
                    aria-hidden
                  >
                    {oauthIcon(c.providerId)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {oauthLabel(c.providerId)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {connectionDisplayName}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
      <AccountApiKeysPanel />

      <section
        aria-labelledby="delete-heading"
        className="rounded border border-destructive/35 bg-destructive/5 p-4"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="min-w-0 space-y-2">
            <h2
              id="delete-heading"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              Delete account
            </h2>
            <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
              Removes your Solven profile and associated data. You will need a
              new account to use the service again.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            className="shrink-0 rounded-lg sm:mt-0.5"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
        </div>
      </section>

      <Sheet open={deleteOpen} onOpenChange={setDeleteOpen}>
        <SheetContent side="right" className="flex flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Delete your account?</SheetTitle>
            <SheetDescription>
              You will be signed out and your profile will be removed. If you
              use OAuth, you may need to revoke app access from your provider
              separately.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="mt-auto flex flex-row flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-lg"
              disabled={deleting}
              onClick={() => void onConfirmDelete()}
            >
              {deleting ? "Deleting…" : "Yes, delete my account"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
