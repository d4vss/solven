function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const value = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return fallback;
}

function hostFromUrl(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    return new URL(raw.trim()).host;
  } catch {
    return null;
  }
}

export function allowNewSignUps(): boolean {
  return envFlag("ALLOW_NEW_SIGNUPS", true);
}

/** Host patterns Better Auth accepts when deriving baseURL per request. */
export function authAllowedHosts(): string[] {
  const hosts = new Set<string>(["localhost:3000", "localhost:*", "127.0.0.1:3000"]);

  for (const envName of [
    "BETTER_AUTH_URL",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_AUTH_URL",
  ]) {
    const host = hostFromUrl(process.env[envName]);
    if (host) hosts.add(host);
  }

  const extra = process.env.AUTH_ALLOWED_HOSTS?.trim();
  if (extra) {
    for (const part of extra.split(",")) {
      const trimmed = part.trim();
      if (trimmed) hosts.add(trimmed);
    }
  }

  return Array.from(hosts);
}
