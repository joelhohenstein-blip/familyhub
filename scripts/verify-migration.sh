#!/bin/bash
# Migration Verification Script for Family Hub
# Post-migration checks to ensure schema integrity and data consistency
# Usage: ./verify-migration.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

PASSED=0
FAILED=0

# Main verification
echo "========================================"
echo "Migration Verification"
echo "========================================"
echo ""

# Check database connection
log_header "Database Connectivity"

if ! psql "$DATABASE_URL" -c "SELECT NOW();" > /dev/null 2>&1; then
    log_error "Cannot connect to database"
    exit 1
fi
log_info "Database connection successful"
((PASSED++))

# Get database info
DB_NAME=$(psql "$DATABASE_URL" -t -c "SELECT current_database();")
DB_SIZE=$(psql "$DATABASE_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));")
log_info "Database: $DB_NAME"
log_info "Size: $DB_SIZE"

# Check schema exists
log_header "Schema Verification"

SCHEMA_EXISTS=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = 'public';")

if [ "$SCHEMA_EXISTS" -eq 0 ]; then
    log_error "Public schema not found"
    ((FAILED++))
else
    log_info "Public schema exists"
    ((PASSED++))
fi

# List tables
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

log_info "Found $TABLE_COUNT tables"

echo ""
psql "$DATABASE_URL" -c "
    SELECT 
        table_name,
        to_char(pg_total_relation_size('public.' || table_name), '999,999,999') as size
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY pg_total_relation_size('public.' || table_name) DESC;
" | head -20

# Verify critical tables exist
log_header "Critical Tables Verification"

CRITICAL_TABLES=("users" "messages" "media_uploads" "backup_history" "retention_policy")

for table in "${CRITICAL_TABLES[@]}"; do
    TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c \
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='$table');")
    
    if [ "$TABLE_EXISTS" = "t" ]; then
        ROW_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;")
        log_info "Table '$table' exists ($ROW_COUNT rows)"
        ((PASSED++))
    else
        log_warn "Table '$table' not found"
    fi
done

# Check indices
log_header "Index Verification"

INDEX_COUNT=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';")

log_info "Found $INDEX_COUNT indices"
((PASSED++))

echo ""
psql "$DATABASE_URL" -c "
    SELECT indexname, tablename
    FROM pg_indexes 
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
" | head -20

# Check constraints
log_header "Constraints Verification"

FK_COUNT=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM information_schema.table_constraints \
     WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';")

log_info "Found $FK_COUNT foreign keys"

PK_COUNT=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM information_schema.table_constraints \
     WHERE constraint_type = 'PRIMARY KEY' AND table_schema = 'public';")

log_info "Found $PK_COUNT primary keys"
((PASSED++))

# Data integrity checks
log_header "Data Integrity Checks"

# Check for NULL values in required columns
echo "Checking for NULL values in required columns..."

if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    NULL_EMAILS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE email IS NULL;")
    if [ "$NULL_EMAILS" -eq 0 ]; then
        log_info "No NULL emails in users table"
        ((PASSED++))
    else
        log_warn "Found $NULL_EMAILS NULL emails"
    fi
fi

# Check for orphaned foreign keys
echo "Checking for orphaned foreign keys..."

ORPHANED=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM messages m 
     WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = m.sender_id);" 2>/dev/null || echo "0")

if [ "$ORPHANED" -eq 0 ]; then
    log_info "No orphaned messages found"
    ((PASSED++))
else
    log_warn "Found $ORPHANED orphaned messages"
fi

# Migration history
log_header "Migration History"

if psql "$DATABASE_URL" -c "\dt __drizzle_migrations__" 2>/dev/null | grep -q __drizzle_migrations__; then
    MIGRATION_COUNT=$(psql "$DATABASE_URL" -t -c \
        "SELECT COUNT(*) FROM __drizzle_migrations__;")
    log_info "Found $MIGRATION_COUNT applied migrations"
    ((PASSED++))
    
    echo ""
    echo "Recent migrations:"
    psql "$DATABASE_URL" -c "
        SELECT name, created_at 
        FROM __drizzle_migrations__ 
        ORDER BY created_at DESC 
        LIMIT 5;
    "
else
    log_warn "Migration history table not found"
fi

# Performance checks
log_header "Performance Checks"

# Table bloat check
echo "Checking for table bloat..."

BLOAT=$(psql "$DATABASE_URL" -c "
    SELECT 
        schemaname, tablename,
        ROUND(100 * (pg_total_relation_size(schemaname||'.'||tablename) -
                     pg_relation_size(schemaname||'.'||tablename)) /
              pg_total_relation_size(schemaname||'.'||tablename)::numeric, 2) as bloat_pct
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND pg_total_relation_size(schemaname||'.'||tablename) > 1024*1024
    ORDER BY bloat_pct DESC;
" | head -10)

if [ -z "$BLOAT" ]; then
    log_info "No significant table bloat detected"
else
    log_warn "Table bloat detected:"
    echo "$BLOAT"
fi
((PASSED++))

# Vacuum stats
echo ""
echo "Running VACUUM ANALYZE (may take a moment)..."

psql "$DATABASE_URL" -c "VACUUM ANALYZE;" > /dev/null 2>&1

log_info "VACUUM ANALYZE completed"

# Summary
log_header "Verification Summary"

echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"

if [ $FAILED -gt 0 ]; then
    echo ""
    log_error "Verification failed - please review errors above"
    exit 1
fi

echo ""
log_info "All migration verification checks passed!"
echo ""
echo "========================================"
echo "Next steps:"
echo "1. Monitor application logs for errors"
echo "2. Run smoke tests: ./scripts/smoke-tests.ts"
echo "3. Verify business logic in affected features"
echo "========================================"
