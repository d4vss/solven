/**
 * Expandable plan system: add entries to `PLANS` in config.ts with matching
 * shapes. Unknown slugs fall back to `DEFAULT_PLAN_ID`.
 */

/** Gates for product behavior and plan comparison display. */
export type PlanFeatureFlags = {
  publicLinks: boolean;
  passwordProtection: boolean;
  linkExpiration: boolean;
  analytics: "none" | "basic" | "advanced";
  apiAccess: "none" | "limited" | "full";
  teamFeatures: boolean;
  /** Community / ads surface for free tier. */
  brandingAds: boolean;
};

export type PlanLimits = {
  maxFiles: number;
  maxTotalStorageBytes: number;
  maxSingleFileBytes: number;
  maxFolders: number;
  remoteUploadEnabled: boolean;
  /**
   * Days without activity before auto-delete; activity = download (resets timer).
   * `null` = no inactivity auto-delete (manual / optional only).
   */
  inactiveAutoDeleteDays: number | null;
  /**
   * Optional minute-level inactivity auto-delete window for POC/testing.
   * When set, this takes precedence over `inactiveAutoDeleteDays`.
   */
  inactiveAutoDeleteMinutes?: number | null;
  /** When true and `inactiveAutoDeleteDays` is set, each download pushes expiry out. */
  resetInactivityTimerOnDownload: boolean;
  manualExpirationAllowed: boolean;
  /** Allow clearing `expires_at` (keep until user deletes). */
  keepForeverAllowed: boolean;
  /** Max horizon for a manual expiry from “now” (`null` = no cap). */
  manualExpiresMaxDaysFromNow: number | null;
  /** Soft cap for future metering (`null` = not enforced yet). */
  monthlyBandwidthBytesCap: number | null;
  dailyUploadBytesCap: number | null;
};

export type PlanVisual = {
  label: string;
  /** Tailwind classes for the account chip border (outline button). */
  borderClass: string;
  accentClass?: string;
};

export type PlanDefinition = {
  id: string;
  visual: PlanVisual;
  limits: PlanLimits;
  features: PlanFeatureFlags;
};
