import { NextResponse } from "next/server";
import { z } from "zod";
import { getEntry } from "@/lib/account/storage-entry-repo";
import { removeEntryTree } from "@/lib/account/storage-entry-service";
import { requireAuthenticatedUserId } from "@/lib/auth/request-user";

const bulkDeleteSchema = z.object({
  entryIds: z.array(z.string().min(1)).min(1).max(500),
});

export async function POST(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const json: unknown = await request.json();
    const parsed = bulkDeleteSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const selected = Array.from(new Set(parsed.data.entryIds));
    const selectedSet = new Set(selected);

    const rowMap = new Map<string, Awaited<ReturnType<typeof getEntry>>>();
    await Promise.all(
      selected.map(async (id) => {
        const row = await getEntry(userId, id);
        rowMap.set(id, row);
      }),
    );

    const shouldSkipAsDescendant = async (entryId: string) => {
      const row = rowMap.get(entryId);
      if (!row) return true;
      let parentId = row.parentId;
      for (let i = 0; i < 256 && parentId; i += 1) {
        if (selectedSet.has(parentId)) return true;
        let parent = rowMap.get(parentId);
        if (parent === undefined) {
          parent = await getEntry(userId, parentId);
          rowMap.set(parentId, parent);
        }
        if (!parent) break;
        parentId = parent.parentId;
      }
      return false;
    };

    const deleteIds: string[] = [];
    for (const id of selected) {
      if (await shouldSkipAsDescendant(id)) continue;
      if (!rowMap.get(id)) continue;
      deleteIds.push(id);
    }

    await Promise.all(deleteIds.map((id) => removeEntryTree(userId, id)));
    return NextResponse.json({
      ok: true,
      deleted: deleteIds.length,
      requested: selected.length,
    });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: (e as Error).message ?? "Bulk delete failed" },
      { status: 500 },
    );
  }
}
