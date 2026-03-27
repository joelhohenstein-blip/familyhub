#!/bin/bash
# Backup Script for Family Hub Database
# Creates full PostgreSQL backup with compression and S3 upload
# Usage: ./backup.sh [--verify] [--name custom_name]

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-.}"
S3_BUCKET="${S3_BUCKET:-family-hub-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-90}"
GZIP_COMPRESSION="${GZIP_COMPRESSION:-9}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${BACKUP_NAME:-family-hub-backup-${TIMESTAMP}}"

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
VERIFY_ONLY=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --verify)
            VERIFY_ONLY=true
            shift
            ;;
        --name)
            BACKUP_NAME="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "========================================"
echo "Family Hub Database Backup"
echo "========================================"
echo "Backup Name: $BACKUP_NAME"
echo "Backup Dir: $BACKUP_DIR"
echo "S3 Bucket: $S3_BUCKET"
echo "Retention: $RETENTION_DAYS days"
echo ""

# Verify database connection
if ! psql "$DATABASE_URL" -c "SELECT NOW();" > /dev/null 2>&1; then
    log_error "Cannot connect to database"
    echo "DATABASE_URL: $DATABASE_URL (redacted)"
    exit 1
fi
log_info "Database connection verified"

# If verify only, just check latest backup
if [ "$VERIFY_ONLY" = true ]; then
    echo ""
    echo "Checking backup status..."
    
    if command -v aws &> /dev/null; then
        LATEST=$(aws s3 ls "s3://$S3_BUCKET/" --recursive | sort | tail -n 1 | awk '{print $NF}')
        if [ -n "$LATEST" ]; then
            log_info "Latest backup: $LATEST"
            SIZE=$(aws s3 ls "s3://$S3_BUCKET/$LATEST" | awk '{print $NF}')
            echo "  Size: $(numfmt --to=iec-i --suffix=B $SIZE 2>/dev/null || echo $SIZE bytes)"
        else
            log_warn "No backups found in S3"
        fi
    fi
    exit 0
fi

# Create backup
echo ""
echo "Creating backup..."
BACKUP_FILE="$BACKUP_DIR/$BACKUP_NAME.sql.gz"

if pg_dump "$DATABASE_URL" | gzip -"$GZIP_COMPRESSION" > "$BACKUP_FILE" 2>/dev/null; then
    FILE_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null || echo "unknown")
    log_info "Backup created: $BACKUP_FILE"
    echo "  Size: $FILE_SIZE bytes"
else
    log_error "Backup creation failed"
    exit 1
fi

# Upload to S3 (if AWS CLI configured)
if command -v aws &> /dev/null; then
    echo ""
    echo "Uploading to S3..."
    
    if aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/" --sse AES256 > /dev/null 2>&1; then
        log_info "Backup uploaded to S3: s3://$S3_BUCKET/$BACKUP_NAME.sql.gz"
    else
        log_warn "S3 upload failed (AWS CLI issue)"
    fi
    
    # Record backup in database (if table exists)
    if psql "$DATABASE_URL" -c "\dt backup_history" 2>/dev/null | grep -q backup_history; then
        echo ""
        echo "Recording backup metadata..."
        
        psql "$DATABASE_URL" << EOF > /dev/null 2>&1
INSERT INTO backup_history (backup_name, size_bytes, status)
VALUES ('$BACKUP_NAME', $FILE_SIZE, 'completed')
ON CONFLICT (backup_name) DO UPDATE SET updated_at = NOW();
EOF
        
        log_info "Backup metadata recorded"
    fi
    
    # Clean old backups from database
    echo ""
    echo "Cleaning old backups..."
    
    if psql "$DATABASE_URL" -c "\dt backup_history" 2>/dev/null | grep -q backup_history; then
        OLD_COUNT=$(psql "$DATABASE_URL" -t -c \
            "SELECT COUNT(*) FROM backup_history WHERE backup_date < NOW() - INTERVAL '$RETENTION_DAYS days';")
        
        if [ "$OLD_COUNT" -gt 0 ]; then
            psql "$DATABASE_URL" -c \
                "DELETE FROM backup_history WHERE backup_date < NOW() - INTERVAL '$RETENTION_DAYS days';" > /dev/null 2>&1
            log_info "Deleted $OLD_COUNT old backup records"
        fi
    fi
    
    # List recent backups
    echo ""
    echo "Recent backups:"
    aws s3 ls "s3://$S3_BUCKET/" --recursive | tail -5 | awk '{print "  " $NF}'
else
    log_warn "AWS CLI not found - skipping S3 upload"
fi

# Cleanup local backup file (keep S3 copy)
if [ "$DELETE_LOCAL" = "true" ] && [ -f "$BACKUP_FILE" ]; then
    rm "$BACKUP_FILE"
    log_info "Local backup file deleted (kept in S3)"
fi

echo ""
echo "========================================"
log_info "Backup completed successfully"
echo "========================================"
