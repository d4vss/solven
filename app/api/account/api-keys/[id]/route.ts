import { NextResponse } from "next/server";
import { revokeApiKey } from "@/lib/account/api-key-service";
import { requireSessionUserId } from "@/lib/storage/session";

type RouteCtx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, ctx: RouteCtx) {
  try {
    const userId = await requireSessionUserId();
    const { id } = await ctx.params;
    const ok = await revokeApiKey(userId, id);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Could not revoke key" }, { status: 500 });
  }
}
