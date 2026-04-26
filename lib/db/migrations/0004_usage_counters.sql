ALTER TABLE "user_plan"
  ADD COLUMN IF NOT EXISTS "upload_used_today_bytes" bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "upload_day_starts_at" timestamp NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "bandwidth_used_month_bytes" bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bandwidth_month_starts_at" timestamp NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "is_flagged" integer NOT NULL DEFAULT 0;
