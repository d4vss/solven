import type { PlanDefinition } from "@/lib/plans/types";

/** Default when DB slug is missing or unknown. */
export const DEFAULT_PLAN_ID = "free";

const GB = 1024 ** 3;
const MB = 1024 ** 2;

/**
 * Central catalog — add keys here to introduce new tiers.
 * Keep `id` equal to the object key for clarity.
 * Numeric limits pick representative values within the stated ranges.
 */
export const PLANS = {
  free: {
    id: "free",
    visual: {
      label: "Free",
      borderClass: "border-border/70",
      accentClass: "text-muted-foreground",
    },
    limits: {
      maxFiles: 75,
      maxTotalStorageBytes: 100 * MB,
      maxSingleFileBytes: 100 * MB,
      maxFolders: 25,
      remoteUploadEnabled: true,
      inactiveAutoDeleteDays: null,
      inactiveAutoDeleteMinutes: 5,
      resetInactivityTimerOnDownload: true,
      manualExpirationAllowed: false,
      keepForeverAllowed: false,
      manualExpiresMaxDaysFromNow: null,
      monthlyBandwidthBytesCap: 25 * GB,
      dailyUploadBytesCap: 100 * MB,
    },
    features: {
      publicLinks: true,
      passwordProtection: false,
      linkExpiration: false,
      analytics: "none",
      apiAccess: "none",
      teamFeatures: false,
      brandingAds: true,
    },
  },
  gold: {
    id: "gold",
    visual: {
      label: "Gold",
      borderClass:
        "border-amber-300 shadow-[0_0_0_1px_rgba(252,211,77,0.7),0_0_20px_-4px_rgba(251,191,36,0.5)]",
      accentClass: "text-amber-200/90",
    },
    limits: {
      maxFiles: 4000,
      maxTotalStorageBytes: 200 * GB,
      maxSingleFileBytes: 8 * GB,
      maxFolders: 800,
      remoteUploadEnabled: true,
      inactiveAutoDeleteDays: 90,
      resetInactivityTimerOnDownload: true,
      manualExpirationAllowed: true,
      keepForeverAllowed: false,
      manualExpiresMaxDaysFromNow: 365,
      monthlyBandwidthBytesCap: 400 * GB,
      dailyUploadBytesCap: 30 * GB,
    },
    features: {
      publicLinks: true,
      passwordProtection: true,
      linkExpiration: true,
      analytics: "basic",
      apiAccess: "limited",
      teamFeatures: false,
      brandingAds: false,
    },
  },
  diamond: {
    id: "diamond",
    visual: {
      label: "Diamond",
      borderClass:
        "border-cyan-200 shadow-[0_0_0_1px_rgba(125,211,252,0.75),0_0_22px_-4px_rgba(103,232,249,0.55)]",
      accentClass: "text-cyan-100/90",
    },
    limits: {
      maxFiles: 50_000,
      maxTotalStorageBytes: 1 * 1024 * GB,
      maxSingleFileBytes: 75 * GB,
      maxFolders: 12_000,
      remoteUploadEnabled: true,
      inactiveAutoDeleteDays: null,
      resetInactivityTimerOnDownload: true,
      manualExpirationAllowed: true,
      keepForeverAllowed: true,
      manualExpiresMaxDaysFromNow: null,
      monthlyBandwidthBytesCap: null,
      dailyUploadBytesCap: null,
    },
    features: {
      publicLinks: true,
      passwordProtection: true,
      linkExpiration: true,
      analytics: "advanced",
      apiAccess: "full",
      teamFeatures: true,
      brandingAds: false,
    },
  },
} as const satisfies Record<string, PlanDefinition>;

export type CatalogPlanId = keyof typeof PLANS;

export const PLAN_IDS = Object.keys(PLANS) as string[];
