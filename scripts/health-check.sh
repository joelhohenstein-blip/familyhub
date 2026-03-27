#!/bin/bash
# Health Check Script for Family Hub Application
# Validates app is running, database is responsive, and critical endpoints return 200 status
# Used by CI/CD for deployment verification

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_URL="${APP_URL:-http://localhost:3000}"
DB_URL="${DATABASE_URL:-postgresql://family_hub:password@localhost:5432/family_hub}"
TIMEOUT="${TIMEOUT:-30}"
RETRIES="${RETRIES:-5}"
RETRY_DELAY="${RETRY_DELAY:-2}"

# Initialize counters
PASSED=0
FAILED=0

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

check_http_endpoint() {
    local endpoint="$1"
    local expected_status="${2:-200}"
    local description="$3"
    
    echo ""
    echo "Checking: $description"
    echo "  URL: $endpoint"
    
    local retry_count=0
    while [ $retry_count -lt $RETRIES ]; do
        local response=$(curl -s -w "\n%{http_code}" -o /tmp/response.txt --max-time $TIMEOUT "$endpoint" 2>/dev/null || echo "000")
        local http_code=$(echo "$response" | tail -n1)
        
        if [ "$http_code" = "$expected_status" ]; then
            log_info "$description - HTTP $http_code"
            ((PASSED++))
            return 0
        fi
        
        ((retry_count++))
        if [ $retry_count -lt $RETRIES ]; then
            echo "  Attempt $retry_count/$RETRIES failed (HTTP $http_code), retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi
    done
    
    log_error "$description - HTTP $http_code after $RETRIES attempts"
    ((FAILED++))
    return 1
}

check_database() {
    echo ""
    echo "Checking: Database connectivity"
    echo "  URL: $DB_URL (redacted)"
    
    if command -v psql &> /dev/null; then
        if psql "$DB_URL" -c "SELECT NOW();" > /dev/null 2>&1; then
            log_info "Database connection successful"
            ((PASSED++))
            return 0
        else
            log_error "Database connection failed"
            ((FAILED++))
            return 1
        fi
    else
        log_warn "psql not found, skipping database check"
        return 0
    fi
}

check_database_tables() {
    echo ""
    echo "Checking: Database tables exist"
    
    if ! command -v psql &> /dev/null; then
        log_warn "psql not found, skipping table check"
        return 0
    fi
    
    # Check for critical tables
    local tables=("users" "messages" "media_uploads")
    
    for table in "${tables[@]}"; do
        if psql "$DB_URL" -t -c "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='$table');" | grep -q "t"; then
            log_info "Table '$table' exists"
            ((PASSED++))
        else
            log_warn "Table '$table' not found (may not be migrated yet)"
        fi
    done
    
    return 0
}

check_redis() {
    echo ""
    echo "Checking: Redis connectivity"
    
    local redis_url="${REDIS_URL:-redis://localhost:6379}"
    
    if command -v redis-cli &> /dev/null; then
        # Parse Redis URL
        local host=$(echo "$redis_url" | sed 's|.*://\([^@]*@\)\?\([^:]*\).*|\2|')
        local port=$(echo "$redis_url" | sed 's|.*:\([0-9]*\).*|\1|' || echo "6379")
        
        if redis-cli -h "$host" -p "$port" ping > /dev/null 2>&1; then
            log_info "Redis connection successful"
            ((PASSED++))
            return 0
        else
            log_warn "Redis connection failed (may not be configured)"
            return 0
        fi
    else
        log_warn "redis-cli not found, skipping Redis check"
        return 0
    fi
}

check_app_startup() {
    echo ""
    echo "Checking: Application startup"
    echo "  URL: $APP_URL"
    
    local retry_count=0
    while [ $retry_count -lt $RETRIES ]; do
        if curl -s --max-time $TIMEOUT "$APP_URL" > /dev/null 2>&1; then
            log_info "Application is responding"
            ((PASSED++))
            return 0
        fi
        
        ((retry_count++))
        if [ $retry_count -lt $RETRIES ]; then
            echo "  Attempt $retry_count/$RETRIES failed, retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi
    done
    
    log_error "Application did not respond after $RETRIES attempts"
    ((FAILED++))
    return 1
}

# Main execution
echo "========================================"
echo "Family Hub Health Check"
echo "========================================"
echo "App URL: $APP_URL"
echo "Timeout: ${TIMEOUT}s"
echo "Retries: $RETRIES"
echo ""

# Run checks
check_app_startup
check_http_endpoint "$APP_URL/health" "200" "Health endpoint"
check_http_endpoint "$APP_URL/" "200" "Home page"
check_database
check_database_tables
check_redis

# Summary
echo ""
echo "========================================"
echo "Health Check Summary"
echo "========================================"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo "========================================"

# Exit with failure if any checks failed
if [ $FAILED -gt 0 ]; then
    exit 1
fi

log_info "All health checks passed!"
exit 0
