import { NextResponse } from "next/server";
import { z } from "zod";
import { getEntry } from "@/lib/account/storage-entry-repo";
import { serializeEntry } from "@/lib/account/serialize-entry";
import {
  removeEntryTree,
  setFileManualExpiry,
} from "@/lib/account/storage-entry-service";
import { ManualExpiryError } from "@/lib/plans/manual-expiry";
import { requireAuthenticatedUserId } from "@/lib/auth/request-user";

type RouteCtx = { params: Promise<{ id: string }> };

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

const patchSchema = z.object({
  expiresAt: z.union([z.string().min(1), z.null()]),
});

export async function GET(request: Request, ctx: RouteCtx) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const { id } = await ctx.params;
    const row = await getEntry(userId, id);
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { entry: serializeEntry(row) },
      { headers: NO_STORE_HEADERS },
    );
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Read failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const { id } = await ctx.params;
    const json: unknown = await request.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const raw = parsed.data.expiresAt;
    let expiresAt: Date | null;
    if (raw === null) {
      expiresAt = null;
    } else {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { error: "Invalid expiresAt date" },
          { status: 400 },
        );
      }
      expiresAt = d;
    }
    await setFileManualExpiry({
      userId,
      entryId: id,
      expiresAt,
    });
    const row = await getEntry(userId, id);
    return NextResponse.json({
      entry: row ? serializeEntry(row) : null,
    });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if ((e as Error).message === "Not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (e instanceof ManualExpiryError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: RouteCtx) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const { id } = await ctx.params;
    await removeEntryTree(userId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if ((e as Error).message === "Not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
