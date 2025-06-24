ALTER TABLE "folders" ALTER COLUMN "file_keys" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "folders" ALTER COLUMN "file_keys" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "folders" ALTER COLUMN "file_keys" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "folders" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "folders" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "folders" ADD COLUMN "parent_folder_id" text;