ALTER TABLE "folders" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "folders" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "folders" ALTER COLUMN "file_keys" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "folders" ALTER COLUMN "file_keys" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "folders" ALTER COLUMN "file_keys" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "folders" DROP COLUMN "parent_folder_id";