import { NextResponse } from "next/server";
import { z } from "zod";
import { getEntryByKey } from "@/lib/account/storage-entry-repo";
import { addBandwidthUsageMonth, getUsageCountersForEnforcement, setUserFlagged } from "@/lib/account/user-plan-repo";
import { checkDownloadAllowed } from "@/lib/plans";
import { assertUserOwnsKey, createPresignedGetUrl } from "@/lib/storage";
import { requireAuthenticatedUserId } from "@/lib/auth/request-user";

const bodySchema = z.object({
  key: z.string().min(1).max(1024),
  expiresInSeconds: z.number().int().min(60).max(3600).optional(),
  downloadFileName: z.string().min(1).max(500).optional(),
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
    assertUserOwnsKey(parsed.data.key, userId);
    const entry = await getEntryByKey(userId, parsed.data.key);
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await checkDownloadAllowed(userId, entry.sizeBytes);
    await addBandwidthUsageMonth(userId, entry.sizeBytes);
    const usage = await getUsageCountersForEnforcement(userId);
    if (usage.bandwidthUsedMonthBytes > 5 * 1024 ** 4) {
      await setUserFlagged(userId, true);
    }
    const url = await createPresignedGetUrl({
      key: parsed.data.key,
      expiresInSeconds: parsed.data.expiresInSeconds,
      downloadFileName: parsed.data.downloadFileName,
    });
    return NextResponse.json({ url });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Presign failed" }, { status: 500 });
  }
}
