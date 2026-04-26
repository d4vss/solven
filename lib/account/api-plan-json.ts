import { countUserFiles, sumUserFileBytes } from "@/lib/account/storage-entry-repo";
import { getUserPlan } from "@/lib/account/user-plan-repo";
import {
  listPlanDefinitions,
  resolvePlan,
  type PlanDefinition,
} from "@/lib/plans";

function slimPlan(p: PlanDefinition) {
  return {
    id: p.id,
    visual: p.visual,
    limits: p.limits,
    features: p.features,
  };
}

export async function buildAccountPlanPayload(userId: string) {
  const userPlan = await getUserPlan(userId);
  const plan = resolvePlan(userPlan.planSlug);
  const [fileCount, usedBytes] = await Promise.all([
    countUserFiles(userId),
    sumUserFileBytes(userId),
  ]);

  return {
    slug: userPlan.planSlug,
    status: userPlan.planStatus,
    renewsAt: userPlan.renewsAt?.toISOString() ?? null,
    plan: slimPlan(plan),
    usage: {
      fileCount,
      usedBytes,
      uploadUsedTodayBytes: userPlan.uploadUsedTodayBytes,
    },
    catalog: listPlanDefinitions().map(slimPlan),
  };
}

export type AccountPlanPayload = Awaited<
  ReturnType<typeof buildAccountPlanPayload>
>;
