import type { PlanDefinition } from "@/lib/plans/types";

const GB = 1024 ** 3;
const TB = 1024 ** 4;

function formatBytesCompact(bytes: number) {
  if (bytes >= TB) {
    const value = bytes / TB;
    return Number.isInteger(value) ? `${value} TB` : `${value.toFixed(1)} TB`;
  }
  const value = bytes / GB;
  if (value >= 1) {
    return Number.isInteger(value) ? `${value} GB` : `${value.toFixed(1)} GB`;
  }
  const mb = bytes / 1024 ** 2;
  return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`;
}

export function planPriceLabel(planId: string) {
  if (planId === "gold") return "EUR 4.99 / month";
  if (planId === "diamond") return "EUR 14.99 / month";
  return "Free";
}

export function planStorageLabel(plan: PlanDefinition) {
  return formatBytesCompact(plan.limits.maxTotalStorageBytes);
}

export function planMaxFileSizeLabel(plan: PlanDefinition) {
  return formatBytesCompact(plan.limits.maxSingleFileBytes);
}

export function planBandwidthLabel(plan: PlanDefinition) {
  if (plan.limits.monthlyBandwidthBytesCap === null) return "Unlimited";
  return `${formatBytesCompact(plan.limits.monthlyBandwidthBytesCap)} / month`;
}

export function planUploadPerDayLabel(plan: PlanDefinition) {
  if (plan.limits.dailyUploadBytesCap === null) return "Unlimited";
  return `${formatBytesCompact(plan.limits.dailyUploadBytesCap)} / day`;
}
