-- Database initialization script for Family Hub
-- This script runs when the PostgreSQL container first starts
-- It sets up the database schema and initial data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create initial tables and schema
-- (Drizzle will manage the full schema, this is just initialization)

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Create function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'Database initialization completed at %', CURRENT_TIMESTAMP;
END
$$;
