import Stripe from "stripe";

export const PAID_PLAN_IDS = ["gold", "diamond"] as const;
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

function envPriceForPlan(plan: PaidPlanId) {
  if (plan === "gold") return process.env.STRIPE_PRICE_GOLD_MONTHLY?.trim();
  return process.env.STRIPE_PRICE_DIAMOND_MONTHLY?.trim();
}

export function resolveStripePriceIdForPlan(plan: string) {
  if (!PAID_PLAN_IDS.includes(plan as PaidPlanId)) return null;
  return envPriceForPlan(plan as PaidPlanId) || null;
}

export function resolvePlanIdFromStripePriceId(priceId: string | null | undefined) {
  const id = priceId?.trim();
  if (!id) return null;
  if (id === process.env.STRIPE_PRICE_GOLD_MONTHLY?.trim()) return "gold";
  if (id === process.env.STRIPE_PRICE_DIAMOND_MONTHLY?.trim()) return "diamond";
  return null;
}

export function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("Stripe is not configured.");
  return new Stripe(key);
}
