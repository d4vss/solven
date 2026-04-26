import { NextResponse } from "next/server";
import { z } from "zod";
import { PlanQuotaError } from "@/lib/plans";
import {
  assertRemoteUploadAllowed,
  checkUploadAllowed,
  getResolvedPlanForUser,
} from "@/lib/plans";
import { buildObjectKey, uploadFromRemoteUrl } from "@/lib/storage";
import { requireAuthenticatedUserId } from "@/lib/auth/request-user";

const bodySchema = z.object({
  sourceUrl: z.string().url().max(2048),
  filename: z.string().min(1).max(200),
  contentType: z.string().max(200).optional(),
});

/**
 * Server-side remote fetch → R2. Uses the same `uploadFromRemoteUrl` helper as
 * `remoteUploadToMyStorageAction` in `app/actions/storage.ts`.
 */
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
    const key = buildObjectKey(userId, parsed.data.filename);
    const { plan } = await getResolvedPlanForUser(userId);
    await assertRemoteUploadAllowed(userId);
    const result = await uploadFromRemoteUrl({
      sourceUrl: parsed.data.sourceUrl,
      key,
      contentType: parsed.data.contentType,
      maxBytes: plan.limits.maxSingleFileBytes,
      beforePut: async (buf) => {
        await checkUploadAllowed(userId, buf.length);
      },
    });
    return NextResponse.json(result);
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
    const msg = (e as Error).message ?? "Remote upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
