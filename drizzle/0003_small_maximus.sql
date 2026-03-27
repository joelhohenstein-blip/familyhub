CREATE TABLE "media_albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gallery_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_galleries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gallery_id" uuid NOT NULL,
	"album_id" uuid,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"duration" integer,
	"thumbnail_url" text,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_watch_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"last_position" integer DEFAULT 0 NOT NULL,
	"last_watched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_watch_history_media_item_user_id_idx" UNIQUE("media_item_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "media_albums" ADD CONSTRAINT "media_albums_gallery_id_media_galleries_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."media_galleries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_albums" ADD CONSTRAINT "media_albums_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_galleries" ADD CONSTRAINT "media_galleries_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_gallery_id_media_galleries_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."media_galleries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_album_id_media_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."media_albums"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_watch_history" ADD CONSTRAINT "media_watch_history_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_albums_gallery_id_idx" ON "media_albums" USING btree ("gallery_id");--> statement-breakpoint
CREATE INDEX "media_albums_family_id_idx" ON "media_albums" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "media_galleries_family_id_idx" ON "media_galleries" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "media_galleries_owner_id_idx" ON "media_galleries" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "media_items_gallery_id_idx" ON "media_items" USING btree ("gallery_id");--> statement-breakpoint
CREATE INDEX "media_items_album_id_idx" ON "media_items" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX "media_items_uploaded_by_idx" ON "media_items" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "media_watch_history_user_id_idx" ON "media_watch_history" USING btree ("user_id");