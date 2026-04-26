import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getEntry, listEntries } from "@/lib/account/storage-entry-repo";
import {
  presignDownloadForEntry,
  purgeExpiredFileIfNeededForUser,
  recordEntryDownload,
} from "@/lib/account/storage-entry-service";
import { createPresignedGetUrl, getObjectBuffer } from "@/lib/storage";
import { requireAuthenticatedUserId } from "@/lib/auth/request-user";

type RouteCtx = { params: Promise<{ id: string }> };

async function collectFolderFiles(
  userId: string,
  folderId: string,
  pathPrefix = "",
): Promise<Array<{ entryId: string; zipPath: string; r2Key: string }>> {
  const rows = await listEntries(userId, folderId);
  const out: Array<{ entryId: string; zipPath: string; r2Key: string }> = [];
  for (const row of rows) {
    const safeName = row.name.replace(/[\\/]/g, "_");
    if (row.kind === "folder") {
      const nested = await collectFolderFiles(
        userId,
        row.id,
        `${pathPrefix}${safeName}/`,
      );
      out.push(...nested);
      continue;
    }
    if (!row.r2Key) continue;
    await purgeExpiredFileIfNeededForUser(userId, row.id);
    const fresh = await getEntry(userId, row.id);
    if (!fresh || fresh.kind !== "file" || !fresh.r2Key) continue;
    out.push({
      entryId: fresh.id,
      zipPath: `${pathPrefix}${safeName}`,
      r2Key: fresh.r2Key,
    });
  }
  return out;
}

export async function POST(request: Request, ctx: RouteCtx) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const { id } = await ctx.params;
    const row = await getEntry(userId, id);
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (row.kind === "folder") {
      const files = await collectFolderFiles(userId, row.id);
      const zip = new JSZip();
      for (const file of files) {
        const { buffer } = await getObjectBuffer(file.r2Key);
        zip.file(file.zipPath, buffer);
        await recordEntryDownload(userId, file.entryId);
      }
      const zipName = `${row.name.replace(/[\\/]/g, "_") || "folder"}.zip`;
      const bytes = await zip.generateAsync({
        type: "uint8array",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      return new Response(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${zipName}"`,
          "Cache-Control": "no-store",
        },
      });
    }
    const { r2Key, downloadFileName } = await presignDownloadForEntry(
      userId,
      id,
    );
    let expiresInSeconds: number | undefined;
    try {
      const json: unknown = await request.json();
      if (
        json &&
        typeof json === "object" &&
        typeof (json as { expiresInSeconds?: unknown }).expiresInSeconds ===
          "number"
      ) {
        expiresInSeconds = (json as { expiresInSeconds: number })
          .expiresInSeconds;
      }
    } catch {
      /* optional body */
    }

    const url = await createPresignedGetUrl({
      key: r2Key,
      expiresInSeconds,
      downloadFileName,
    });
    await recordEntryDownload(userId, id);
    return NextResponse.json({ url });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const msg = (e as Error).message ?? "Download failed";
    if (msg === "Not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (msg.includes("expired")) {
      return NextResponse.json({ error: msg }, { status: 410 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
