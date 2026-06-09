import { createAuthClient } from "better-auth/react";
import { lastLoginMethodClient } from "better-auth/client/plugins";

function authClientBaseURL() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_AUTH_URL?.replace(/\/$/, "") ||
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    "";
  return fromEnv || undefined;
}

const authClient = createAuthClient({
  baseURL: authClientBaseURL(),
  fetchOptions: {
    credentials: "include",
  },
  plugins: [lastLoginMethodClient()],
});

export function useSession() {
  return authClient.useSession();
}

export function signInWithOAuth(
  provider: "github" | "google",
  options?: { callbackURL?: string },
) {
  return authClient.signIn.social({
    provider,
    callbackURL: options?.callbackURL ?? "/account",
  });
}

function clearClientSession() {
  const sessionAtom = authClient.$store.atoms.session;
  const current = sessionAtom.get();
  sessionAtom.set({
    ...current,
    data: null,
    error: null,
    isPending: false,
    isRefetching: false,
  });
}

export async function signOut() {
  const result = await authClient.signOut();
  clearClientSession();
  return result;
}

export function deleteAccount(options?: { callbackURL?: string }) {
  return authClient.deleteUser({
    callbackURL: options?.callbackURL ?? "/signin",
  });
}

export function getLastUsedLoginMethod(): string | null {
  const method = (
    authClient as unknown as {
      getLastUsedLoginMethod?: () => string | null | undefined;
    }
  ).getLastUsedLoginMethod?.();
  return method == null || method === "" ? null : method;
}

export function isLastUsedLoginMethod(
  method: string,
): boolean {
  return (
    authClient as unknown as {
      isLastUsedLoginMethod?: (m: string) => boolean;
    }
  ).isLastUsedLoginMethod?.(method) ?? false;
}
