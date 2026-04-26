import { DEFAULT_PLAN_ID, PLANS } from "@/lib/plans/config";
import type { PlanDefinition } from "@/lib/plans/types";

export function resolvePlan(slug: string | null | undefined): PlanDefinition {
  if (slug && slug in PLANS) {
    return PLANS[slug as keyof typeof PLANS] as PlanDefinition;
  }
  return PLANS[DEFAULT_PLAN_ID] as PlanDefinition;
}

export function listPlanDefinitions(): PlanDefinition[] {
  return Object.values(PLANS) as PlanDefinition[];
}

export function accountChipBorderClass(planSlug: string | null | undefined): string {
  return resolvePlan(planSlug).visual.borderClass;
}
