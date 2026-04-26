import { and, eq, isNull, sql } from "drizzle-orm";
import db from "@/lib/db";
import { storageShareLink } from "@/lib/db/schema";

export type StorageShareLinkRow = typeof storageShareLink.$inferSelect;

export async function insertShareLink(values: typeof storageShareLink.$inferInsert) {
  await db.insert(storageShareLink).values(values);
}

export async function listShareLinksForEntry(userId: string, entryId: string) {
  return db
    .select()
    .from(storageShareLink)
    .where(
      and(
        eq(storageShareLink.userId, userId),
        eq(storageShareLink.entryId, entryId),
        isNull(storageShareLink.revokedAt),
      ),
    );
}

export async function getShareLinkByToken(token: string) {
  const rows = await db
    .select()
    .from(storageShareLink)
    .where(and(eq(storageShareLink.token, token), isNull(storageShareLink.revokedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function revokeShareLink(userId: string, shareId: string) {
  await db
    .update(storageShareLink)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(storageShareLink.id, shareId),
        eq(storageShareLink.userId, userId),
        isNull(storageShareLink.revokedAt),
      ),
    );
}

export async function recordShareAccess(shareId: string) {
  await db
    .update(storageShareLink)
    .set({
      accessCount: sql`${storageShareLink.accessCount} + 1`,
      lastAccessAt: new Date(),
    })
    .where(eq(storageShareLink.id, shareId));
}
