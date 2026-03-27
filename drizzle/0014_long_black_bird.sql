CREATE TYPE "public"."inquiry_form_status" AS ENUM('submitted', 'under_review', 'approved', 'rejected', 'completed');--> statement-breakpoint
CREATE TYPE "public"."donation_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "photo_digitization_customer_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"encrypted_email" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"accessed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "photo_digitization_private_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"folder_name" text NOT NULL,
	"description" text,
	"created_by" uuid NOT NULL,
	"is_locked" boolean DEFAULT false,
	"locked_until" timestamp,
	"locked_reason" text,
	"content_count" text DEFAULT '0' NOT NULL,
	"last_accessed_at" timestamp,
	"last_modified_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "photo_digitization_private_folders_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "photo_digitization_folder_access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder_id" uuid NOT NULL,
	"accessed_by" uuid NOT NULL,
	"access_type" text NOT NULL,
	"item_id" uuid,
	"item_name" text,
	"description" text,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_digitization_project_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_by" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"message_count" text DEFAULT '0' NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_digitization_project_thread_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"read_at" timestamp,
	"is_edited" boolean DEFAULT false,
	"edited_at" timestamp,
	"edited_by" uuid,
	"attachment_urls" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiry_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"media_type" text NOT NULL,
	"quantity" integer NOT NULL,
	"customer_email" text NOT NULL,
	"notes" text,
	"status" "inquiry_form_status" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_secure_folder_access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"success" boolean DEFAULT true,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_secure_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"encrypted_data" text NOT NULL,
	"encryption_key_hash" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"fees_amount" integer DEFAULT 0 NOT NULL,
	"net_amount" integer DEFAULT 0 NOT NULL,
	"tier_label" varchar(255) NOT NULL,
	"stripe_session_id" varchar(255),
	"stripe_payment_intent_id" varchar(255),
	"status" "donation_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(50) DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "photo_digitization_internal_notes" ADD COLUMN "is_linked_to_email" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "photo_digitization_customer_emails" ADD CONSTRAINT "photo_digitization_customer_emails_order_id_photo_digitization_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."photo_digitization_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_digitization_private_folders" ADD CONSTRAINT "photo_digitization_private_folders_order_id_photo_digitization_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."photo_digitization_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_digitization_private_folders" ADD CONSTRAINT "photo_digitization_private_folders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_digitization_private_folders" ADD CONSTRAINT "photo_digitization_private_folders_last_modified_by_users_id_fk" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_digitization_folder_access_logs" ADD CONSTRAINT "photo_digitization_folder_access_logs_folder_id_photo_digitization_private_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."photo_digitization_private_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_digitization_folder_access_logs" ADD CONSTRAINT "photo_digitization_folder_access_logs_accessed_by_users_id_fk" FOREIGN KEY ("accessed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_digitization_project_threads" ADD CONSTRAINT "photo_digitization_project_threads_order_id_photo_digitization_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."photo_digitization_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_digitization_project_threads" ADD CONSTRAINT "photo_digitization_project_threads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_digitization_project_thread_messages" ADD CONSTRAINT "photo_digitization_project_thread_messages_thread_id_photo_digitization_project_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."photo_digitization_project_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_digitization_project_thread_messages" ADD CONSTRAINT "photo_digitization_project_thread_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_digitization_project_thread_messages" ADD CONSTRAINT "photo_digitization_project_thread_messages_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_forms" ADD CONSTRAINT "inquiry_forms_order_id_photo_digitization_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."photo_digitization_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "photo_digitization_customer_emails_order_id_idx" ON "photo_digitization_customer_emails" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "photo_digitization_customer_emails_created_by_idx" ON "photo_digitization_customer_emails" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "photo_digitization_private_folders_order_id_idx" ON "photo_digitization_private_folders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "photo_digitization_private_folders_created_by_idx" ON "photo_digitization_private_folders" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "photo_digitization_private_folders_is_locked_idx" ON "photo_digitization_private_folders" USING btree ("is_locked");--> statement-breakpoint
CREATE INDEX "photo_digitization_private_folders_last_accessed_at_idx" ON "photo_digitization_private_folders" USING btree ("last_accessed_at");--> statement-breakpoint
CREATE INDEX "photo_digitization_folder_access_logs_folder_id_idx" ON "photo_digitization_folder_access_logs" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "photo_digitization_folder_access_logs_accessed_by_idx" ON "photo_digitization_folder_access_logs" USING btree ("accessed_by");--> statement-breakpoint
CREATE INDEX "photo_digitization_folder_access_logs_timestamp_idx" ON "photo_digitization_folder_access_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "photo_digitization_folder_access_logs_access_type_idx" ON "photo_digitization_folder_access_logs" USING btree ("access_type");--> statement-breakpoint
CREATE INDEX "photo_digitization_project_threads_order_id_idx" ON "photo_digitization_project_threads" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "photo_digitization_project_threads_created_by_idx" ON "photo_digitization_project_threads" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "photo_digitization_project_threads_status_idx" ON "photo_digitization_project_threads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "photo_digitization_project_threads_last_message_at_idx" ON "photo_digitization_project_threads" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "photo_digitization_project_thread_messages_thread_id_idx" ON "photo_digitization_project_thread_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "photo_digitization_project_thread_messages_sender_id_idx" ON "photo_digitization_project_thread_messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "photo_digitization_project_thread_messages_created_at_idx" ON "photo_digitization_project_thread_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "photo_digitization_project_thread_messages_status_idx" ON "photo_digitization_project_thread_messages" USING btree ("status");