"use client";

import { useCallback, useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { AtSignIcon, FingerprintIcon } from "lucide-react";
import { SiGithub } from "react-icons/si";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
  isUsernameAvailable,
  setUsername,
  useSession,
} from "@/lib/auth-client";
import {
  normalizeUsername,
  profileHandleFormSchema,
  type ProfileHandleFormValues,
  USERNAME_MAX_LEN,
  USERNAME_MIN_LEN,
  USERNAME_RE,
} from "@/lib/schemas/username";
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
  const router = useRouter();
  const { data: session, refetch, isPending } = useSession();
  const current =
    (session?.user as { username?: string | null } | undefined)?.username
      ?.trim()
      .toLowerCase() ?? "";

  const form = useForm<ProfileHandleFormValues>({
    resolver: zodResolver(profileHandleFormSchema),
    defaultValues: { handle: current || "" },
    mode: "onTouched",
  });

  useEffect(() => {
    form.reset({ handle: current || "" });
  }, [current, form]);

  const usernameRaw = useWatch({ control: form.control, name: "handle" }) ?? "";
  const normalized = normalizeUsername(usernameRaw);

  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const runAvailability = useCallback(
    async (name: string) => {
      if (name.length < USERNAME_MIN_LEN || name.length > USERNAME_MAX_LEN) {
        setAvailable(null);
        setCheckMessage(null);
        return;
      }
      if (!USERNAME_RE.test(name)) {
        setAvailable(null);
        setCheckMessage(null);
        return;
      }
      if (name === current) {
        setAvailable(null);
        setCheckMessage(null);
        return;
      }
      setChecking(true);
      setCheckMessage(null);
      try {
        const res = (await isUsernameAvailable(name)) as {
          data?: { available?: boolean };
          error?: { message?: string } | null;
        };
        if (res.error) {
          setAvailable(null);
          setCheckMessage(res.error.message ?? "Could not check availability.");
          return;
        }
        setAvailable(res.data?.available ?? null);
      } catch {
        setAvailable(null);
        setCheckMessage("Could not check availability.");
      } finally {
        setChecking(false);
      }
    },
    [current],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      void runAvailability(normalized);
    }, 350);
    return () => clearTimeout(t);
  }, [normalized, runAvailability]);

  async function onSaveUsername(data: ProfileHandleFormValues) {
    const name = normalizeUsername(data.handle);
    if (name === current) {
      form.setError("handle", { message: "That is already your username." });
      return;
    }
    if (available === false) {
      form.setError("handle", { message: "That username is already taken." });
      return;
    }
    setSubmitting(true);
    try {
      const res = (await setUsername(name)) as {
        error?: { message?: string } | null;
      };
      if (res.error) {
        form.setError("handle", {
          message: res.error.message ?? "Could not save username.",
        });
        return;
      }
      await refetch();
      toast.success("Username updated", {
        description: `@${name} is now on your profile.`,
      });
      router.refresh();
    } catch {
      form.setError("handle", { message: "Something went wrong. Try again." });
    } finally {
      setSubmitting(false);
    }
  }

  async function onConfirmDelete() {
    setDeleting(true);
    try {
      const res = (await deleteAccount({ callbackURL: "/signin" })) as {
        error?: { message?: string } | null;
      };
      if (res.error) {
        toast.error("Could not delete account", {
          description: res.error.message ?? "Try again or contact support.",
        });
        return;
      }
      toast.success("Account deleted");
      window.location.href = "/signin";
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
  const unchanged = normalized === current;
  const canSave =
    !unchanged &&
    normalized.length >= USERNAME_MIN_LEN &&
    normalized.length <= USERNAME_MAX_LEN &&
    USERNAME_RE.test(normalized) &&
    available === true;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <section
        aria-labelledby="username-heading"
        className="rounded border border-border bg-card"
      >
        <div className="flex items-start gap-3 border-b border-border bg-muted/20 px-3 py-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded border border-border/70 bg-muted/30 text-muted-foreground">
            <AtSignIcon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <h2
              id="username-heading"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              Public username
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Lowercase handle used across Solven where your name appears to
              others.
            </p>
          </div>
        </div>

        <form
          onSubmit={form.handleSubmit(onSaveUsername)}
          className="space-y-3 px-3 py-3"
          noValidate
          autoComplete="off"
        >
          <FieldSet className="rounded border border-border/70 bg-card/30 p-3">
            <FieldGroup className="gap-4">
              <Controller
                name="handle"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                    <FieldLabel htmlFor={field.name} className="sr-only">
                      Username
                    </FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      autoComplete="off"
                      autoSave="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="your_handle"
                      disabled={submitting}
                      aria-invalid={fieldState.invalid}
                      className="h-9 max-w-md font-mono text-[13px]"
                      onChange={(e) => {
                        field.onChange(e);
                        setAvailable(null);
                      }}
                    />
                    <FieldDescription>
                      {checking ? (
                        "Checking availability…"
                      ) : checkMessage ? (
                        <span className="text-destructive">{checkMessage}</span>
                      ) : normalized.length > 0 &&
                        (normalized.length < USERNAME_MIN_LEN ||
                          normalized.length > USERNAME_MAX_LEN ||
                          !USERNAME_RE.test(normalized)) ? (
                        `Use ${USERNAME_MIN_LEN}–${USERNAME_MAX_LEN} characters: a–z, 0–9, _, .`
                      ) : unchanged ? (
                        "This is your current handle."
                      ) : available === true ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Available
                        </span>
                      ) : available === false ? (
                        <span className="text-destructive">Already taken</span>
                      ) : null}
                    </FieldDescription>
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : null}
                  </Field>
                )}
              />
            </FieldGroup>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={submitting || !canSave}
                className="rounded-lg"
              >
                {submitting ? "Saving…" : "Save username"}
              </Button>
              {!canSave && !submitting ? (
                <span className="text-xs text-muted-foreground">
                  Change the field above to enable save.
                </span>
              ) : null}
            </div>
          </FieldSet>
        </form>
      </section>

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
