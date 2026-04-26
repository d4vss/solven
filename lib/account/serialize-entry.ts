import type { StorageEntryRow } from "@/lib/account/storage-entry-repo";

export function serializeEntry(row: StorageEntryRow) {
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    kind: row.kind,
    sizeBytes: row.sizeBytes,
    downloadCount: row.downloadCount,
    lastDownloadAt: row.lastDownloadAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date(row.createdAt as string).toISOString(),
  };
}
