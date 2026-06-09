"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { SOCIAL_SIGN_IN_PENDING_KEY } from "@/lib/auth-toast-storage";
import { emitAuthChanged } from "@/lib/auth-events";
import { useSession } from "@/lib/auth-client";

/**
 * After social OAuth, Better Auth redirects back with a session. We set
 * SOCIAL_SIGN_IN_PENDING_KEY before leaving; when session is ready, show a welcome toast.
 */
export function AuthSignInToast() {
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPending) return;

    const pending = sessionStorage.getItem(SOCIAL_SIGN_IN_PENDING_KEY);
    if (!pending) return;

    sessionStorage.removeItem(SOCIAL_SIGN_IN_PENDING_KEY);

    if (!session?.user) {
      return;
    }

    emitAuthChanged();

    const email = session.user.email?.trim();
    if (email) {
      toast.success("You're signed in via email", {
        description: email,
      });
    } else {
      const label = session.user.name?.trim() ?? "your account";
      toast.success("You're signed in", {
        description: label,
      });
    }
  }, [isPending, session]);

  return null;
}
