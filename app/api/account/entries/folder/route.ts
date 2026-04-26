import { NextResponse } from "next/server";
import { z } from "zod";
import { createFolder } from "@/lib/account/storage-entry-service";
import { PlanQuotaError } from "@/lib/plans";
import { requireAuthenticatedUserId } from "@/lib/auth/request-user";

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.union([z.string().min(1).max(64), z.null()]).optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const parentId =
      parsed.data.parentId === undefined ? null : parsed.data.parentId;
    const out = await createFolder({
      userId,
      name: parsed.data.name,
      parentId,
    });
    return NextResponse.json(out);
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof PlanQuotaError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: 403 },
      );
    }
    const msg = (e as Error).message ?? "Could not create folder";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
