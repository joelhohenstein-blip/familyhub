CREATE TABLE "photo_digitization_internal_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"content" text NOT NULL,
	"attachment_urls" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_digitization_access_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internal_note_id" uuid NOT NULL,
	"accessed_by" text NOT NULL,
	"access_type" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "photo_digitization_internal_notes" ADD CONSTRAINT "photo_digitization_internal_notes_order_id_photo_digitization_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."photo_digitization_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_digitization_access_audit_log" ADD CONSTRAINT "photo_digitization_access_audit_log_internal_note_id_photo_digitization_internal_notes_id_fk" FOREIGN KEY ("internal_note_id") REFERENCES "public"."photo_digitization_internal_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "photo_digitization_internal_notes_order_id_idx" ON "photo_digitization_internal_notes" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "photo_digitization_internal_notes_created_by_idx" ON "photo_digitization_internal_notes" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "photo_digitization_access_audit_log_internal_note_id_idx" ON "photo_digitization_access_audit_log" USING btree ("internal_note_id");--> statement-breakpoint
CREATE INDEX "photo_digitization_access_audit_log_accessed_by_idx" ON "photo_digitization_access_audit_log" USING btree ("accessed_by");--> statement-breakpoint
CREATE INDEX "photo_digitization_access_audit_log_timestamp_idx" ON "photo_digitization_access_audit_log" USING btree ("timestamp");