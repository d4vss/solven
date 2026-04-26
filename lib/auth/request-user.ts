import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  isLikelyApiKeyToken,
  verifyApiKeyAndTouch,
} from "@/lib/account/api-key-service";

/**
 * Cookie session (browser) or `Authorization: Bearer svk_…` API key.
 * If a Bearer token is present and non-empty, it must be a valid API key
 * (invalid keys do not fall back to the session).
 */
export async function requireAuthenticatedUserId(
  request: Request,
): Promise<string> {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const m = /^Bearer\s+(\S+)/i.exec(authHeader.trim());
    const token = m?.[1]?.trim();
    if (token) {
      if (!isLikelyApiKeyToken(token)) {
        throw new Error("Unauthorized");
      }
      const verified = await verifyApiKeyAndTouch(token);
      if (!verified) {
        throw new Error("Unauthorized");
      }
      return verified.userId;
    }
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const id = session?.user?.id;
  if (!id) {
    throw new Error("Unauthorized");
  }
  return id;
}
