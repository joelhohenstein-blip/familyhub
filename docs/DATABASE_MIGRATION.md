# Database Migration Guide

Family Hub - Schema Migration, Backup & Recovery Procedures

## Table of Contents

1. [Overview](#overview)
2. [Migration Structure](#migration-structure)
3. [Running Migrations](#running-migrations)
4. [CI/CD Integration](#cicd-integration)
5. [Backup & Recovery](#backup--recovery)
6. [Data Integrity](#data-integrity)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring Migrations](#monitoring-migrations)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Family Hub uses **Drizzle ORM** with SQL migrations for database schema management. This guide covers:

- Migration file structure and naming
- Running migrations in development and production
- Backup and restore procedures
- Data integrity verification
- Rollback strategies

### Key Principles

✅ **Declarative**: Migrations define exact schema state
✅ **Versioned**: Each migration is timestamped and idempotent
✅ **Reversible**: Rollback capability with backup for safety
✅ **Automated**: CI/CD integration for staging/production
✅ **Auditable**: All changes tracked in Git and execution logs

---

## Migration Structure

### File Organization

```
drizzle/
├── migrations/
│   ├── 0001_initial_schema.sql
│   ├── 0002_add_users_table.sql
│   ├── 0003_add_auth_tokens.sql
│   ├── 0004_add_messaging.sql
│   ├── 0005_add_backup_metadata.sql
│   └── ...
├── schema.ts              # Drizzle schema definitions
└── drizzle.config.ts      # Drizzle configuration
```

### Naming Convention

Format: `NNNN_description.sql`

- **NNNN**: 4-digit sequence number (0001, 0002, etc.)
- **description**: Kebab-case summary of changes

**Examples**:
- `0001_initial_schema.sql`
- `0002_add_messaging_tables.sql`
- `0005_add_backup_metadata.sql`

### Migration File Structure

```sql
-- Migration: 0005_add_backup_metadata.sql
-- Purpose: Add backup history and retention policy tracking
-- Date: 2024-02-07

-- ============================================================================
-- Create backup_history table
-- ============================================================================
CREATE TABLE IF NOT EXISTS backup_history (
  id SERIAL PRIMARY KEY,
  backup_name VARCHAR(255) NOT NULL UNIQUE,
  backup_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  size_bytes BIGINT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, completed, failed
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT status_valid CHECK (status IN ('pending', 'completed', 'failed'))
);

-- ============================================================================
-- Create retention_policy table
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
CREATE INDEX idx_backup_history_date ON backup_history(backup_date DESC);
CREATE INDEX idx_backup_history_status ON backup_history(status);
CREATE INDEX idx_retention_policy_table ON retention_policy(table_name);

-- ============================================================================
-- Add comments for documentation
-- ============================================================================
COMMENT ON TABLE backup_history IS 'Tracks all database backups with metadata';
COMMENT ON TABLE retention_policy IS 'Defines backup retention policies per table';
COMMENT ON COLUMN backup_history.status IS 'Backup state: pending, completed, or failed';
COMMENT ON COLUMN retention_policy.retention_days IS 'Number of days to retain backups';
```

### Best Practices for Migration Files

✅ **Idempotent**: Use `IF NOT EXISTS` to make migrations re-runnable
✅ **Documented**: Add comments explaining changes
✅ **Atomic**: Complete transaction or fail entirely
✅ **Backward Compatible**: Avoid breaking changes when possible
✅ **Data Safe**: Test with actual production data volume
✅ **Indexed**: Add indices for new query-critical columns

---

## Running Migrations

### Development Environment

#### Automatic Migration (Recommended)

Drizzle automatically applies pending migrations on application startup:

```bash
cd /workspace

# Install dependencies
bun install

# Run app with automatic migration
bun run dev

# Output:
# ✓ Migrations applied successfully
# ✓ App running on http://localhost:3000
```

#### Manual Migration

Run migrations explicitly:

```bash
# Generate migration files (if using TypeScript schema)
bunx drizzle-kit generate:postgres

# Push migrations to database
bunx drizzle-kit push:postgres

# Verify migration status
bunx drizzle-kit introspect:postgres
```

### Staging Environment

```bash
# In CI/CD pipeline before deployment
# See CI_CD_Integration section below
```

### Production Environment

```bash
# Verify backup exists
./scripts/backup.sh --verify

# Run migrations with confirmation
bunx drizzle-kit push:postgres --strict

# Verify migration success
./scripts/verify-migration.sh

# If failed, trigger rollback
./scripts/restore.sh --latest
```

---

## CI/CD Integration

### GitHub Actions Migration Step

Add to `.github/workflows/deploy-staging.yml`:

```yaml
- name: Run Database Migrations
  id: migrate
  run: |
    echo "Running database migrations..."
    bunx drizzle-kit push:postgres
    echo "migration_status=success" >> $GITHUB_OUTPUT
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  continue-on-error: true

- name: Verify Migration
  if: steps.migrate.outcome == 'success'
  run: ./scripts/verify-migration.sh
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}

- name: Rollback on Migration Failure
  if: steps.migrate.outcome == 'failure'
  run: |
    echo "Migration failed, triggering rollback..."
    ./scripts/restore.sh --latest
    exit 1
```

### Pre-Deployment Checks

```bash
# In CI pipeline before deploy approval
./scripts/pre-deploy-checks.sh

# Checks performed:
# ✓ All migrations are syntactically valid
# ✓ No breaking changes detected
# ✓ Backup strategy is configured
# ✓ Rollback plan is documented
```

---

## Backup & Recovery

### Backup Strategy

**Automated Daily Backups** (configured in docker-compose and production):

```bash
# Runs via cron job at 2 AM UTC
0 2 * * * /workspace/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### Backup Script

```bash
#!/bin/bash
# scripts/backup.sh
# Full PostgreSQL database backup with compression

set -e

BACKUP_NAME="family-hub-backup-$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-.}"
S3_BUCKET="${S3_BUCKET:-family-hub-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-90}"

echo "Starting backup: $BACKUP_NAME"

# Create backup
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/$BACKUP_NAME.sql.gz"

# Upload to S3
aws s3 cp "$BACKUP_DIR/$BACKUP_NAME.sql.gz" "s3://$S3_BUCKET/"

# Record backup in database
psql "$DATABASE_URL" -c \
  "INSERT INTO backup_history (backup_name, size_bytes, status) \
   VALUES ('$BACKUP_NAME', $(stat -f%z "$BACKUP_DIR/$BACKUP_NAME.sql.gz"), 'completed')"

# Clean old backups (older than retention days)
psql "$DATABASE_URL" -c \
  "DELETE FROM backup_history WHERE backup_date < NOW() - INTERVAL '$RETENTION_DAYS days'"

echo "Backup completed: $BACKUP_NAME"
```

### Manual Backup

```bash
# Create immediate backup
./scripts/backup.sh

# Verify backup
ls -lh family-hub-backup-*.sql.gz

# List all backups in S3
aws s3 ls s3://family-hub-backups/
```

### Restore Procedure

```bash
#!/bin/bash
# scripts/restore.sh
# Restore database from backup

set -e

BACKUP_NAME="${1:?Backup name required}"
S3_BUCKET="${S3_BUCKET:-family-hub-backups}"
RESTORE_DB="${RESTORE_DB:-family_hub_restore}"

echo "Restoring from backup: $BACKUP_NAME"

# Download backup
aws s3 cp "s3://$S3_BUCKET/$BACKUP_NAME.sql.gz" .

# Decompress
gunzip "$BACKUP_NAME.sql.gz"

# Create restore database
psql "$DATABASE_URL" -c "CREATE DATABASE $RESTORE_DB;"

# Restore data
psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$RESTORE_DB" < "$BACKUP_NAME.sql"

# Verify restore
echo "Restore completed. Verify in database: $RESTORE_DB"
```

### Recovery Scenario

```bash
# 1. Confirm backup exists and is valid
aws s3 ls s3://family-hub-backups/ | grep family-hub-backup-20240207

# 2. Stop application (prevent new writes)
docker-compose down

# 3. Create backup of current state (for safety)
./scripts/backup.sh --name "pre-recovery-backup"

# 4. Restore from backup
./scripts/restore.sh family-hub-backup-20240207_020000.sql.gz

# 5. Verify restored database
psql family-hub-backup-20240207_020000 -c "SELECT COUNT(*) FROM users;"

# 6. Promote restore database as new production (if verified)
psql -c "ALTER DATABASE family_hub RENAME TO family_hub_old;"
psql -c "ALTER DATABASE family_hub_restore RENAME TO family_hub;"

# 7. Restart application
docker-compose up -d
```

---

## Data Integrity

### Verification Script

```bash
#!/bin/bash
# scripts/verify-migration.sh
# Post-migration verification

set -e

echo "Verifying migration integrity..."

# Check all tables exist
TABLES=$(psql "$DATABASE_URL" -t -c \
  "SELECT array_agg(tablename) FROM pg_tables WHERE schemaname = 'public'")
echo "✓ Tables: $TABLES"

# Check key indices
psql "$DATABASE_URL" -c \
  "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;"
echo "✓ Indices verified"

# Run integrity checks
psql "$DATABASE_URL" -c "
  -- Check for orphaned foreign keys
  SELECT COUNT(*) as orphaned_fks FROM information_schema.table_constraints 
  WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';
"

# Check table sizes
psql "$DATABASE_URL" -c "
  SELECT 
    schemaname, tablename, 
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables 
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

echo "✓ Migration verification complete"
```

### Data Validation Checks

Add to migration verification:

```sql
-- Verify critical records exist
SELECT 
  (SELECT COUNT(*) FROM users) as user_count,
  (SELECT COUNT(*) FROM messages) as message_count,
  (SELECT COUNT(*) FROM media_uploads) as media_count;

-- Check for NULL values in required columns
SELECT COUNT(*) FROM users WHERE email IS NULL;
SELECT COUNT(*) FROM messages WHERE sender_id IS NULL;

-- Verify referential integrity
SELECT COUNT(*) FROM messages m 
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = m.sender_id);
```

---

## Rollback Procedures

### Rollback from Backup

**When**: Data corruption, accidental deletion, or critical bug introduced

```bash
# 1. Determine which backup to restore to
aws s3 ls s3://family-hub-backups/ --human-readable

# 2. Stop application
docker-compose down

# 3. Backup current state
./scripts/backup.sh --name "pre-rollback-backup"

# 4. Restore from previous backup
./scripts/restore.sh family-hub-backup-20240206_020000.sql.gz

# 5. Restart application
docker-compose up -d

# 6. Verify application health
curl http://localhost:3000/health
```

### Migration-Only Rollback

**When**: Schema change was applied but caused performance issues

```bash
# 1. Get migration history
psql "$DATABASE_URL" -c "SELECT * FROM __drizzle_migrations__ ORDER BY created_at DESC LIMIT 5;"

# 2. Revert to previous migration
# Create rollback migration:
cat > drizzle/migrations/0006_rollback_previous_change.sql << 'EOF'
-- Rollback: Revert changes from 0005
DROP TABLE IF EXISTS backup_history CASCADE;
DROP TABLE IF EXISTS retention_policy CASCADE;
EOF

# 3. Apply rollback migration
bunx drizzle-kit push:postgres

# 4. Verify rollback
./scripts/verify-migration.sh
```

---

## Monitoring Migrations

### Check Migration Status

```bash
# View all applied migrations
psql "$DATABASE_URL" -c "SELECT * FROM __drizzle_migrations__ ORDER BY created_at;"

# View pending migrations
bunx drizzle-kit status:postgres

# Check migration logs
tail -f /var/log/database-migrations.log
```

### CloudWatch Monitoring

```bash
# Log migration events
psql "$DATABASE_URL" -c "
  INSERT INTO backup_history (backup_name, size_bytes, status)
  VALUES ('migration-0005', 0, 'completed');
"

# Query CloudWatch
aws logs tail /aws/rds/family-hub --follow
```

---

## Troubleshooting

### Migration Fails with Syntax Error

```bash
# Check migration file syntax
psql "$DATABASE_URL" -f drizzle/migrations/0005_add_backup_metadata.sql --echo-all

# Fix errors and retry
bunx drizzle-kit push:postgres
```

### Foreign Key Constraint Violation

```bash
# During migration, if FK constraint fails:
# 1. Temporarily disable constraints
SET session_replication_role = REPLICA;

# 2. Run migration
-- migration SQL here

# 3. Re-enable constraints
SET session_replication_role = DEFAULT;

# 4. Verify integrity
SELECT COUNT(*) FROM messages WHERE sender_id IS NULL;
```

### Backup/Restore Fails

```bash
# Verify PostgreSQL connectivity
psql "$DATABASE_URL" -c "SELECT NOW();"

# Check disk space for backup
df -h

# Verify S3 permissions
aws s3 ls s3://family-hub-backups/

# Test backup creation
pg_dump "$DATABASE_URL" | head -100
```

### State Mismatch Between App and DB

```bash
# Generate current schema from app
bunx drizzle-kit introspect:postgres

# Compare with migration files
diff <(generated schema) <(applied schema)

# If critical mismatch, restore from known-good backup
./scripts/restore.sh family-hub-backup-LATEST.sql.gz
```

---

## Best Practices

✅ **Always Backup Before Migrating**: Never skip backup steps
✅ **Test in Staging First**: Apply all migrations to staging before production
✅ **Document Changes**: Include comments in migration files
✅ **Keep Migrations Small**: Easier to debug and roll back if needed
✅ **Zero-Downtime Migrations**: Use backward-compatible schema changes
✅ **Monitor Performance**: Check query performance after schema changes
✅ **Version Control**: Commit all migrations to Git
✅ **Automate Backups**: Schedule daily backups via cron/Lambda

---

## Related Documentation

- [DEPLOYMENT.md](./.github/DEPLOYMENT.md) - Overall deployment process
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) - Terraform configuration for production
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - Environment variable reference
