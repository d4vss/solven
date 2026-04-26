import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUserOwnsKey, deleteObjectKey, headObject } from "@/lib/storage";
import { requireAuthenticatedUserId } from "@/lib/auth/request-user";

const deleteSchema = z.object({
  key: z.string().min(1).max(1024),
});

const headQuerySchema = z.object({
  key: z.string().min(1).max(1024),
});

export async function DELETE(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const json: unknown = await request.json();
    const parsed = deleteSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    assertUserOwnsKey(parsed.data.key, userId);
    await deleteObjectKey(parsed.data.key);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const url = new URL(request.url);
    const parsed = headQuerySchema.safeParse({ key: url.searchParams.get("key") });
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing or invalid key" }, { status: 400 });
    }
    assertUserOwnsKey(parsed.data.key, userId);
    const meta = await headObject(parsed.data.key);
    return NextResponse.json({
      key: parsed.data.key,
      contentLength: meta.ContentLength,
      contentType: meta.ContentType,
      lastModified: meta.LastModified?.toISOString() ?? null,
      metadata: meta.Metadata ?? {},
    });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Head failed" }, { status: 500 });
  }
}
