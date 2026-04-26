import { NextResponse } from "next/server";
import { listEntries } from "@/lib/account/storage-entry-repo";
import { serializeEntry } from "@/lib/account/serialize-entry";
import { purgeExpiredFilesForUser } from "@/lib/account/storage-entry-service";
import { requireAuthenticatedUserId } from "@/lib/auth/request-user";

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

export async function GET(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const url = new URL(request.url);
    const raw = url.searchParams.get("parentId");
    const pageRaw = Number(url.searchParams.get("page") ?? "1");
    const pageSizeRaw = Number(url.searchParams.get("pageSize") ?? "25");
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const pageSize = Number.isFinite(pageSizeRaw)
      ? Math.min(100, Math.max(5, Math.floor(pageSizeRaw)))
      : 25;
    const parentId =
      raw === null || raw === "" || raw === "null" ? null : raw;
    await purgeExpiredFilesForUser(userId).catch((e) => {
      console.error("Expired-file purge failed during list:", e);
    });
    const rows = await listEntries(userId, parentId);
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
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;
    const pageRows = ordered.slice(start, start + pageSize);
    return NextResponse.json({
      entries: pageRows.map(serializeEntry),
      page: currentPage,
      pageSize,
      total,
      totalPages,
    });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "List failed" }, { status: 500 });
  }
}
