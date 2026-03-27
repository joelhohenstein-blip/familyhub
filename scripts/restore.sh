#!/bin/bash
# Restore Script for Family Hub Database
# Restores database from backup with rollback on error
# Usage: ./restore.sh <backup_name> [--target-db custom_db]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Helper functions
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Parse arguments
BACKUP_NAME="${1:?Backup name required (e.g., family-hub-backup-20240207_020000)}"
RESTORE_DB="family_hub_restore"
S3_BUCKET="${S3_BUCKET:-family-hub-backups}"
TEMP_DIR="/tmp"

while [[ $# -gt 1 ]]; do
    case $2 in
        --target-db)
            RESTORE_DB="$3"
            shift 2
            ;;
        *)
            echo "Unknown option: $2"
            exit 1
            ;;
    esac
done

echo "========================================"
echo "Family Hub Database Restore"
echo "========================================"
echo "Backup Name: $BACKUP_NAME"
echo "Target Database: $RESTORE_DB"
echo "S3 Bucket: $S3_BUCKET"
echo ""

# Verify database connection
if ! psql "$DATABASE_URL" -c "SELECT NOW();" > /dev/null 2>&1; then
    log_error "Cannot connect to database"
    exit 1
fi
log_info "Database connection verified"

# Download backup from S3
echo ""
echo "Downloading backup from S3..."

BACKUP_FILE="$TEMP_DIR/$BACKUP_NAME.sql.gz"

if command -v aws &> /dev/null; then
    if aws s3 cp "s3://$S3_BUCKET/$BACKUP_NAME.sql.gz" "$BACKUP_FILE" > /dev/null 2>&1; then
        log_info "Backup downloaded"
    else
        log_error "Failed to download backup from S3"
        echo "  Tried: s3://$S3_BUCKET/$BACKUP_NAME.sql.gz"
        exit 1
    fi
else
    log_error "AWS CLI not found"
    exit 1
fi

# Decompress backup
echo ""
echo "Decompressing backup..."

SQL_FILE="$TEMP_DIR/$BACKUP_NAME.sql"
if gunzip -c "$BACKUP_FILE" > "$SQL_FILE" 2>/dev/null; then
    log_info "Backup decompressed"
    FILE_SIZE=$(stat -f%z "$SQL_FILE" 2>/dev/null || stat -c%s "$SQL_FILE" 2>/dev/null)
    echo "  Size: $FILE_SIZE bytes"
else
    log_error "Failed to decompress backup"
    exit 1
fi

# Create restore database
echo ""
echo "Creating restore database..."

DB_NAMES=$(psql "$DATABASE_URL" -t -c "SELECT datname FROM pg_database WHERE datname LIKE 'family_hub%';")

if echo "$DB_NAMES" | grep -q "$RESTORE_DB"; then
    log_warn "Database '$RESTORE_DB' already exists, will be replaced"
    psql "$DATABASE_URL" -c "DROP DATABASE IF EXISTS $RESTORE_DB;" > /dev/null 2>&1
fi

if psql "$DATABASE_URL" -c "CREATE DATABASE $RESTORE_DB;" > /dev/null 2>&1; then
    log_info "Database '$RESTORE_DB' created"
else
    log_error "Failed to create database"
    exit 1
fi

# Restore data
echo ""
echo "Restoring data (this may take several minutes)..."

# Parse connection info
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p' || echo "5432")

RESTORE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$RESTORE_DB"

if psql "$RESTORE_URL" < "$SQL_FILE" > /dev/null 2>&1; then
    log_info "Data restored successfully"
else
    log_error "Failed to restore data"
    echo "  Attempting to clean up..."
    psql "$DATABASE_URL" -c "DROP DATABASE IF EXISTS $RESTORE_DB;" > /dev/null 2>&1
    exit 1
fi

# Verify restored database
echo ""
echo "Verifying restored database..."

# Count tables
TABLE_COUNT=$(psql "$RESTORE_URL" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
log_info "Found $TABLE_COUNT tables"

# Count users
USER_COUNT=$(psql "$RESTORE_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
log_info "Found $USER_COUNT users"

# Cleanup
echo ""
echo "Cleaning up temporary files..."
rm -f "$BACKUP_FILE" "$SQL_FILE"
log_info "Temporary files cleaned"

echo ""
echo "========================================"
echo "Restore Summary"
echo "========================================"
echo "Original Database: $(basename $DATABASE_URL)"
echo "Restored to: $RESTORE_DB"
echo "Status: Ready for verification"
echo ""
echo "Next steps:"
echo "1. Verify data in restored database:"
echo "   psql $RESTORE_URL -c \"SELECT COUNT(*) FROM users;\""
echo ""
echo "2. To promote to production:"
echo "   psql $DATABASE_URL -c \"ALTER DATABASE $(basename $DATABASE_URL) RENAME TO $(basename $DATABASE_URL)_backup;\""
echo "   psql $DATABASE_URL -c \"ALTER DATABASE $RESTORE_DB RENAME TO $(basename $DATABASE_URL);\""
echo ""
echo "3. Restart application to use restored database"
echo "========================================"

log_info "Restore completed successfully"
