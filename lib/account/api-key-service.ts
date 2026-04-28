import { createHash, randomBytes, randomUUID } from "crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import db from "@/lib/db";
import { userApiKey } from "@/lib/db/schema";

const KEY_PREFIX = "svk_";
const MAX_KEYS_PER_USER = 25;

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function generateRawApiKey(): string {
  return `${KEY_PREFIX}${randomBytes(32).toString("hex")}`;
}

export function isLikelyApiKeyToken(value: string): boolean {
  return /^svk_[a-f0-9]{64}$/i.test(value);
}

export type CreatedApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  /** Full secret — return to client once only. */
  rawKey: string;
};

export async function createApiKeyForUser(
  userId: string,
  name: string,
): Promise<CreatedApiKeyRow> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) {
    throw new Error("Name must be 1–80 characters.");
  }

  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(userApiKey)
    .where(and(eq(userApiKey.userId, userId), isNull(userApiKey.revokedAt)));

  if (c >= MAX_KEYS_PER_USER) {
    throw new Error(`You can have at most ${MAX_KEYS_PER_USER} active API keys.`);
  }

  const rawKey = generateRawApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 14);
  const id = randomUUID();

  await db.insert(userApiKey).values({
    id,
    userId,
    name: trimmed,
    keyPrefix,
    keyHash,
  });

  const [row] = await db
    .select({
      id: userApiKey.id,
      name: userApiKey.name,
      keyPrefix: userApiKey.keyPrefix,
      createdAt: userApiKey.createdAt,
    })
    .from(userApiKey)
    .where(eq(userApiKey.id, id))
    .limit(1);

  if (!row) throw new Error("Failed to create API key.");

  return { ...row, rawKey };
}

export type ListedApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

export async function listApiKeysForUser(userId: string): Promise<ListedApiKey[]> {
  return db
    .select({
      id: userApiKey.id,
      name: userApiKey.name,
      keyPrefix: userApiKey.keyPrefix,
      createdAt: userApiKey.createdAt,
      lastUsedAt: userApiKey.lastUsedAt,
    })
    .from(userApiKey)
    .where(and(eq(userApiKey.userId, userId), isNull(userApiKey.revokedAt)))
    .orderBy(desc(userApiKey.createdAt));
}

export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const res = await db
    .update(userApiKey)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(userApiKey.id, keyId),
        eq(userApiKey.userId, userId),
        isNull(userApiKey.revokedAt),
      ),
    )
    .returning({ id: userApiKey.id });
  return res.length > 0;
}

export async function verifyApiKeyAndTouch(
  rawKey: string,
): Promise<{ userId: string; keyId: string } | null> {
  if (!isLikelyApiKeyToken(rawKey)) return null;
  const keyHash = hashApiKey(rawKey);
  const [row] = await db
    .select({
      id: userApiKey.id,
      userId: userApiKey.userId,
    })
    .from(userApiKey)
    .where(
      and(eq(userApiKey.keyHash, keyHash), isNull(userApiKey.revokedAt)),
    )
    .limit(1);

  if (!row) return null;

  void (async () => {
    try {
      await db
        .update(userApiKey)
        .set({ lastUsedAt: new Date() })
        .where(eq(userApiKey.id, row.id));
    } catch {
      /* ignore telemetry failures */
    }
  })();

  return { userId: row.userId, keyId: row.id };
}
