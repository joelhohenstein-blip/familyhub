-- Create task lists table
CREATE TABLE IF NOT EXISTS "task_lists" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"family_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" varchar NOT NULL DEFAULT 'tasks',
	"status" varchar(20) NOT NULL DEFAULT 'active',
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now(),
	FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE cascade,
	FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null
);

-- Create todo items table
CREATE TABLE IF NOT EXISTS "todo_items" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"list_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"priority" varchar NOT NULL DEFAULT 'medium',
	"status" varchar NOT NULL DEFAULT 'pending',
	"assigned_to" uuid,
	"due_date" timestamp,
	"created_by" uuid NOT NULL,
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now(),
	FOREIGN KEY ("list_id") REFERENCES "task_lists"("id") ON DELETE cascade,
	FOREIGN KEY ("assigned_to") REFERENCES "family_members"("id") ON DELETE set null,
	FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null
);

-- Create list shares table
CREATE TABLE IF NOT EXISTS "list_shares" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"list_id" uuid NOT NULL,
	"shared_with" uuid NOT NULL,
	"access_level" varchar NOT NULL DEFAULT 'view',
	"shared_by" uuid NOT NULL,
	"share_token" varchar(255),
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now(),
	FOREIGN KEY ("list_id") REFERENCES "task_lists"("id") ON DELETE cascade,
	FOREIGN KEY ("shared_with") REFERENCES "family_members"("id") ON DELETE cascade,
	FOREIGN KEY ("shared_by") REFERENCES "users"("id") ON DELETE set null
);

-- Create enums
DO $$ BEGIN
  CREATE TYPE "list_type" AS ENUM('tasks', 'shopping');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "priority" AS ENUM('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "item_status" AS ENUM('pending', 'in_progress', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "share_access" AS ENUM('view', 'edit');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
