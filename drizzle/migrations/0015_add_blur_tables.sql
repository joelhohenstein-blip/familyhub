-- Create enum for face detection status
CREATE TYPE "public"."face_detection_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'skipped');

-- Create media_face_blur_settings table
CREATE TABLE IF NOT EXISTS "public"."media_face_blur_settings" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"media_item_id" uuid NOT NULL,
	"uploader_id" uuid NOT NULL,
	"face_detection_status" "public"."face_detection_status" NOT NULL DEFAULT 'pending',
	"detected_face_count" integer NOT NULL DEFAULT 0,
	"blur_intensity" integer NOT NULL DEFAULT 50,
	"is_auto_blurred" boolean NOT NULL DEFAULT false,
	"force_blur_by_admin" boolean NOT NULL DEFAULT false,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create unique constraint on media_item_id
ALTER TABLE "public"."media_face_blur_settings" ADD CONSTRAINT "media_face_blur_settings_media_item_id_unique" UNIQUE("media_item_id");

-- Create indexes for media_face_blur_settings
CREATE INDEX "media_face_blur_settings_media_item_id_idx" ON "public"."media_face_blur_settings" ("media_item_id");
CREATE INDEX "media_face_blur_settings_uploader_id_idx" ON "public"."media_face_blur_settings" ("uploader_id");
CREATE INDEX "media_face_blur_settings_detection_status_idx" ON "public"."media_face_blur_settings" ("face_detection_status");

-- Create user_clearance_levels table
CREATE TABLE IF NOT EXISTS "public"."user_clearance_levels" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"family_id" uuid NOT NULL,
	"level_name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now()
);

-- Create unique index on family_id and level_name
CREATE UNIQUE INDEX "user_clearance_levels_family_id_level_name_idx" ON "public"."user_clearance_levels" ("family_id", "level_name");

-- Create indexes for user_clearance_levels
CREATE INDEX "user_clearance_levels_family_id_idx" ON "public"."user_clearance_levels" ("family_id");
CREATE INDEX "user_clearance_levels_level_name_idx" ON "public"."user_clearance_levels" ("level_name");

-- Create user_face_blur_preferences table
CREATE TABLE IF NOT EXISTS "public"."user_face_blur_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"blur_all_faces" boolean NOT NULL DEFAULT false,
	"blur_intensity" integer NOT NULL DEFAULT 50,
	"blur_specific_people" json NOT NULL DEFAULT '[]'::json,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create unique constraint on user_id and family_id
ALTER TABLE "public"."user_face_blur_preferences" ADD CONSTRAINT "user_face_blur_preferences_user_family_unique" UNIQUE("user_id", "family_id");

-- Create indexes for user_face_blur_preferences
CREATE INDEX "user_face_blur_preferences_user_id_idx" ON "public"."user_face_blur_preferences" ("user_id");
CREATE INDEX "user_face_blur_preferences_family_id_idx" ON "public"."user_face_blur_preferences" ("family_id");
