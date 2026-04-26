import { createAuthClient } from "better-auth/react";
import {
  lastLoginMethodClient,
  usernameClient,
} from "better-auth/client/plugins";

const authClient = createAuthClient({
  plugins: [usernameClient(), lastLoginMethodClient()],
});

export function useSession() {
  return authClient.useSession();
}

export function signInWithOAuth(provider: "github" | "google") {
  return authClient.signIn.social({ provider });
}

export function signOut() {
  return authClient.signOut();
}

export function isUsernameAvailable(username: string) {
  return authClient.isUsernameAvailable({ username });
}

export function setUsername(username: string) {
  return authClient.updateUser({
    username,
    displayUsername: username,
  });
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
