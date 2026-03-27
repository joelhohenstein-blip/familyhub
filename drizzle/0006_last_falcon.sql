CREATE TYPE "public"."event_category" AS ENUM('activity', 'meal', 'game', 'movie', 'outing', 'celebration', 'other');--> statement-breakpoint
CREATE TYPE "public"."event_suggestion_status" AS ENUM('pending', 'confirmed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."calendar_provider" AS ENUM('google', 'outlook');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('synced', 'failed', 'pending');--> statement-breakpoint
CREATE TABLE "family_digests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digest_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"cadence" varchar(20) DEFAULT 'weekly' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"content_filters" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digest_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"digest_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"share_token" varchar(255) NOT NULL,
	"expires_at" timestamp,
	"guest_email" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "digest_shares_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "event_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"suggested_time" timestamp NOT NULL,
	"location" varchar(255),
	"category" "event_category" DEFAULT 'other',
	"rationale" text,
	"status" "event_suggestion_status" DEFAULT 'pending',
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calendar_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"provider" "calendar_provider" NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"status" "sync_status" DEFAULT 'pending',
	"last_synced_at" timestamp DEFAULT now(),
	"error" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calendar_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"provider" "calendar_provider_integration" NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "calendar_integrations_family_id_provider_unique" UNIQUE("family_id","provider")
);
--> statement-breakpoint
ALTER TABLE "family_digests" ADD CONSTRAINT "family_digests_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_subscriptions" ADD CONSTRAINT "digest_subscriptions_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_subscriptions" ADD CONSTRAINT "digest_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_shares" ADD CONSTRAINT "digest_shares_digest_id_family_digests_id_fk" FOREIGN KEY ("digest_id") REFERENCES "public"."family_digests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_shares" ADD CONSTRAINT "digest_shares_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "family_digests_family_id_idx" ON "family_digests" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "family_digests_date_range_idx" ON "family_digests" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "family_digests_created_at_idx" ON "family_digests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "digest_subscriptions_family_id_idx" ON "digest_subscriptions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "digest_subscriptions_user_id_idx" ON "digest_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "digest_subscriptions_family_user_idx" ON "digest_subscriptions" USING btree ("family_id","user_id");--> statement-breakpoint
CREATE INDEX "digest_shares_share_token_idx" ON "digest_shares" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "digest_shares_digest_id_idx" ON "digest_shares" USING btree ("digest_id");--> statement-breakpoint
CREATE INDEX "digest_shares_creator_id_idx" ON "digest_shares" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "event_suggestions_family_id_idx" ON "event_suggestions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "event_suggestions_status_idx" ON "event_suggestions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "calendar_sync_logs_family_id_idx" ON "calendar_sync_logs" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "calendar_sync_logs_provider_idx" ON "calendar_sync_logs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "calendar_integrations_family_id_idx" ON "calendar_integrations" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "calendar_integrations_provider_idx" ON "calendar_integrations" USING btree ("provider");