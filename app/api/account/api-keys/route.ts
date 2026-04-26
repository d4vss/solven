import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createApiKeyForUser,
  listApiKeysForUser,
} from "@/lib/account/api-key-service";
import { requireSessionUserId } from "@/lib/storage/session";

const postSchema = z.object({
  name: z.string().min(1).max(80),
});

export async function GET() {
  try {
    const userId = await requireSessionUserId();
    const keys = await listApiKeysForUser(userId);
    return NextResponse.json({
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        createdAt: k.createdAt.toISOString(),
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      })),
    });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to list keys" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const json: unknown = await request.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const row = await createApiKeyForUser(userId, parsed.data.name);
    return NextResponse.json({
      id: row.id,
      name: row.name,
      keyPrefix: row.keyPrefix,
      key: row.rawKey,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const msg = (e as Error).message ?? "Could not create key";
    const status = msg.includes("at most") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
