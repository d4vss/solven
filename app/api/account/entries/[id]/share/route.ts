import { NextResponse } from "next/server";
import { z } from "zod";
import { getEntry } from "@/lib/account/storage-entry-repo";
import {
  insertShareLink,
  listShareLinksForEntry,
} from "@/lib/account/share-link-repo";
import {
  assertCanCreateSharedLink,
  purgeExpiredFileIfNeededForUser,
} from "@/lib/account/storage-entry-service";
import { newShareToken, hashSharePassword } from "@/lib/storage/share-link";
import { requireAuthenticatedUserId } from "@/lib/auth/request-user";

type RouteCtx = { params: Promise<{ id: string }> };

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

const postSchema = z.object({
  password: z.string().min(1).max(200).optional(),
  expiresAt: z.union([z.string().min(1), z.null()]).optional(),
});

function baseUrlFromRequest(request: Request) {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  return new URL(request.url).origin;
}

export async function GET(request: Request, ctx: RouteCtx) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const { id } = await ctx.params;
    const rows = await listShareLinksForEntry(userId, id);
    return NextResponse.json({
      links: rows.map((r) => ({
        id: r.id,
        token: r.token,
        hasPassword: Boolean(r.passwordHash),
        expiresAt: r.expiresAt?.toISOString() ?? null,
        accessCount: r.accessCount,
        lastAccessAt: r.lastAccessAt?.toISOString() ?? null,
        createdAt: r.createdAt?.toISOString() ?? null,
      })),
    }, { headers: NO_STORE_HEADERS });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to list links" }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: RouteCtx) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const { id } = await ctx.params;
    const removed = await purgeExpiredFileIfNeededForUser(userId, id);
    if (removed) {
      return NextResponse.json({ error: "File expired" }, { status: 410 });
    }
    const entry = await getEntry(userId, id);
    if (!entry || (entry.kind !== "file" && entry.kind !== "folder")) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const json: unknown = await request.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const password = parsed.data.password?.trim();
    const withPassword = Boolean(password);
    const withExpiry = parsed.data.expiresAt !== undefined;
    await assertCanCreateSharedLink(userId, { withPassword, withExpiry });

    let expiresAt: Date | null = null;
    if (parsed.data.expiresAt && parsed.data.expiresAt !== null) {
      const d = new Date(parsed.data.expiresAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid expiresAt" }, { status: 400 });
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

    const base = baseUrlFromRequest(request);
    return NextResponse.json({
      id: shareId,
      token,
      url: `${base}/s/${token}`,
      hasPassword: Boolean(password),
      expiresAt: expiresAt?.toISOString() ?? null,
    });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const msg = (e as Error).message ?? "Could not create share link";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
