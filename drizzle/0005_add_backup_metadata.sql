-- Migration: 0005_add_backup_metadata.sql
-- Purpose: Add backup history and retention policy tracking tables
-- Date: 2024-02-07

-- ============================================================================
-- Create backup_history table
-- Tracks all database backups with metadata for recovery and auditing
-- ============================================================================
CREATE TABLE IF NOT EXISTS backup_history (
  id SERIAL PRIMARY KEY,
  backup_name VARCHAR(255) NOT NULL UNIQUE,
  backup_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  size_bytes BIGINT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT status_valid CHECK (status IN ('pending', 'completed', 'failed'))
);

-- ============================================================================
-- Create retention_policy table
-- Defines backup retention policies per table
-- ============================================================================
CREATE TABLE IF NOT EXISTS retention_policy (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL UNIQUE,
  retention_days INTEGER NOT NULL DEFAULT 90,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT retention_days_valid CHECK (retention_days > 0)
);

-- ============================================================================
-- Create indices for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_backup_history_date 
  ON backup_history(backup_date DESC);

CREATE INDEX IF NOT EXISTS idx_backup_history_status 
  ON backup_history(status);

CREATE INDEX IF NOT EXISTS idx_backup_history_name 
  ON backup_history(backup_name);

CREATE INDEX IF NOT EXISTS idx_retention_policy_table 
  ON retention_policy(table_name);

-- ============================================================================
-- Add comments for documentation
-- ============================================================================
COMMENT ON TABLE backup_history IS 'Tracks all database backups with metadata for recovery and auditing purposes';

COMMENT ON TABLE retention_policy IS 'Defines backup retention policies per table for compliance and cost management';

COMMENT ON COLUMN backup_history.id IS 'Unique identifier for backup record';

COMMENT ON COLUMN backup_history.backup_name IS 'Unique name of the backup (timestamp-based format)';

COMMENT ON COLUMN backup_history.backup_date IS 'When the backup was created';

COMMENT ON COLUMN backup_history.size_bytes IS 'Size of the backup file in bytes';

COMMENT ON COLUMN backup_history.status IS 'Backup status: pending (in progress), completed (successful), or failed (error occurred)';

COMMENT ON COLUMN backup_history.error_message IS 'Error details if status is failed';

COMMENT ON COLUMN retention_policy.table_name IS 'Name of the table this policy applies to';

COMMENT ON COLUMN retention_policy.retention_days IS 'Number of days to retain backups for this table';

-- ============================================================================
-- Insert default retention policies
-- ============================================================================
INSERT INTO retention_policy (table_name, retention_days)
VALUES
  ('users', 90),
  ('messages', 30),
  ('media_uploads', 60),
  ('backup_history', 180)
ON CONFLICT (table_name) DO NOTHING;

-- ============================================================================
-- Create backup trigger for tracking updates
-- ============================================================================
CREATE OR REPLACE FUNCTION update_backup_history_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS backup_history_updated_at ON backup_history;
CREATE TRIGGER backup_history_updated_at
  BEFORE UPDATE ON backup_history
  FOR EACH ROW
  EXECUTE FUNCTION update_backup_history_timestamp();

DROP TRIGGER IF EXISTS retention_policy_updated_at ON retention_policy;
CREATE TRIGGER retention_policy_updated_at
  BEFORE UPDATE ON retention_policy
  FOR EACH ROW
  EXECUTE FUNCTION update_backup_history_timestamp();

-- ============================================================================
-- Verification queries (for testing migration)
-- ============================================================================
-- SELECT * FROM backup_history LIMIT 1;
-- SELECT * FROM retention_policy;
-- SELECT table_name, retention_days FROM retention_policy ORDER BY table_name;
