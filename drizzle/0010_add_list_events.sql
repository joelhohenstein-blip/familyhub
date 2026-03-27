CREATE TABLE "list_event_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"linked_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "list_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"event_link_id" uuid,
	"title" varchar(255) NOT NULL,
	"content" text,
	"created_by" uuid NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "list_event_links" ADD CONSTRAINT "list_event_links_list_id_task_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "task_lists"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "list_event_links" ADD CONSTRAINT "list_event_links_linked_by_users_id_fk" FOREIGN KEY ("linked_by") REFERENCES "users"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "list_announcements" ADD CONSTRAINT "list_announcements_list_id_task_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "task_lists"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "list_announcements" ADD CONSTRAINT "list_announcements_event_link_id_list_event_links_id_fk" FOREIGN KEY ("event_link_id") REFERENCES "list_event_links"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "list_announcements" ADD CONSTRAINT "list_announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null;
