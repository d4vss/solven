ALTER TABLE "user_plan"
  ADD COLUMN IF NOT EXISTS "plan_status" text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "renews_at" timestamp;

CREATE TABLE IF NOT EXISTS "storage_share_link" (
  "id" text PRIMARY KEY,
  "token" text NOT NULL UNIQUE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "entry_id" text NOT NULL,
  "password_hash" text,
  "expires_at" timestamp,
  "revoked_at" timestamp,
  "last_access_at" timestamp,
  "access_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "storage_share_link_user_entry_idx"
  ON "storage_share_link" ("user_id", "entry_id");
CREATE INDEX IF NOT EXISTS "storage_share_link_token_idx"
  ON "storage_share_link" ("token");
