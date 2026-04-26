import { NextResponse } from "next/server";
import { z } from "zod";
import { checkUploadAllowed, PlanQuotaError } from "@/lib/plans";
import {
  buildObjectKey,
  createPresignedPutUrl,
} from "@/lib/storage";
import { requireAuthenticatedUserId } from "@/lib/auth/request-user";

const bodySchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1).max(200),
  /** Declared upload size for quota checks before PUT. */
  sizeBytes: z.number().int().positive(),
  expiresInSeconds: z.number().int().min(60).max(120).optional(),
});

const WINDOW_MS = 60_000;
const LIMIT_PER_WINDOW = 60;
const uploadRateMap = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(userId: string, ip: string) {
  const now = Date.now();
  const key = `${userId}:${ip}`;
  const current = uploadRateMap.get(key);
  if (!current || now - current.windowStart >= WINDOW_MS) {
    uploadRateMap.set(key, { count: 1, windowStart: now });
    return false;
  }
  current.count += 1;
  uploadRateMap.set(key, current);
  return current.count > LIMIT_PER_WINDOW;
}

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
    const { filename, contentType, expiresInSeconds, sizeBytes } = parsed.data;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(userId, ip)) {
      return NextResponse.json({ error: "Too many upload requests." }, { status: 429 });
    }
    await checkUploadAllowed(userId, sizeBytes);
    const key = buildObjectKey(userId, filename);
    const url = await createPresignedPutUrl({
      key,
      contentType,
      expectedSizeBytes: sizeBytes,
      expiresInSeconds: Math.min(expiresInSeconds ?? 120, 120),
    });
    return NextResponse.json({ url, key });
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
    console.error(e);
    return NextResponse.json({ error: "Presign failed" }, { status: 500 });
  }
}
