-- API keys for programmatic access (Bearer token) to storage HTTP APIs.

CREATE TABLE IF NOT EXISTS "user_api_key" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "key_prefix" text NOT NULL,
  "key_hash" text NOT NULL UNIQUE,
  "last_used_at" timestamp,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_api_key_user_idx"
  ON "user_api_key" ("user_id");
