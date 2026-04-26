-- Run against your Postgres (e.g. psql $DATABASE_URL -f ...) or via Drizzle migrate.

CREATE TABLE IF NOT EXISTS "user_plan" (
  "user_id" text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  "plan_slug" text NOT NULL DEFAULT 'free',
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "storage_entry" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "parent_id" text,
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "r2_key" text,
  "size_bytes" bigint NOT NULL DEFAULT 0,
  "download_count" integer NOT NULL DEFAULT 0,
  "last_download_at" timestamp,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "storage_entry_user_parent_idx"
  ON "storage_entry" ("user_id", "parent_id");
CREATE INDEX IF NOT EXISTS "storage_entry_user_kind_idx"
  ON "storage_entry" ("user_id", "kind");
