import { eq, sql } from "drizzle-orm";
import db from "@/lib/db";
import { userPlan } from "@/lib/db/schema";
import { DEFAULT_PLAN_ID, PLAN_IDS } from "@/lib/plans";

export type UserPlanRow = {
  planSlug: string;
  planStatus: string;
  renewsAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  uploadUsedTodayBytes: number;
  uploadDayStartsAt: Date | null;
  bandwidthUsedMonthBytes: number;
  bandwidthMonthStartsAt: Date | null;
  isFlagged: boolean;
};

function dayStartUtc(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function monthStartUtc(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function getUserPlan(userId: string): Promise<UserPlanRow> {
  const rows = await db
    .select()
    .from(userPlan)
    .where(eq(userPlan.userId, userId))
    .limit(1);
  return {
    planSlug: rows[0]?.planSlug ?? DEFAULT_PLAN_ID,
    planStatus: rows[0]?.planStatus ?? "active",
    renewsAt: rows[0]?.renewsAt ?? null,
    stripeCustomerId: rows[0]?.stripeCustomerId ?? null,
    stripeSubscriptionId: rows[0]?.stripeSubscriptionId ?? null,
    uploadUsedTodayBytes: Number(rows[0]?.uploadUsedTodayBytes ?? 0),
    uploadDayStartsAt: rows[0]?.uploadDayStartsAt ?? null,
    bandwidthUsedMonthBytes: Number(rows[0]?.bandwidthUsedMonthBytes ?? 0),
    bandwidthMonthStartsAt: rows[0]?.bandwidthMonthStartsAt ?? null,
    isFlagged: Number(rows[0]?.isFlagged ?? 0) > 0,
  };
}

export async function getUserPlanSlug(userId: string): Promise<string> {
  const row = await getUserPlan(userId);
  return row.planSlug;
}

export async function setUserPlanSlug(userId: string, slug: string) {
  if (!PLAN_IDS.includes(slug)) {
    throw new Error("Unknown plan");
  }
  await db
    .insert(userPlan)
    .values({ userId, planSlug: slug })
    .onConflictDoUpdate({
      target: userPlan.userId,
      set: { planSlug: slug, updatedAt: new Date() },
    });
}

export async function activateUserPlan(input: {
  userId: string;
  slug: string;
  renewsAt: Date;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  if (!PLAN_IDS.includes(input.slug)) {
    throw new Error("Unknown plan");
  }
  await db
    .insert(userPlan)
    .values({
      userId: input.userId,
      planSlug: input.slug,
      planStatus: "active",
      renewsAt: input.renewsAt,
      stripeCustomerId: input.stripeCustomerId ?? null,
      stripeSubscriptionId: input.stripeSubscriptionId ?? null,
    })
    .onConflictDoUpdate({
      target: userPlan.userId,
      set: {
        planSlug: input.slug,
        planStatus: "active",
        renewsAt: input.renewsAt,
        stripeCustomerId: input.stripeCustomerId ?? null,
        stripeSubscriptionId: input.stripeSubscriptionId ?? null,
        updatedAt: new Date(),
      },
    });
}

export async function setStripeCustomerId(userId: string, stripeCustomerId: string) {
  await db
    .insert(userPlan)
    .values({
      userId,
      stripeCustomerId,
      planSlug: DEFAULT_PLAN_ID,
    })
    .onConflictDoUpdate({
      target: userPlan.userId,
      set: {
        stripeCustomerId,
        updatedAt: new Date(),
      },
    });
}

export async function updateBillingState(input: {
  userId: string;
  planSlug?: string;
  planStatus?: string;
  renewsAt?: Date | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.planSlug) set.planSlug = input.planSlug;
  if (input.planStatus) set.planStatus = input.planStatus;
  if (input.renewsAt !== undefined) set.renewsAt = input.renewsAt;
  if (input.stripeCustomerId !== undefined) {
    set.stripeCustomerId = input.stripeCustomerId;
  }
  if (input.stripeSubscriptionId !== undefined) {
    set.stripeSubscriptionId = input.stripeSubscriptionId;
  }
  await db
    .insert(userPlan)
    .values({
      userId: input.userId,
      planSlug: input.planSlug ?? DEFAULT_PLAN_ID,
      planStatus: input.planStatus ?? "active",
      renewsAt: input.renewsAt ?? null,
      stripeCustomerId: input.stripeCustomerId ?? null,
      stripeSubscriptionId: input.stripeSubscriptionId ?? null,
    })
    .onConflictDoUpdate({
      target: userPlan.userId,
      set,
    });
}

export async function getUsageCountersForEnforcement(userId: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    await tx
      .insert(userPlan)
      .values({ userId, planSlug: DEFAULT_PLAN_ID })
      .onConflictDoNothing();

    const rows = await tx
      .select()
      .from(userPlan)
      .where(eq(userPlan.userId, userId))
      .limit(1);
    const row = rows[0];
    const now = new Date();
    const today = dayStartUtc(now);
    const thisMonth = monthStartUtc(now);
    const uploadDayStartsAt = row?.uploadDayStartsAt ?? today;
    const bandwidthMonthStartsAt = row?.bandwidthMonthStartsAt ?? thisMonth;
    const resetUpload = uploadDayStartsAt.getTime() !== today.getTime();
    const resetBandwidth = bandwidthMonthStartsAt.getTime() !== thisMonth.getTime();

    if (resetUpload || resetBandwidth) {
      await tx
        .update(userPlan)
        .set({
          ...(resetUpload
            ? {
                uploadUsedTodayBytes: 0,
                uploadDayStartsAt: today,
              }
            : {}),
          ...(resetBandwidth
            ? {
                bandwidthUsedMonthBytes: 0,
                bandwidthMonthStartsAt: thisMonth,
              }
            : {}),
          updatedAt: now,
        })
        .where(eq(userPlan.userId, userId));
    }

    const refreshedRows = await tx
      .select()
      .from(userPlan)
      .where(eq(userPlan.userId, userId))
      .limit(1);
    const current = refreshedRows[0];
    return {
      uploadUsedTodayBytes: Number(current?.uploadUsedTodayBytes ?? 0),
      bandwidthUsedMonthBytes: Number(current?.bandwidthUsedMonthBytes ?? 0),
      isFlagged: Number(current?.isFlagged ?? 0) > 0,
    };
  });
}

export async function addUploadUsageToday(userId: string, bytes: number) {
  await db
    .update(userPlan)
    .set({
      uploadUsedTodayBytes: sql`${userPlan.uploadUsedTodayBytes} + ${bytes}`,
      updatedAt: new Date(),
    })
    .where(eq(userPlan.userId, userId));
}

export async function addBandwidthUsageMonth(userId: string, bytes: number) {
  await db
    .update(userPlan)
    .set({
      bandwidthUsedMonthBytes: sql`${userPlan.bandwidthUsedMonthBytes} + ${bytes}`,
      updatedAt: new Date(),
    })
    .where(eq(userPlan.userId, userId));
}

export async function setUserFlagged(userId: string, flagged: boolean) {
  await db
    .update(userPlan)
    .set({ isFlagged: flagged ? 1 : 0, updatedAt: new Date() })
    .where(eq(userPlan.userId, userId));
}
