CREATE TYPE "public"."notification_channel" AS ENUM('email', 'phone', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."photo_digitization_item_type" AS ENUM('loose_slides', 'carousel');--> statement-breakpoint
CREATE TYPE "public"."photo_digitization_order_status" AS ENUM('inquiry_submitted', 'quantity_verified', 'payment_pending', 'payment_confirmed', 'in_processing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "photo_digitization_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" text NOT NULL,
	"status" "photo_digitization_order_status" DEFAULT 'inquiry_submitted' NOT NULL,
	"item_type" "photo_digitization_item_type" NOT NULL,
	"quantity" integer NOT NULL,
	"estimated_price" numeric(10, 2),
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp,
	"customer_email" text NOT NULL,
	"customer_phone" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_digitization_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"previous_status" "photo_digitization_order_status",
	"new_status" "photo_digitization_order_status" NOT NULL,
	"changed_by" text NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_settings" ADD COLUMN "photo_digitization_notifications" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD COLUMN "photo_digitization_email_notifications" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD COLUMN "photo_digitization_preferred_channel" "notification_channel" DEFAULT 'email';