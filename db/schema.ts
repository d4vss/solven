import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

// USERS
export const users = pgTable("users", {
  id: text("id").primaryKey().notNull(),
  name: text("name").unique(),
  email: text("email").notNull(),
  onboardingDone: boolean("onboarding_done").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// FOLDERS
export const folders = pgTable("folders", {
  id: text("id").primaryKey().notNull().unique(),
  name: text("name").notNull(),
  ownerId: text("owner_id").references(() => users.id),
  fileKeys: text("file_keys").array().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// FILES
export const files = pgTable("files", {
  id: text("id").primaryKey().notNull(),
  filename: text("filename").notNull(),
  size: integer("size").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  downloadCount: integer("download_count").default(0).notNull(),
  ownerId: text("owner_id").references(() => users.id),
  folderId: text("folder_id").references(() => folders.id),
});
