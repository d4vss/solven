import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAccountPlanPayload } from "@/lib/account/api-plan-json";
import { activateUserPlan } from "@/lib/account/user-plan-repo";
import { DEFAULT_PLAN_ID, PLAN_IDS } from "@/lib/plans";
import { requireAuthenticatedUserId } from "@/lib/auth/request-user";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const payload = await buildAccountPlanPayload(userId);
    return NextResponse.json(payload, { headers: NO_STORE_HEADERS });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to load plan" }, { status: 500 });
  }
}

export async function POST() {
  try {
    return NextResponse.json(
      {
        error: "Changing plans requires completing checkout.",
        code: "CHECKOUT_REQUIRED",
      },
      { status: 403 },
    );
  } catch {
    return NextResponse.json({ error: "Could not update plan" }, { status: 500 });
  }
}

const renewSchema = z.object({
  slug: z.string().min(1),
  months: z.number().int().min(1).max(24).optional(),
  webhookSecret: z.string().min(1),
});

export async function PATCH(request: Request) {
  try {
    if (!process.env.SOLVEN_BILLING_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Billing webhook secret is not configured." },
        { status: 500 },
      );
    }
    const userId = await requireAuthenticatedUserId(request);
    const json: unknown = await request.json();
    const parsed = renewSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    if (parsed.data.webhookSecret !== process.env.SOLVEN_BILLING_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
    }
    const slug = parsed.data.slug.trim().toLowerCase();
    if (!PLAN_IDS.includes(slug)) {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }
    const months = parsed.data.months ?? 1;
    const renewsAt = new Date();
    renewsAt.setUTCMonth(renewsAt.getUTCMonth() + months);
    await activateUserPlan({
      userId,
      slug: slug === "free" ? DEFAULT_PLAN_ID : slug,
      renewsAt,
    });
    const payload = await buildAccountPlanPayload(userId);
    return NextResponse.json(payload);
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if ((e as Error).message === "Unknown plan") {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Could not renew plan" }, { status: 500 });
  }
}
