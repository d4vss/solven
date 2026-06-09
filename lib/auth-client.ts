import { createAuthClient } from "better-auth/react";
import { lastLoginMethodClient } from "better-auth/client/plugins";

const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL,
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

export async function signOut() {
  await authClient.signOut();
  const atom = authClient.$store.atoms.session;
  const current = atom.get();
  atom.set({ ...current, data: null, error: null, isPending: false, isRefetching: false });
}

export function deleteAccount(options?: { callbackURL?: string }) {
  return authClient.deleteUser({
    callbackURL: options?.callbackURL ?? "/sign-in",
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

export function isLastUsedLoginMethod(method: string): boolean {
  return (
    authClient as unknown as {
      isLastUsedLoginMethod?: (m: string) => boolean;
    }
  ).isLastUsedLoginMethod?.(method) ?? false;
}
