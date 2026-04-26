import Stripe from "stripe";
import { NextResponse } from "next/server";
import { updateBillingState } from "@/lib/account/user-plan-repo";
import { getStripeClient, resolvePlanIdFromStripePriceId } from "@/lib/billing/stripe";

function webhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim();
}

function renewsAtFromUnix(ts: number | null | undefined) {
  if (!ts) return null;
  return new Date(ts * 1000);
}

export async function POST(request: Request) {
  try {
    const secret = webhookSecret();
    if (!secret) {
      return NextResponse.json(
        { error: "STRIPE_WEBHOOK_SECRET is not configured." },
        { status: 500 },
      );
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature." }, { status: 400 });
    }
    const payload = await request.text();
    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(payload, signature, secret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId;
      if (userId && planId) {
        await updateBillingState({
          userId,
          planSlug: planId,
          planStatus: "active",
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : null,
          stripeSubscriptionId:
            typeof session.subscription === "string" ? session.subscription : null,
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId ?? null;
      const planId = resolvePlanIdFromStripePriceId(sub.items.data[0]?.price?.id);
      if (userId) {
        const currentPeriodEnd = (sub as unknown as { current_period_end?: number })
          .current_period_end;
        await updateBillingState({
          userId,
          ...(planId ? { planSlug: planId } : {}),
          planStatus: sub.status === "active" ? "active" : sub.status,
          renewsAt: renewsAtFromUnix(currentPeriodEnd),
          stripeCustomerId:
            typeof sub.customer === "string" ? sub.customer : null,
          stripeSubscriptionId: sub.id,
        });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Webhook handling failed." },
      { status: 400 },
    );
  }
}
