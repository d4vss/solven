import { and, eq, sql } from "drizzle-orm";
import db from "@/lib/db";
import { storageEntry, userPlan } from "@/lib/db/schema";
import {
  deleteEntry,
  getEntry,
  getEntryById,
  insertEntry,
  listExpiredFileEntriesForUser,
  listEntries,
  moveEntryToParent,
  nameExistsInFolder,
  recordFileDownload,
  updateFileExpiry,
} from "@/lib/account/storage-entry-repo";
import {
  addBandwidthUsageMonth,
  getUsageCountersForEnforcement,
  setUserFlagged,
} from "@/lib/account/user-plan-repo";
import {
  checkDownloadAllowed,
  assertCanCreateFolder,
  getResolvedPlanForUser,
  inactiveAutoDeleteDeadline,
  nextExpiresAtAfterDownload,
  PlanQuotaError,
} from "@/lib/plans/enforcement";
import { validateManualExpiresAt } from "@/lib/plans/manual-expiry";
import { deleteObjectKey, headObject } from "@/lib/storage";
import { assertUserOwnsKey } from "@/lib/storage";

const ENTRY_NAME_RE = /^[\w.\- ]{1,200}$/;

function normalizeEntryName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const ascii = trimmed
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/\s{2,}/g, " ")
    .replace(/^[_\s.-]+/, "")
    .replace(/[_\s.-]+$/, "");
  return ascii;
}

function dayStartUtc(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function assertValidEntryName(name: string) {
  const n = normalizeEntryName(name);
  if (!ENTRY_NAME_RE.test(n)) {
    throw new Error(
      "Name must be 1–200 characters: letters, numbers, spaces, underscore, dot, hyphen.",
    );
  }
  return n;
}

export async function resolveParentFolder(
  userId: string,
  parentId: string | null,
) {
  if (parentId === null || parentId === "") return null;
  const p = await getEntry(userId, parentId);
  if (!p || p.kind !== "folder") {
    throw new Error("Parent folder not found");
  }
  return p;
}

export async function registerUploadedFile(input: {
  userId: string;
  key: string;
  name: string;
  expectedSizeBytes: number;
  parentId: string | null;
}) {
  const displayName = assertValidEntryName(input.name);
  assertUserOwnsKey(input.key, input.userId);
  await resolveParentFolder(input.userId, input.parentId);

  const meta = await headObject(input.key);
  const size = Number(meta.ContentLength ?? 0);
  if (size !== input.expectedSizeBytes) {
    await deleteObjectKey(input.key).catch(() => {});
    throw new Error("Uploaded object size does not match expected file size.");
  }

  const { plan } = await getResolvedPlanForUser(input.userId);
  const limits = plan.limits;

  if (size > limits.maxSingleFileBytes) {
    await deleteObjectKey(input.key).catch(() => {});
    throw new PlanQuotaError(
      "File exceeds the maximum size for your plan.",
      "FILE_TOO_LARGE",
    );
  }

  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    await db.transaction(async (tx) => {
      // Serialize quota checks per-user to avoid concurrent uploads bypassing limits.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.userId}))`);
      await tx
        .insert(userPlan)
        .values({ userId: input.userId, planSlug: "free" })
        .onConflictDoNothing();

      const [usage] = await tx
        .select({
          totalBytes: sql<number>`coalesce(sum(${storageEntry.sizeBytes}), 0)`,
        })
        .from(storageEntry)
        .where(
          and(
            eq(storageEntry.userId, input.userId),
            eq(storageEntry.kind, "file"),
          ),
        );

      const totalBytes = Number(usage?.totalBytes ?? 0);
      const [planUsage] = await tx
        .select({
          uploadUsedTodayBytes: userPlan.uploadUsedTodayBytes,
          uploadDayStartsAt: userPlan.uploadDayStartsAt,
        })
        .from(userPlan)
        .where(eq(userPlan.userId, input.userId))
        .limit(1);
      const now = new Date();
      const today = dayStartUtc(now);
      const uploadDayStartsAt = planUsage?.uploadDayStartsAt ?? today;
      let uploadUsedTodayBytes = Number(planUsage?.uploadUsedTodayBytes ?? 0);
      if (uploadDayStartsAt.getTime() !== today.getTime()) {
        uploadUsedTodayBytes = 0;
        await tx
          .update(userPlan)
          .set({
            uploadUsedTodayBytes: 0,
            uploadDayStartsAt: today,
            updatedAt: now,
          })
          .where(eq(userPlan.userId, input.userId));
      }

      if (totalBytes + size > limits.maxTotalStorageBytes) {
        throw new PlanQuotaError(
          "Not enough storage quota left on your plan.",
          "STORAGE_LIMIT_EXCEEDED",
        );
      }
      if (
        limits.dailyUploadBytesCap !== null &&
        uploadUsedTodayBytes + size > limits.dailyUploadBytesCap
      ) {
        throw new PlanQuotaError(
          "Daily upload limit exceeded for your plan.",
          "DAILY_UPLOAD_LIMIT_EXCEEDED",
        );
      }

      await tx.insert(storageEntry).values({
        id,
        userId: input.userId,
        parentId: input.parentId,
        name: displayName,
        kind: "file",
        r2Key: input.key,
        sizeBytes: size,
        downloadCount: 0,
        lastDownloadAt: null,
        expiresAt: inactiveAutoDeleteDeadline(plan),
      });
      await tx
        .update(userPlan)
        .set({
          uploadUsedTodayBytes: sql`${userPlan.uploadUsedTodayBytes} + ${size}`,
          updatedAt: now,
        })
        .where(eq(userPlan.userId, input.userId));
    });
  } catch (e) {
    await deleteObjectKey(input.key).catch(() => {});
    throw e;
  }

  return { id, sizeBytes: size };
}

export async function recordEntryDownload(userId: string, entryId: string) {
  await purgeExpiredFileIfNeededForUser(userId, entryId);
  const { plan } = await getResolvedPlanForUser(userId);
  const bump = nextExpiresAtAfterDownload(plan);
  await recordFileDownload(userId, entryId, bump);
}

export async function setFileManualExpiry(input: {
  userId: string;
  entryId: string;
  expiresAt: Date | null;
}) {
  const row = await getEntry(input.userId, input.entryId);
  if (!row || row.kind !== "file") {
    throw new Error("Not found");
  }
  const { plan } = await getResolvedPlanForUser(input.userId);
  validateManualExpiresAt(plan, input.expiresAt);
  await updateFileExpiry(input.userId, input.entryId, input.expiresAt);
}

export async function createFolder(input: {
  userId: string;
  name: string;
  parentId: string | null;
}) {
  const displayName = assertValidEntryName(input.name);
  await assertCanCreateFolder(input.userId);
  await resolveParentFolder(input.userId, input.parentId);

  if (await nameExistsInFolder(input.userId, input.parentId, displayName)) {
    throw new Error("An item with that name already exists here.");
  }

  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  await insertEntry({
    id,
    userId: input.userId,
    parentId: input.parentId,
    name: displayName,
    kind: "folder",
    r2Key: null,
    sizeBytes: 0,
    downloadCount: 0,
    lastDownloadAt: null,
    expiresAt: null,
  });

  return { id };
}

export async function removeEntryTree(userId: string, entryId: string) {
  const row = await getEntry(userId, entryId);
  if (!row) {
    throw new Error("Not found");
  }
  if (row.kind === "folder") {
    const children = await listEntries(userId, entryId);
    for (const c of children) {
      await removeEntryTree(userId, c.id);
    }
    await deleteEntry(userId, entryId);
    return;
  }
  if (row.r2Key) {
    await deleteObjectKey(row.r2Key);
  }
  await deleteEntry(userId, entryId);
}

async function assertFolderMoveDoesNotCreateCycle(
  userId: string,
  movingFolderId: string,
  targetParentId: string | null,
) {
  if (!targetParentId) return;
  let cursor = await getEntry(userId, targetParentId);
  while (cursor) {
    if (cursor.id === movingFolderId) {
      throw new Error("You cannot move a folder inside itself.");
    }
    if (!cursor.parentId) break;
    cursor = await getEntry(userId, cursor.parentId);
  }
}

export async function moveEntry(input: {
  userId: string;
  entryId: string;
  targetParentId: string | null;
}) {
  const row = await getEntry(input.userId, input.entryId);
  if (!row) throw new Error("Not found");
  await resolveParentFolder(input.userId, input.targetParentId);

  if (input.targetParentId === row.id) {
    throw new Error("You cannot move an item into itself.");
  }
  if ((row.parentId ?? null) === (input.targetParentId ?? null)) {
    return;
  }
  if (row.kind === "folder") {
    await assertFolderMoveDoesNotCreateCycle(
      input.userId,
      row.id,
      input.targetParentId,
    );
  }
  if (
    row.kind === "folder" &&
    (await nameExistsInFolder(input.userId, input.targetParentId, row.name))
  ) {
    throw new Error(`"${row.name}" already exists in target folder.`);
  }
  await moveEntryToParent(input.userId, row.id, input.targetParentId);
}

async function purgeEntryObjectAndRow(input: {
  userId: string;
  entryId: string;
  r2Key: string | null;
}) {
  if (input.r2Key) {
    await deleteObjectKey(input.r2Key).catch(() => {});
  }
  await deleteEntry(input.userId, input.entryId);
}

export async function purgeExpiredFilesForUser(userId: string) {
  const expired = await listExpiredFileEntriesForUser(userId);
  for (const row of expired) {
    await purgeEntryObjectAndRow({
      userId: row.userId,
      entryId: row.id,
      r2Key: row.r2Key,
    });
  }
  return expired.length;
}

export async function purgeExpiredFileIfNeededForUser(
  userId: string,
  entryId: string,
) {
  const row = await getEntry(userId, entryId);
  if (!row || row.kind !== "file") return false;
  if (!row.expiresAt || row.expiresAt.getTime() >= Date.now()) return false;
  await purgeEntryObjectAndRow({ userId: row.userId, entryId: row.id, r2Key: row.r2Key });
  return true;
}

export async function purgeExpiredFileIfNeededByEntryId(entryId: string) {
  const row = await getEntryById(entryId);
  if (!row || row.kind !== "file") return false;
  if (!row.expiresAt || row.expiresAt.getTime() >= Date.now()) return false;
  await purgeEntryObjectAndRow({ userId: row.userId, entryId: row.id, r2Key: row.r2Key });
  return true;
}

export async function presignDownloadForEntry(userId: string, entryId: string) {
  await purgeExpiredFileIfNeededForUser(userId, entryId);
  const row = await getEntry(userId, entryId);
  if (!row || row.kind !== "file" || !row.r2Key) {
    throw new Error("Not found");
  }
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    throw new Error("This file has expired.");
  }
  await checkDownloadAllowed(userId, row.sizeBytes);
  await addBandwidthUsageMonth(userId, row.sizeBytes);
  const usage = await getUsageCountersForEnforcement(userId);
  if (usage.bandwidthUsedMonthBytes > 5 * 1024 ** 4) {
    await setUserFlagged(userId, true);
  }
  assertUserOwnsKey(row.r2Key, userId);
  return { r2Key: row.r2Key, downloadFileName: row.name };
}

export async function assertCanCreateSharedLink(
  userId: string,
  opts: { withPassword: boolean; withExpiry: boolean },
) {
  const { plan } = await getResolvedPlanForUser(userId);
  if (!plan.features.publicLinks) {
    throw new Error("Public links are not available on your plan.");
  }
  if (opts.withPassword && !plan.features.passwordProtection) {
    throw new Error("Password-protected links require Gold or Diamond.");
  }
  if (opts.withExpiry && !plan.features.linkExpiration) {
    throw new Error("Custom link expiration requires Gold or Diamond.");
  }
}
