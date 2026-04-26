import { NextResponse } from "next/server";
import { z } from "zod";
import { getEntryById, listEntries } from "@/lib/account/storage-entry-repo";
import { purgeExpiredFileIfNeededByEntryId } from "@/lib/account/storage-entry-service";
import {
  getShareLinkByToken,
  recordShareAccess,
} from "@/lib/account/share-link-repo";
import { createPresignedGetUrl } from "@/lib/storage";
import { verifySharePassword } from "@/lib/storage/share-link";

type RouteCtx = { params: Promise<{ token: string }> };

async function isDescendantOfRoot(rootId: string, targetId: string) {
  let cursor = await getEntryById(targetId);
  for (let i = 0; i < 256 && cursor; i += 1) {
    if (cursor.id === rootId) return true;
    if (!cursor.parentId) return false;
    cursor = await getEntryById(cursor.parentId);
  }
  return false;
}

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

export async function GET(_request: Request, ctx: RouteCtx) {
  const { token } = await ctx.params;
  const link = await getShareLinkByToken(token);
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const entry = await getEntryById(link.entryId);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expired = Boolean(link.expiresAt && link.expiresAt.getTime() < Date.now());
  let folderEntries:
    | Array<{ id: string; name: string; kind: string; sizeBytes: number }>
    | undefined;
  let currentFolder:
    | { id: string; name: string; parentId: string | null }
    | undefined;
  if (entry.kind === "folder") {
    const requestUrl = new URL(_request.url);
    const folderIdParam = requestUrl.searchParams.get("folderId")?.trim() || null;
    const pageParam = Number(requestUrl.searchParams.get("page") || "1");
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const pageSize = 10;
    let folderToList = entry;
    if (folderIdParam && folderIdParam !== entry.id) {
      const candidate = await getEntryById(folderIdParam);
      if (
        candidate &&
        candidate.kind === "folder" &&
        candidate.userId === entry.userId &&
        (await isDescendantOfRoot(entry.id, candidate.id))
      ) {
        folderToList = candidate;
      }
    }
    const rows = await listEntries(entry.userId, folderToList.id);
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const rowsForPage = rows.slice(start, start + pageSize);
    folderEntries = await Promise.all(
      rowsForPage.map(async (row) => ({
        id: row.id,
        name: row.name,
        kind: row.kind,
        sizeBytes:
          row.kind === "folder"
            ? await sumFolderSizeBytes(entry.userId, row.id)
            : row.sizeBytes,
      })),
    );
    currentFolder = {
      id: folderToList.id,
      name: folderToList.name,
      parentId: folderToList.parentId,
    };
    return NextResponse.json({
      hasPassword: Boolean(link.passwordHash),
      expiresAt: link.expiresAt?.toISOString() ?? null,
      expired,
      entryKind: entry.kind,
      entryId: entry.id,
      entryName: entry.name,
      currentFolder,
      entries: folderEntries,
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages,
      },
    });
  }
  return NextResponse.json({
    hasPassword: Boolean(link.passwordHash),
    expiresAt: link.expiresAt?.toISOString() ?? null,
    expired,
    entryKind: entry.kind,
    entryId: entry.id,
    entryName: entry.name,
    entrySizeBytes: entry.kind === "file" ? entry.sizeBytes : null,
    currentFolder,
    entries: folderEntries,
  });
}

const postSchema = z.object({
  password: z.string().optional(),
  entryId: z.string().optional(),
  validateOnly: z.boolean().optional(),
});

export async function POST(request: Request, ctx: RouteCtx) {
  const { token } = await ctx.params;
  const link = await getShareLinkByToken(token);
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Share link expired" }, { status: 410 });
  }

  const payload: unknown = await request.json().catch(() => ({}));
  const parsed = postSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (link.passwordHash) {
    const pw = parsed.data.password?.trim() ?? "";
    if (!pw || !verifySharePassword(pw, link.passwordHash)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
  }

  if (parsed.data.validateOnly) {
    return NextResponse.json({ ok: true });
  }

  const entry = await getEntryById(link.entryId);
  if (entry?.kind === "file" && entry.expiresAt && entry.expiresAt.getTime() < Date.now()) {
    await purgeExpiredFileIfNeededByEntryId(entry.id);
    return NextResponse.json({ error: "File expired" }, { status: 410 });
  }
  if (!entry) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (entry.kind === "folder") {
    const childId = parsed.data.entryId?.trim();
    if (!childId) {
      return NextResponse.json(
        { error: "Select a file inside the shared folder." },
        { status: 400 },
      );
    }
    const child = await getEntryById(childId);
    if (!child || child.kind !== "file" || !child.r2Key) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    if (
      child.userId !== entry.userId ||
      !(await isDescendantOfRoot(entry.id, child.id))
    ) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    if (child.expiresAt && child.expiresAt.getTime() < Date.now()) {
      await purgeExpiredFileIfNeededByEntryId(child.id);
      return NextResponse.json({ error: "File expired" }, { status: 410 });
    }
    const url = await createPresignedGetUrl({
      key: child.r2Key,
      downloadFileName: child.name,
    });
    await recordShareAccess(link.id);
    return NextResponse.json({ url, name: child.name });
  }

  if (entry.kind !== "file" || !entry.r2Key) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const url = await createPresignedGetUrl({
    key: entry.r2Key,
    downloadFileName: entry.name,
  });
  await recordShareAccess(link.id);
  return NextResponse.json({ url, name: entry.name });
}
