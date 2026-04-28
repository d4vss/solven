"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { buildAccountPlanPayload } from "@/lib/account/api-plan-json";
import { serializeEntry } from "@/lib/account/serialize-entry";
import { getEntry, listEntries } from "@/lib/account/storage-entry-repo";
import {
  assertCanCreateSharedLink,
  createFolder,
  purgeExpiredFilesForUser,
  registerUploadedFile,
  removeEntryTree,
} from "@/lib/account/storage-entry-service";
import { insertShareLink, listShareLinksForEntry, revokeShareLink } from "@/lib/account/share-link-repo";
import { newShareToken, hashSharePassword } from "@/lib/storage/share-link";
import { PlanQuotaError } from "@/lib/plans";
import { requireSessionUserId } from "@/lib/storage/session";

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

const listSchema = z.object({
  parentId: z.union([z.string().min(1), z.null()]),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
});

const createFolderSchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.union([z.string().min(1), z.null()]),
});

const registerFileSchema = z.object({
  key: z.string().min(1).max(1024),
  name: z.string().min(1).max(200),
  expectedSizeBytes: z.number().int().positive(),
  parentId: z.union([z.string().min(1).max(64), z.null()]),
});

const createShareSchema = z.object({
  entryId: z.string().min(1),
  password: z.string().min(1).max(200).optional(),
  expiresAt: z.union([z.string().min(1), z.null()]).optional(),
});

const bulkDeleteSchema = z.object({
  entryIds: z.array(z.string().min(1)).min(1).max(500),
});

async function sumFolderSizeBytes(
  userId: string,
  folderId: string,
  visited = new Set<string>(),
): Promise<number> {
  if (visited.has(folderId)) return 0;
  visited.add(folderId);
  const children = await listEntries(userId, folderId);
  let total = 0;
  for (const child of children) {
    if (child.kind === "file") {
      total += child.sizeBytes;
      continue;
    }
    if (child.kind === "folder") {
      total += await sumFolderSizeBytes(userId, child.id, visited);
    }
  }
  return total;
}

function baseUrlFromHeaders(h: Headers): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function getAccountPlanAction(): Promise<ActionResult<Awaited<ReturnType<typeof buildAccountPlanPayload>>>> {
  try {
    const userId = await requireSessionUserId();
    const payload = await buildAccountPlanPayload(userId);
    return { ok: true, data: payload };
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? "Failed to load plan." };
  }
}

export async function listAccountEntriesAction(input: z.input<typeof listSchema>) {
  try {
    const parsed = listSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Invalid request." } satisfies ActionResult<never>;
    }
    const userId = await requireSessionUserId();
    await purgeExpiredFilesForUser(userId).catch(() => {});
    const rows = await listEntries(userId, parsed.data.parentId);
    const enriched = await Promise.all(
      rows.map(async (row) => {
        if (row.kind !== "folder") return row;
        return { ...row, sizeBytes: await sumFolderSizeBytes(userId, row.id) };
      }),
    );
    const ordered = [...enriched].sort((a, b) => {
      if (a.kind === b.kind) {
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }
      return a.kind === "folder" ? -1 : 1;
    });
    const total = ordered.length;
    const pageSize = parsed.data.pageSize;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(parsed.data.page, totalPages);
    const start = (currentPage - 1) * pageSize;
    const pageRows = ordered.slice(start, start + pageSize);
    return {
      ok: true,
      data: {
        entries: pageRows.map(serializeEntry),
        page: currentPage,
        pageSize,
        total,
        totalPages,
      },
    } satisfies ActionResult<{
      entries: ReturnType<typeof serializeEntry>[];
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    }>;
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message ?? "Could not load files.",
    } satisfies ActionResult<never>;
  }
}

export async function getAccountEntryAction(id: string) {
  try {
    if (!id?.trim()) return { ok: false, error: "Invalid entry id." } as const;
    const userId = await requireSessionUserId();
    const row = await getEntry(userId, id.trim());
    if (!row) return { ok: false, error: "Not found." } as const;
    return { ok: true, data: { entry: serializeEntry(row) } } as const;
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? "Read failed." } as const;
  }
}

export async function createAccountFolderAction(input: z.input<typeof createFolderSchema>) {
  try {
    const parsed = createFolderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Invalid folder payload." } as const;
    }
    const userId = await requireSessionUserId();
    const out = await createFolder({
      userId,
      name: parsed.data.name,
      parentId: parsed.data.parentId,
    });
    return { ok: true, data: out } as const;
  } catch (e) {
    if (e instanceof PlanQuotaError) {
      return { ok: false, error: e.message, code: e.code } as const;
    }
    return { ok: false, error: (e as Error).message ?? "Could not create folder." } as const;
  }
}

export async function registerAccountUploadAction(input: z.input<typeof registerFileSchema>) {
  try {
    const parsed = registerFileSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Invalid upload registration payload." } as const;
    }
    const userId = await requireSessionUserId();
    const out = await registerUploadedFile({
      userId,
      key: parsed.data.key,
      name: parsed.data.name,
      expectedSizeBytes: parsed.data.expectedSizeBytes,
      parentId: parsed.data.parentId,
    });
    return { ok: true, data: out } as const;
  } catch (e) {
    if (e instanceof PlanQuotaError) {
      return { ok: false, error: e.message, code: e.code } as const;
    }
    return { ok: false, error: (e as Error).message ?? "Register failed." } as const;
  }
}

export async function listAccountShareLinksAction(entryId: string) {
  try {
    if (!entryId?.trim()) return { ok: false, error: "Invalid entry id." } as const;
    const userId = await requireSessionUserId();
    const rows = await listShareLinksForEntry(userId, entryId.trim());
    return {
      ok: true,
      data: {
        links: rows.map((r) => ({
          id: r.id,
          token: r.token,
          hasPassword: Boolean(r.passwordHash),
          expiresAt: r.expiresAt?.toISOString() ?? null,
          accessCount: r.accessCount,
          lastAccessAt: r.lastAccessAt?.toISOString() ?? null,
          createdAt: r.createdAt?.toISOString() ?? null,
        })),
      },
    } as const;
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? "Failed to list links." } as const;
  }
}

export async function createAccountShareLinkAction(input: z.input<typeof createShareSchema>) {
  try {
    const parsed = createShareSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Invalid share payload." } as const;
    }
    const userId = await requireSessionUserId();
    const entry = await getEntry(userId, parsed.data.entryId);
    if (!entry || (entry.kind !== "file" && entry.kind !== "folder")) {
      return { ok: false, error: "Item not found." } as const;
    }
    const password = parsed.data.password?.trim();
    const withPassword = Boolean(password);
    const withExpiry = parsed.data.expiresAt !== undefined;
    await assertCanCreateSharedLink(userId, { withPassword, withExpiry });

    let expiresAt: Date | null = null;
    if (parsed.data.expiresAt && parsed.data.expiresAt !== null) {
      const d = new Date(parsed.data.expiresAt);
      if (Number.isNaN(d.getTime())) {
        return { ok: false, error: "Invalid expiresAt." } as const;
      }
      expiresAt = d;
    }

    const shareId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const token = newShareToken();
    await insertShareLink({
      id: shareId,
      token,
      userId,
      entryId: entry.id,
      passwordHash: password ? hashSharePassword(password) : null,
      expiresAt,
      revokedAt: null,
      lastAccessAt: null,
      accessCount: 0,
    });
    const base = baseUrlFromHeaders(await headers());
    return {
      ok: true,
      data: {
        id: shareId,
        token,
        url: `${base}/s/${token}`,
        hasPassword: Boolean(password),
        expiresAt: expiresAt?.toISOString() ?? null,
      },
    } as const;
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message ?? "Could not create share link.",
    } as const;
  }
}

export async function revokeAccountShareLinkAction(shareId: string) {
  try {
    if (!shareId?.trim()) return { ok: false, error: "Invalid share id." } as const;
    const userId = await requireSessionUserId();
    await revokeShareLink(userId, shareId.trim());
    return { ok: true, data: { ok: true } } as const;
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? "Could not revoke share link." } as const;
  }
}

export async function deleteAccountEntryAction(entryId: string) {
  try {
    if (!entryId?.trim()) return { ok: false, error: "Invalid entry id." } as const;
    const userId = await requireSessionUserId();
    await removeEntryTree(userId, entryId.trim());
    return { ok: true, data: { ok: true } } as const;
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? "Delete failed." } as const;
  }
}

export async function bulkDeleteAccountEntriesAction(input: z.input<typeof bulkDeleteSchema>) {
  try {
    const parsed = bulkDeleteSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid bulk delete payload." } as const;
    const userId = await requireSessionUserId();

    const selected = Array.from(new Set(parsed.data.entryIds));
    const selectedSet = new Set(selected);
    const rowMap = new Map<string, Awaited<ReturnType<typeof getEntry>>>();

    await Promise.all(
      selected.map(async (id) => {
        const row = await getEntry(userId, id);
        rowMap.set(id, row);
      }),
    );

    const shouldSkipAsDescendant = async (entryId: string) => {
      const row = rowMap.get(entryId);
      if (!row) return true;
      let parentId = row.parentId;
      for (let i = 0; i < 256 && parentId; i += 1) {
        if (selectedSet.has(parentId)) return true;
        let parent = rowMap.get(parentId);
        if (parent === undefined) {
          parent = await getEntry(userId, parentId);
          rowMap.set(parentId, parent);
        }
        if (!parent) break;
        parentId = parent.parentId;
      }
      return false;
    };

    const deleteIds: string[] = [];
    for (const id of selected) {
      if (await shouldSkipAsDescendant(id)) continue;
      if (!rowMap.get(id)) continue;
      deleteIds.push(id);
    }

    await Promise.all(deleteIds.map((id) => removeEntryTree(userId, id)));
    return {
      ok: true,
      data: { ok: true, deleted: deleteIds.length, requested: selected.length },
    } as const;
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? "Bulk delete failed." } as const;
  }
}
