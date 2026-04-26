CREATE TABLE IF NOT EXISTS "storage_share_report" (
  "id" text PRIMARY KEY NOT NULL,
  "token" text NOT NULL,
  "share_id" text,
  "entry_id" text,
  "issue_type" text NOT NULL,
  "reason" text NOT NULL,
  "reporter_ip" text,
  "reporter_user_agent" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "storage_share_report_token_idx"
  ON "storage_share_report" ("token");

CREATE INDEX IF NOT EXISTS "storage_share_report_share_idx"
  ON "storage_share_report" ("share_id");

CREATE INDEX IF NOT EXISTS "storage_share_report_created_idx"
  ON "storage_share_report" ("created_at");
