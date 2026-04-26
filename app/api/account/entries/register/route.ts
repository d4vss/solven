import { NextResponse } from "next/server";
import { z } from "zod";
import { registerUploadedFile } from "@/lib/account/storage-entry-service";
import { PlanQuotaError } from "@/lib/plans";
import { requireAuthenticatedUserId } from "@/lib/auth/request-user";

const bodySchema = z.object({
  key: z.string().min(1).max(1024),
  name: z.string().min(1).max(200),
  expectedSizeBytes: z.number().int().positive(),
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
    const out = await registerUploadedFile({
      userId,
      key: parsed.data.key,
      name: parsed.data.name,
      expectedSizeBytes: parsed.data.expectedSizeBytes,
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
    const msg = (e as Error).message ?? "Register failed";
    const status =
      msg === "Not found" || msg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
