"use client";

import { useCallback, useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type OnboardingViewProps = {
  mode?: "page" | "dialog";
};

export function OnboardingView({ mode = "page" }: OnboardingViewProps) {
  const router = useRouter();
  const { data: session, refetch, isPending } = useSession();

  const form = useForm<ProfileHandleFormValues>({
    resolver: zodResolver(profileHandleFormSchema),
    defaultValues: { handle: "" },
    mode: "onTouched",
  });

  const usernameRaw = useWatch({ control: form.control, name: "handle" }) ?? "";
  const normalized = normalizeUsername(usernameRaw);

  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const runAvailability = useCallback(async (name: string) => {
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
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void runAvailability(normalized);
    }, 350);
    return () => clearTimeout(t);
  }, [normalized, runAvailability]);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace("/signin");
    }
  }, [isPending, session?.user, router]);

  async function onSubmit(data: ProfileHandleFormValues) {
    const name = normalizeUsername(data.handle);
    if (available === false) {
      form.setError("handle", { message: "That username is already taken." });
      return;
    }
    setSubmitting(true);
    try {
      const res = (await setUsername(name)) as {
        error?: { message?: string } | null;
      };
      const err = res.error;
      if (err) {
        form.setError("handle", {
          message: err.message ?? "Could not save username.",
        });
        return;
      }
      await refetch();
      toast.success("Username saved", {
        description: `@${name} is now on your profile.`,
      });
      if (mode === "page") {
        router.replace("/");
      }
      router.refresh();
    } catch {
      form.setError("handle", {
        message: "Something went wrong. Try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16">
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </div>
    );
  }

  const canSubmit =
    normalized.length >= USERNAME_MIN_LEN &&
    normalized.length <= USERNAME_MAX_LEN &&
    USERNAME_RE.test(normalized) &&
    available !== false;

  const content = (
    <Card className="w-full max-w-md border-border/60 shadow-lg shadow-black/15">
      <CardHeader className="border-b border-border/40 pb-4">
        {mode === "page" ? (
          <Link
            href="/"
            className="mb-3 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
            Back to home
          </Link>
        ) : null}
        <div className="mb-2 flex justify-center">
          <Logo size={36} />
        </div>
        <CardTitle className="text-center text-lg">Choose a username</CardTitle>
        <CardDescription className="text-center">
          This is how others will find you. You can use letters, numbers,
          period, and underscore ({USERNAME_MIN_LEN}–{USERNAME_MAX_LEN}{" "}
          characters).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
          autoComplete="off"
        >
          <Controller
            name="handle"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                <FieldLabel htmlFor={field.name}>Username</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  autoComplete="off"
                  autoFocus
                  autoSave="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="e.g. d4vss"
                  disabled={submitting}
                  aria-invalid={fieldState.invalid}
                  className="font-mono text-[15px]"
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
                  ) : available === true ? (
                    <span className="text-muted-foreground">Available</span>
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
          <Button
            type="submit"
            className={cn("w-full cursor-pointer rounded-lg")}
            disabled={submitting || !canSubmit}
          >
            {submitting ? "Saving…" : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  return mode === "dialog" ? (
    content
  ) : (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-6 py-12">
      {content}
    </div>
  );
}
