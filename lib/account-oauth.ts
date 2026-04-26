import { account } from "@/lib/db/schemas/auth";
import db from "@/lib/db";
import { desc, eq } from "drizzle-orm";

export const KNOWN_OAUTH_PROVIDER_IDS = ["github", "google"] as const;
export type KnownOAuthProviderId = (typeof KNOWN_OAUTH_PROVIDER_IDS)[number];

export type OAuthConnectionInfo = {
  providerId: KnownOAuthProviderId;
};

export async function getUserOAuthConnections(
  userId: string,
): Promise<OAuthConnectionInfo[]> {
  const rows = await db
    .select({ providerId: account.providerId })
    .from(account)
    .where(eq(account.userId, userId))
    .orderBy(desc(account.updatedAt));

  const seen = new Set<string>();
  const out: OAuthConnectionInfo[] = [];

  for (const row of rows) {
    const id = row.providerId?.trim().toLowerCase() ?? "";
    if (!KNOWN_OAUTH_PROVIDER_IDS.includes(id as KnownOAuthProviderId)) {
      continue;
    }
    const typed = id as KnownOAuthProviderId;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ providerId: typed });
  }

  out.sort(
    (a, b) =>
      KNOWN_OAUTH_PROVIDER_IDS.indexOf(a.providerId) -
      KNOWN_OAUTH_PROVIDER_IDS.indexOf(b.providerId),
  );
  return out;
}
