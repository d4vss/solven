import { NextResponse } from "next/server";
import { PlanQuotaError, checkUploadAllowed } from "@/lib/plans";
import { registerUploadedFile } from "@/lib/account/storage-entry-service";
import { requireAuthenticatedUserId } from "@/lib/auth/request-user";
import { buildObjectKey, putObjectBytes } from "@/lib/storage";

/**
 * Multipart local-file upload endpoint.
 * Accepts form-data:
 * - file: File (required)
 * - parentId: string | "null" | "" (optional)
 * - name: string (optional display name override)
 * - contentType: string (optional override)
 */
export async function POST(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing multipart field: file" }, { status: 400 });
    }

    const parentRaw = form.get("parentId");
    const parentId =
      typeof parentRaw === "string" && parentRaw.trim() && parentRaw !== "null"
        ? parentRaw.trim()
        : null;

    const displayNameRaw = form.get("name");
    const displayName =
      typeof displayNameRaw === "string" && displayNameRaw.trim()
        ? displayNameRaw.trim()
        : file.name;

    const contentTypeRaw = form.get("contentType");
    const contentType =
      typeof contentTypeRaw === "string" && contentTypeRaw.trim()
        ? contentTypeRaw.trim()
        : file.type || "application/octet-stream";

    const bytes = Buffer.from(await file.arrayBuffer());
    await checkUploadAllowed(userId, bytes.length);
    const key = buildObjectKey(userId, displayName);
    await putObjectBytes({
      key,
      body: bytes,
      contentType,
    });

    const entry = await registerUploadedFile({
      userId,
      key,
      name: displayName,
      expectedSizeBytes: bytes.length,
      parentId,
    });

    return NextResponse.json({
      entry,
      key,
      size: bytes.length,
      contentType,
    });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof PlanQuotaError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 403 });
    }
    const msg = (e as Error).message ?? "Upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
