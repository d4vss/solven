"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { SOCIAL_SIGN_IN_PENDING_KEY } from "@/lib/auth-toast-storage";
import { useSession } from "@/lib/auth-client";

export function AuthSignInToast() {
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;

    const pending = sessionStorage.getItem(SOCIAL_SIGN_IN_PENDING_KEY);
    if (!pending || !session?.user) return;

    sessionStorage.removeItem(SOCIAL_SIGN_IN_PENDING_KEY);

    const email = session.user.email?.trim();
    toast.success(
      email ? "You're signed in via email" : "You're signed in",
      { description: email ?? session.user.name?.trim() ?? "your account" },
    );
  }, [isPending, session]);

  return null;
}
