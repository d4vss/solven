import {
  countUserFolders,
  sumUserFileBytes,
} from "@/lib/account/storage-entry-repo";
import { getUsageCountersForEnforcement, getUserPlanSlug } from "@/lib/account/user-plan-repo";
import { resolvePlan } from "@/lib/plans/resolve";

export type PlanLimitErrorCode =
  | "PLAN_FILE_TOO_LARGE"
  | "PLAN_STORAGE_FULL"
  | "FILE_TOO_LARGE"
  | "STORAGE_LIMIT_EXCEEDED"
  | "DAILY_UPLOAD_LIMIT_EXCEEDED"
  | "BANDWIDTH_LIMIT_EXCEEDED"
  | "FAIR_USE_FLAGGED"
  | "PLAN_FOLDER_LIMIT";

export class PlanQuotaError extends Error {
  readonly code: PlanLimitErrorCode;

  constructor(message: string, code: PlanLimitErrorCode) {
    super(message);
    this.name = "PlanQuotaError";
    this.code = code;
  }
}

export async function getResolvedPlanForUser(userId: string) {
  const slug = await getUserPlanSlug(userId);
  return { slug, plan: resolvePlan(slug) };
}

export async function assertCanAcceptFileUpload(
  userId: string,
  newFileBytes: number,
) {
  const { plan } = await getResolvedPlanForUser(userId);
  const limits = plan.limits;

  if (newFileBytes > limits.maxSingleFileBytes) {
    throw new PlanQuotaError(
      "File exceeds the maximum size for your plan.",
      "PLAN_FILE_TOO_LARGE",
    );
  }

  const totalBytes = await sumUserFileBytes(userId);

  if (totalBytes + newFileBytes > limits.maxTotalStorageBytes) {
    throw new PlanQuotaError(
      "Not enough storage quota left on your plan.",
      "PLAN_STORAGE_FULL",
    );
  }
}

export function getPlanLimits(plan: ReturnType<typeof resolvePlan>) {
  return {
    storageLimitBytes: plan.limits.maxTotalStorageBytes,
    maxFileSizeBytes: plan.limits.maxSingleFileBytes,
    monthlyBandwidthBytes: plan.limits.monthlyBandwidthBytesCap,
    dailyUploadBytes: plan.limits.dailyUploadBytesCap,
  };
}

export async function checkUploadAllowed(userId: string, fileSize: number) {
  const { plan } = await getResolvedPlanForUser(userId);
  const limits = getPlanLimits(plan);
  if (fileSize > limits.maxFileSizeBytes) {
    throw new PlanQuotaError(
      "File exceeds the maximum size for your plan.",
      "FILE_TOO_LARGE",
    );
  }
  const [totalBytes, usage] = await Promise.all([
    sumUserFileBytes(userId),
    getUsageCountersForEnforcement(userId),
  ]);
  if (totalBytes + fileSize > limits.storageLimitBytes) {
    throw new PlanQuotaError(
      "Not enough storage quota left on your plan.",
      "STORAGE_LIMIT_EXCEEDED",
    );
  }
  if (
    limits.dailyUploadBytes !== null &&
    usage.uploadUsedTodayBytes + fileSize > limits.dailyUploadBytes
  ) {
    throw new PlanQuotaError(
      "Daily upload limit exceeded for your plan.",
      "DAILY_UPLOAD_LIMIT_EXCEEDED",
    );
  }
}

export async function checkDownloadAllowed(userId: string, fileSize: number) {
  const { plan } = await getResolvedPlanForUser(userId);
  const limits = getPlanLimits(plan);
  const usage = await getUsageCountersForEnforcement(userId);
  if (usage.isFlagged) {
    throw new PlanQuotaError(
      "Account is flagged for fair-use review.",
      "FAIR_USE_FLAGGED",
    );
  }
  if (
    limits.monthlyBandwidthBytes !== null &&
    usage.bandwidthUsedMonthBytes + fileSize > limits.monthlyBandwidthBytes
  ) {
    throw new PlanQuotaError(
      "Bandwidth limit exceeded for your plan.",
      "BANDWIDTH_LIMIT_EXCEEDED",
    );
  }
}

export async function assertCanCreateFolder(userId: string) {
  const { plan } = await getResolvedPlanForUser(userId);
  const n = await countUserFolders(userId);
  if (n >= plan.limits.maxFolders) {
    throw new PlanQuotaError(
      "Folder limit reached for your plan.",
      "PLAN_FOLDER_LIMIT",
    );
  }
}

/** Initial auto-delete deadline from inactivity (from registration time). */
export function inactiveAutoDeleteDeadline(
  plan: ReturnType<typeof resolvePlan>,
): Date | null {
  const minutes = plan.limits.inactiveAutoDeleteMinutes;
  if (minutes != null) {
    const d = new Date();
    d.setTime(d.getTime() + minutes * 60_000);
    return d;
  }
  const days = plan.limits.inactiveAutoDeleteDays;
  if (days == null) return null;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * After a successful download: extend sliding inactivity window when configured.
 * `undefined` = leave `expires_at` unchanged.
 */
export function nextExpiresAtAfterDownload(
  plan: ReturnType<typeof resolvePlan>,
): Date | null | undefined {
  const lim = plan.limits;
  if (!lim.resetInactivityTimerOnDownload) return undefined;
  if (lim.inactiveAutoDeleteMinutes != null) {
    const d = new Date();
    d.setTime(d.getTime() + lim.inactiveAutoDeleteMinutes * 60_000);
    return d;
  }
  if (lim.inactiveAutoDeleteDays == null) return undefined;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + lim.inactiveAutoDeleteDays);
  return d;
}

/** @deprecated Use `inactiveAutoDeleteDeadline` */
export const expiresAtForNewFile = inactiveAutoDeleteDeadline;
