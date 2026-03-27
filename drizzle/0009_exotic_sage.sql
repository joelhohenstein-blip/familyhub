CREATE TYPE "public"."item_status" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."list_type" AS ENUM('tasks', 'shopping');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."share_access" AS ENUM('view', 'edit');--> statement-breakpoint
CREATE TYPE "public"."calendar_provider_integration" AS ENUM('google', 'outlook');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('attending', 'maybe', 'not_attending');--> statement-breakpoint
CREATE TYPE "public"."event_visibility" AS ENUM('public', 'family', 'private');--> statement-breakpoint
CREATE TYPE "public"."event_rsvp_status" AS ENUM('attending', 'maybe', 'not_attending');--> statement-breakpoint
CREATE TYPE "public"."event_visibility_audit_status" AS ENUM('public', 'family', 'private');--> statement-breakpoint
CREATE TABLE "list_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"shared_with" uuid NOT NULL,
	"access_level" "share_access" DEFAULT 'view' NOT NULL,
	"shared_by" uuid NOT NULL,
	"share_token" varchar(255),
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" "list_type" DEFAULT 'tasks' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todo_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"status" "item_status" DEFAULT 'pending' NOT NULL,
	"assigned_to" uuid,
	"due_date" timestamp,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"location" varchar(255),
	"visibility" "event_visibility" DEFAULT 'family',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "event_rsvp_status" NOT NULL,
	"rsvped_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_visibility_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"old_visibility" "event_visibility_audit_status",
	"new_visibility" "event_visibility_audit_status" NOT NULL,
	"reason" text,
	"changed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"message_notifications" boolean DEFAULT true,
	"message_email_notifications" boolean DEFAULT false,
	"calendar_reminders" boolean DEFAULT true,
	"calendar_email_reminders" boolean DEFAULT true,
	"media_notifications" boolean DEFAULT true,
	"media_email_notifications" boolean DEFAULT false,
	"mention_notifications" boolean DEFAULT true,
	"mention_email_notifications" boolean DEFAULT false,
	"daily_digest" boolean DEFAULT false,
	"weekly_digest" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "privacy_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"profile_visibility" text DEFAULT 'family',
	"allow_message_requests" boolean DEFAULT true,
	"allow_media_sharing" boolean DEFAULT true,
	"allow_location_sharing" boolean DEFAULT false,
	"allow_activity_status" boolean DEFAULT true,
	"two_factor_enabled" boolean DEFAULT false,
	"block_non_family_messages" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "list_shares" ADD CONSTRAINT "list_shares_list_id_task_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."task_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_shares" ADD CONSTRAINT "list_shares_shared_with_family_members_id_fk" FOREIGN KEY ("shared_with") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_shares" ADD CONSTRAINT "list_shares_shared_by_users_id_fk" FOREIGN KEY ("shared_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_lists" ADD CONSTRAINT "task_lists_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_lists" ADD CONSTRAINT "task_lists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_items" ADD CONSTRAINT "todo_items_list_id_task_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."task_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_items" ADD CONSTRAINT "todo_items_assigned_to_family_members_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."family_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_items" ADD CONSTRAINT "todo_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_events_family_id_idx" ON "calendar_events" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "calendar_events_created_by_idx" ON "calendar_events" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "calendar_events_start_time_idx" ON "calendar_events" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "calendar_events_visibility_idx" ON "calendar_events" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "event_rsvps_event_id_idx" ON "event_rsvps" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_rsvps_user_id_idx" ON "event_rsvps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_rsvps_event_user_idx" ON "event_rsvps" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "event_visibility_audit_event_id_idx" ON "event_visibility_audit" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_visibility_audit_user_id_idx" ON "event_visibility_audit" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_visibility_audit_changed_at_idx" ON "event_visibility_audit" USING btree ("changed_at");