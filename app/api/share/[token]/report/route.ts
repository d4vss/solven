import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { storageShareReport } from "@/lib/db/schema";
import { getShareLinkByToken } from "@/lib/account/share-link-repo";

type RouteCtx = { params: Promise<{ token: string }> };

const reportSchema = z.object({
  issueType: z.enum([
    "BROKEN_LINK",
    "MALWARE_OR_VIRUS",
    "COPYRIGHT",
    "ILLEGAL_CONTENT",
    "SPAM_OR_PHISHING",
    "OTHER",
  ]),
  reason: z.string().trim().max(2000).optional(),
});

function getIpAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function POST(request: Request, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params;
    const link = await getShareLinkByToken(token);
    if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const payload: unknown = await request.json().catch(() => ({}));
    const parsed = reportSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const reportId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    await db.insert(storageShareReport).values({
      id: reportId,
      token,
      shareId: link.id,
      entryId: link.entryId,
      issueType: parsed.data.issueType,
      reason: parsed.data.reason ?? "",
      reporterIp: getIpAddress(request),
      reporterUserAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true, id: reportId });
  } catch {
    return NextResponse.json({ error: "Could not submit report." }, { status: 500 });
  }
}
