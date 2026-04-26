import { relations } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "@/lib/db/schemas/auth";

export const storageEntry = pgTable(
  "storage_entry",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    r2Key: text("r2_key"),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
    downloadCount: integer("download_count").notNull().default(0),
    lastDownloadAt: timestamp("last_download_at", { mode: "date" }),
    expiresAt: timestamp("expires_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("storage_entry_user_parent_idx").on(t.userId, t.parentId),
    index("storage_entry_user_kind_idx").on(t.userId, t.kind),
  ],
);

export const userPlan = pgTable("user_plan", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  planSlug: text("plan_slug").notNull().default("free"),
  planStatus: text("plan_status").notNull().default("active"),
  renewsAt: timestamp("renews_at", { mode: "date" }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  uploadUsedTodayBytes: bigint("upload_used_today_bytes", { mode: "number" })
    .notNull()
    .default(0),
  uploadDayStartsAt: timestamp("upload_day_starts_at", { mode: "date" })
    .notNull()
    .defaultNow(),
  bandwidthUsedMonthBytes: bigint("bandwidth_used_month_bytes", { mode: "number" })
    .notNull()
    .default(0),
  bandwidthMonthStartsAt: timestamp("bandwidth_month_starts_at", { mode: "date" })
    .notNull()
    .defaultNow(),
  isFlagged: integer("is_flagged").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const storageShareLink = pgTable(
  "storage_share_link",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    entryId: text("entry_id").notNull(),
    passwordHash: text("password_hash"),
    expiresAt: timestamp("expires_at", { mode: "date" }),
    revokedAt: timestamp("revoked_at", { mode: "date" }),
    lastAccessAt: timestamp("last_access_at", { mode: "date" }),
    accessCount: integer("access_count").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("storage_share_link_user_entry_idx").on(t.userId, t.entryId),
    index("storage_share_link_token_idx").on(t.token),
  ],
);

export const userApiKey = pgTable(
  "user_api_key",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    lastUsedAt: timestamp("last_used_at", { mode: "date" }),
    revokedAt: timestamp("revoked_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("user_api_key_user_idx").on(t.userId)],
);

export const storageShareReport = pgTable(
  "storage_share_report",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull(),
    shareId: text("share_id"),
    entryId: text("entry_id"),
    issueType: text("issue_type").notNull(),
    reason: text("reason").notNull(),
    reporterIp: text("reporter_ip"),
    reporterUserAgent: text("reporter_user_agent"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("storage_share_report_token_idx").on(t.token),
    index("storage_share_report_share_idx").on(t.shareId),
    index("storage_share_report_created_idx").on(t.createdAt),
  ],
);

export const userPlanRelations = relations(userPlan, ({ one }) => ({
  user: one(user, {
    fields: [userPlan.userId],
    references: [user.id],
  }),
}));

export const storageEntryRelations = relations(storageEntry, ({ one }) => ({
  user: one(user, {
    fields: [storageEntry.userId],
    references: [user.id],
  }),
}));

export const storageShareLinkRelations = relations(storageShareLink, ({ one }) => ({
  user: one(user, {
    fields: [storageShareLink.userId],
    references: [user.id],
  }),
}));

export const userApiKeyRelations = relations(userApiKey, ({ one }) => ({
  user: one(user, {
    fields: [userApiKey.userId],
    references: [user.id],
  }),
}));

