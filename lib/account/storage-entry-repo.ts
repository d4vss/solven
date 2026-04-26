import { and, asc, eq, isNotNull, isNull, lt, sql } from "drizzle-orm";
import db from "@/lib/db";
import { storageEntry } from "@/lib/db/schema";

export type StorageEntryRow = typeof storageEntry.$inferSelect;

export async function listEntries(
  userId: string,
  parentId: string | null,
): Promise<StorageEntryRow[]> {
  const cond =
    parentId === null || parentId === ""
      ? and(eq(storageEntry.userId, userId), isNull(storageEntry.parentId))
      : and(eq(storageEntry.userId, userId), eq(storageEntry.parentId, parentId));
  return db
    .select()
    .from(storageEntry)
    .where(cond)
    .orderBy(asc(storageEntry.name));
}

export async function getEntry(userId: string, id: string) {
  const rows = await db
    .select()
    .from(storageEntry)
    .where(and(eq(storageEntry.userId, userId), eq(storageEntry.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getEntryById(id: string) {
  const rows = await db
    .select()
    .from(storageEntry)
    .where(eq(storageEntry.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getEntryByKey(userId: string, r2Key: string) {
  const rows = await db
    .select()
    .from(storageEntry)
    .where(
      and(
        eq(storageEntry.userId, userId),
        eq(storageEntry.r2Key, r2Key),
        eq(storageEntry.kind, "file"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listExpiredFileEntriesForUser(userId: string, now = new Date()) {
  return db
    .select()
    .from(storageEntry)
    .where(
      and(
        eq(storageEntry.userId, userId),
        eq(storageEntry.kind, "file"),
        isNotNull(storageEntry.expiresAt),
        lt(storageEntry.expiresAt, now),
      ),
    );
}

export async function countUserFiles(userId: string): Promise<number> {
  const [r] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(storageEntry)
    .where(and(eq(storageEntry.userId, userId), eq(storageEntry.kind, "file")));
  return Number(r?.c ?? 0);
}

export async function countUserFolders(userId: string): Promise<number> {
  const [r] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(storageEntry)
    .where(and(eq(storageEntry.userId, userId), eq(storageEntry.kind, "folder")));
  return Number(r?.c ?? 0);
}

export async function sumUserFileBytes(userId: string): Promise<number> {
  const [r] = await db
    .select({
      s: sql<number>`coalesce(sum(${storageEntry.sizeBytes}), 0)`,
    })
    .from(storageEntry)
    .where(and(eq(storageEntry.userId, userId), eq(storageEntry.kind, "file")));
  return Number(r?.s ?? 0);
}

export async function insertEntry(values: typeof storageEntry.$inferInsert) {
  await db.insert(storageEntry).values(values);
}

export async function deleteEntry(userId: string, id: string) {
  await db
    .delete(storageEntry)
    .where(and(eq(storageEntry.userId, userId), eq(storageEntry.id, id)));
}

export async function deleteChildEntries(userId: string, parentId: string) {
  await db
    .delete(storageEntry)
    .where(and(eq(storageEntry.userId, userId), eq(storageEntry.parentId, parentId)));
}

export async function moveEntryToParent(
  userId: string,
  id: string,
  parentId: string | null,
) {
  await db
    .update(storageEntry)
    .set({ parentId })
    .where(and(eq(storageEntry.userId, userId), eq(storageEntry.id, id)));
}

export async function recordDownload(userId: string, id: string) {
  await recordFileDownload(userId, id, undefined);
}

/**
 * @param nextExpiresAt `undefined` = do not change `expires_at`; `null` = clear.
 */
export async function recordFileDownload(
  userId: string,
  id: string,
  nextExpiresAt: Date | null | undefined,
) {
  const base = {
    downloadCount: sql`${storageEntry.downloadCount} + 1`,
    lastDownloadAt: new Date(),
  };
  if (nextExpiresAt === undefined) {
    await db
      .update(storageEntry)
      .set(base)
      .where(and(eq(storageEntry.userId, userId), eq(storageEntry.id, id)));
  } else {
    await db
      .update(storageEntry)
      .set({ ...base, expiresAt: nextExpiresAt })
      .where(and(eq(storageEntry.userId, userId), eq(storageEntry.id, id)));
  }
}

export async function updateFileExpiry(
  userId: string,
  id: string,
  expiresAt: Date | null,
) {
  await db
    .update(storageEntry)
    .set({ expiresAt })
    .where(
      and(
        eq(storageEntry.userId, userId),
        eq(storageEntry.id, id),
        eq(storageEntry.kind, "file"),
      ),
    );
}

export async function nameExistsInFolder(
  userId: string,
  parentId: string | null,
  name: string,
): Promise<boolean> {
  const cond =
    parentId === null || parentId === ""
      ? and(
          eq(storageEntry.userId, userId),
          isNull(storageEntry.parentId),
          eq(storageEntry.name, name),
        )
      : and(
          eq(storageEntry.userId, userId),
          eq(storageEntry.parentId, parentId),
          eq(storageEntry.name, name),
        );
  const rows = await db
    .select({ id: storageEntry.id })
    .from(storageEntry)
    .where(cond)
    .limit(1);
  return rows.length > 0;
}
