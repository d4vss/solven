import { NextResponse } from "next/server";
import { z } from "zod";
import { moveEntry } from "@/lib/account/storage-entry-service";
import { requireAuthenticatedUserId } from "@/lib/auth/request-user";

const moveSchema = z.object({
  entryIds: z.array(z.string().min(1)).min(1).max(200),
  targetParentId: z.union([z.string().min(1), z.null()]),
});

export async function POST(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const json: unknown = await request.json();
    const parsed = moveSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const entryIds = Array.from(new Set(parsed.data.entryIds));
    for (const entryId of entryIds) {
      await moveEntry({
        userId,
        entryId,
        targetParentId: parsed.data.targetParentId,
      });
    }
    return NextResponse.json({ ok: true, moved: entryIds.length });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if ((e as Error).message === "Not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: (e as Error).message ?? "Move failed" },
      { status: 400 },
    );
  }
}
