-- Create settings table
CREATE TABLE IF NOT EXISTS "settings" (
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

-- Create index on user_id for settings table
CREATE INDEX IF NOT EXISTS "settings_user_id_idx" on "settings" ("user_id");

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"channel_id" integer,
	"theme_mode" varchar(20) DEFAULT 'light',
	"notifications_enabled" boolean DEFAULT true,
	"email_notifications" boolean DEFAULT true,
	"push_notifications" boolean DEFAULT true,
	"private_messages_allowed" boolean DEFAULT true,
	"metadata" json DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

-- Create indexes on user_preferences table
CREATE INDEX IF NOT EXISTS "user_preferences_user_id_idx" on "user_preferences" ("user_id");
CREATE INDEX IF NOT EXISTS "user_preferences_channel_id_idx" on "user_preferences" ("channel_id");

-- Create api_keys table
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" json DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"last_used_at" timestamp,
	"last_rotated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

-- Create indexes on api_keys table
CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" on "api_keys" ("user_id");
CREATE INDEX IF NOT EXISTS "api_keys_key_hash_idx" on "api_keys" ("key_hash");

-- Create agent_permissions table
CREATE TABLE IF NOT EXISTS "agent_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" uuid NOT NULL,
	"permission_key" varchar(255) NOT NULL,
	"allowed" boolean DEFAULT true,
	"metadata" json DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_permissions_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE cascade
);

-- Create indexes on agent_permissions table
CREATE INDEX IF NOT EXISTS "agent_permissions_agent_id_idx" on "agent_permissions" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_permissions_permission_key_idx" on "agent_permissions" ("permission_key");
