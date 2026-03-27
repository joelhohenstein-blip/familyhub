CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"initiator_id" uuid NOT NULL,
	"room_name" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	CONSTRAINT "calls_room_name_unique" UNIQUE("room_name")
);
--> statement-breakpoint
CREATE TABLE "call_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"audio_enabled" boolean DEFAULT true NOT NULL,
	"video_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parental_locks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"source_id" uuid,
	"min_age_rating" integer DEFAULT 0 NOT NULL,
	"is_global_lock" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaming_playback_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"current_time" numeric(10, 2) DEFAULT '0',
	"duration" numeric(10, 2) DEFAULT '0',
	"last_played_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaming_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"embed_code" text,
	"type" text NOT NULL,
	"genre" text,
	"age_rating" integer DEFAULT 0,
	"thumbnail" text,
	"description" text,
	"position" integer DEFAULT 0,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_location" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"location_name" text,
	"is_default" integer DEFAULT 1,
	"locale" text DEFAULT 'en',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_location_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "weather_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"location_name" text,
	"current_temp" real,
	"humidity" integer,
	"description" text,
	"feels_like" real,
	"wind_speed" real,
	"weather_data" text,
	"cached_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" uuid NOT NULL,
	"permission_key" varchar(255) NOT NULL,
	"allowed" boolean DEFAULT true NOT NULL,
	"metadata" json DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" json DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"last_rotated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"model" varchar(255) DEFAULT 'default',
	"video_call_quality" varchar(50) DEFAULT 'high',
	"audio_enabled" boolean DEFAULT true,
	"video_enabled" boolean DEFAULT true,
	"jitsi_server_url" text DEFAULT 'https://meet.jitsi.example.com',
	"weather_cache_duration" integer DEFAULT 600,
	"language" varchar(10) DEFAULT 'en',
	"location_detection_enabled" boolean DEFAULT true,
	"media_upload_size_limit" integer DEFAULT 52428800,
	"media_retention_days" integer DEFAULT 365,
	"streaming_sources_enabled" json DEFAULT '{"pluto":true,"tubi":true,"roku":true,"freeview":true}',
	"parental_control_enabled" boolean DEFAULT false,
	"parental_control_pin" varchar(255),
	"content_filter_age" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"channel_id" integer,
	"theme_mode" varchar(20) DEFAULT 'light',
	"notifications_enabled" boolean DEFAULT true,
	"email_notifications" boolean DEFAULT true,
	"push_notifications" boolean DEFAULT true,
	"private_messages_allowed" boolean DEFAULT true,
	"metadata" json DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_type" text NOT NULL,
	"actor_id" varchar(128) NOT NULL,
	"target_id" varchar(128),
	"target_type" text,
	"description" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_moderation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" text NOT NULL,
	"user_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"ai_analysis_results" text,
	"violation_score" real DEFAULT 0,
	"media_hash" text,
	"media_format" text,
	"moderation_notes" text,
	"moderator_id" varchar(128),
	"content_flags" jsonb,
	"moderation_timestamp" timestamp,
	"reviewed_at" timestamp,
	"reviewed_by" text,
	"review_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setting_key" varchar(255) NOT NULL,
	"websocket_enabled" boolean DEFAULT true,
	"websocket_health_status" text DEFAULT 'healthy',
	"jitsi_enabled" boolean DEFAULT true,
	"jitsi_server_url" text,
	"weather_enabled" boolean DEFAULT true,
	"weather_data_source" text,
	"weather_locale_detection" boolean DEFAULT true,
	"i18n_enabled" boolean DEFAULT true,
	"i18n_default_locale" varchar(10) DEFAULT 'en-US',
	"i18n_browser_detection" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "integration_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"json_payload" jsonb,
	"service" text,
	"env" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "health_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"component_name" text NOT NULL,
	"status" text NOT NULL,
	"last_checked" timestamp DEFAULT now() NOT NULL,
	"error_message" text,
	"response_time_ms" integer,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant1_id" uuid NOT NULL,
	"participant2_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"read_at" timestamp,
	"reactions_count" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_reactions" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_reactions_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "pinned_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"pinned_by" uuid NOT NULL,
	"pinned_at" timestamp DEFAULT now() NOT NULL,
	"unpinned_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "archive_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"scheduled_by" uuid NOT NULL,
	"scheduled_for_time" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"cancelled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_presence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"status" text DEFAULT 'offline' NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "typing_indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_typing" text DEFAULT 'true' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_moderation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"obfuscation_detected" boolean DEFAULT false NOT NULL,
	"normalized_text" text,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" text,
	"review_reason" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_item_id" uuid NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_initiator_id_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parental_locks" ADD CONSTRAINT "parental_locks_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parental_locks" ADD CONSTRAINT "parental_locks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parental_locks" ADD CONSTRAINT "parental_locks_source_id_streaming_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."streaming_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parental_locks" ADD CONSTRAINT "parental_locks_family_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parental_locks" ADD CONSTRAINT "parental_locks_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parental_locks" ADD CONSTRAINT "parental_locks_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."streaming_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_playback_state" ADD CONSTRAINT "streaming_playback_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_playback_state" ADD CONSTRAINT "streaming_playback_state_source_id_streaming_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."streaming_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_playback_state" ADD CONSTRAINT "streaming_playback_state_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_playback_state" ADD CONSTRAINT "streaming_playback_state_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."streaming_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_sources" ADD CONSTRAINT "streaming_sources_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_sources" ADD CONSTRAINT "streaming_sources_family_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_location" ADD CONSTRAINT "user_location_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weather_cache" ADD CONSTRAINT "weather_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_permissions" ADD CONSTRAINT "agent_permissions_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant1_id_users_id_fk" FOREIGN KEY ("participant1_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant2_id_users_id_fk" FOREIGN KEY ("participant2_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_conversation_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."conversation_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_message_id_conversation_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."conversation_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_pinned_by_users_id_fk" FOREIGN KEY ("pinned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archive_schedules" ADD CONSTRAINT "archive_schedules_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archive_schedules" ADD CONSTRAINT "archive_schedules_scheduled_by_users_id_fk" FOREIGN KEY ("scheduled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_presence" ADD CONSTRAINT "user_presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_presence" ADD CONSTRAINT "user_presence_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_indicators" ADD CONSTRAINT "typing_indicators_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_indicators" ADD CONSTRAINT "typing_indicators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_tags" ADD CONSTRAINT "photo_tags_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parental_locks_family_id_idx" ON "parental_locks" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "parental_locks_user_id_idx" ON "parental_locks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "parental_locks_source_id_idx" ON "parental_locks" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "streaming_playback_state_user_id_idx" ON "streaming_playback_state" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "streaming_playback_state_source_id_idx" ON "streaming_playback_state" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "streaming_playback_state_user_source_idx" ON "streaming_playback_state" USING btree ("user_id","source_id");--> statement-breakpoint
CREATE INDEX "streaming_sources_family_id_idx" ON "streaming_sources" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "streaming_sources_position_idx" ON "streaming_sources" USING btree ("position");--> statement-breakpoint
CREATE INDEX "streaming_sources_type_idx" ON "streaming_sources" USING btree ("type");--> statement-breakpoint
CREATE INDEX "agent_permissions_agent_id_idx" ON "agent_permissions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_permissions_permission_key_idx" ON "agent_permissions" USING btree ("permission_key");--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "settings_user_id_idx" ON "settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_preferences_user_id_idx" ON "user_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_preferences_channel_id_idx" ON "user_preferences" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "error_logs_timestamp_idx" ON "error_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "error_logs_level_idx" ON "error_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "health_checks_component_idx" ON "health_checks" USING btree ("component_name");--> statement-breakpoint
CREATE INDEX "health_checks_last_checked_idx" ON "health_checks" USING btree ("last_checked");--> statement-breakpoint
CREATE INDEX "health_checks_status_idx" ON "health_checks" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_conversation" ON "conversations" USING btree (LEAST("participant1_id", "participant2_id"),GREATEST("participant1_id", "participant2_id"),"family_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_messages_conversation_id" ON "conversation_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_messages_sender_id" ON "conversation_messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_messages_created_at" ON "conversation_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_message_id" ON "message_reactions" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_user_id" ON "message_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_message_user" ON "message_reactions" USING btree ("message_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_pinned_messages_conversation_id" ON "pinned_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_pinned_messages_message_id" ON "pinned_messages" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_pinned_messages_pinned_by" ON "pinned_messages" USING btree ("pinned_by");--> statement-breakpoint
CREATE INDEX "idx_pinned_messages_pinned_at" ON "pinned_messages" USING btree ("pinned_at");--> statement-breakpoint
CREATE INDEX "idx_archive_schedules_conversation_id" ON "archive_schedules" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_archive_schedules_scheduled_by" ON "archive_schedules" USING btree ("scheduled_by");--> statement-breakpoint
CREATE INDEX "idx_archive_schedules_scheduled_for_time" ON "archive_schedules" USING btree ("scheduled_for_time");--> statement-breakpoint
CREATE INDEX "idx_archive_schedules_status" ON "archive_schedules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "presence_user_id_idx" ON "user_presence" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "presence_family_id_idx" ON "user_presence" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "presence_status_idx" ON "user_presence" USING btree ("status");--> statement-breakpoint
CREATE INDEX "typing_conversation_id_idx" ON "typing_indicators" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "typing_user_id_idx" ON "typing_indicators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "typing_expires_at_idx" ON "typing_indicators" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "photo_tags_media_item_id_idx" ON "photo_tags" USING btree ("media_item_id");--> statement-breakpoint
CREATE INDEX "photo_tags_tag_idx" ON "photo_tags" USING btree ("tag");