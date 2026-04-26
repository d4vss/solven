import type { PlanDefinition } from "@/lib/plans/types";

export class ManualExpiryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManualExpiryError";
  }
}

export function validateManualExpiresAt(
  plan: PlanDefinition,
  expiresAt: Date | null,
): void {
  if (!plan.limits.manualExpirationAllowed) {
    throw new ManualExpiryError(
      "Manual expiration is not available on your plan.",
    );
  }
  if (expiresAt === null) {
    if (!plan.limits.keepForeverAllowed) {
      throw new ManualExpiryError(
        "Your plan does not allow removing the expiry date.",
      );
    }
    return;
  }
  if (expiresAt.getTime() <= Date.now()) {
    throw new ManualExpiryError("Expiry must be in the future.");
  }
  const maxDays = plan.limits.manualExpiresMaxDaysFromNow;
  if (maxDays != null) {
    const cap = Date.now() + maxDays * 86_400_000;
    if (expiresAt.getTime() > cap) {
      throw new ManualExpiryError(
        `On your plan, expiry cannot be more than ${maxDays} days from now.`,
      );
    }
  }
}
