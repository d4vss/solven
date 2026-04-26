import { NextResponse } from "next/server";
import { revokeShareLink } from "@/lib/account/share-link-repo";
import { requireAuthenticatedUserId } from "@/lib/auth/request-user";

type RouteCtx = { params: Promise<{ shareId: string }> };

export async function DELETE(request: Request, ctx: RouteCtx) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const { shareId } = await ctx.params;
    await revokeShareLink(userId, shareId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not revoke share link" }, { status: 500 });
  }
}
