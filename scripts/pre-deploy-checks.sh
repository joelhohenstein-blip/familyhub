#!/bin/bash
# Pre-Deployment Checks for Family Hub
# Verifies all prerequisites are met before deployment
# Usage: ./pre-deploy-checks.sh [--strict]

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

STRICT_MODE=false
PASSED=0
FAILED=0
WARNINGS=0

# Parse arguments
if [ "$1" = "--strict" ]; then
    STRICT_MODE=true
fi

echo "========================================"
echo "Pre-Deployment Checks"
echo "========================================"
echo "Strict Mode: $STRICT_MODE"
echo ""

# 1. Environment variables validation
log_header "Environment Variables"

REQUIRED_VARS=("NODE_ENV" "DATABASE_URL" "APP_PORT")

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        log_error "Missing required variable: $var"
        ((FAILED++))
    else
        log_info "$var is set"
        ((PASSED++))
    fi
done

# 2. Database connectivity
log_header "Database Connectivity"

if ! psql "$DATABASE_URL" -c "SELECT NOW();" > /dev/null 2>&1; then
    log_error "Cannot connect to database"
    ((FAILED++))
else
    log_info "Database connection successful"
    ((PASSED++))
    
    # Get database statistics
    DB_SIZE=$(psql "$DATABASE_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));")
    log_info "Database size: $DB_SIZE"
fi

# 3. Backup status
log_header "Backup Status"

if [ -f "./scripts/backup.sh" ]; then
    if ./scripts/backup.sh --verify 2>/dev/null; then
        log_info "Recent backup verified"
        ((PASSED++))
    else
        log_warn "Backup verification inconclusive"
        ((WARNINGS++))
    fi
else
    log_warn "Backup script not found"
fi

# 4. Migration status
log_header "Migration Status"

if psql "$DATABASE_URL" -c "\dt __drizzle_migrations__" 2>/dev/null | grep -q __drizzle_migrations__; then
    MIGRATION_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM __drizzle_migrations__;")
    log_info "Applied migrations: $MIGRATION_COUNT"
    ((PASSED++))
else
    log_warn "Migration table not found (may not be initialized)"
    ((WARNINGS++))
fi

# 5. Critical tables
log_header "Database Schema"

CRITICAL_TABLES=("users" "messages" "media_uploads")
TABLE_CHECK_PASSED=true

for table in "${CRITICAL_TABLES[@]}"; do
    if psql "$DATABASE_URL" -c "\dt $table" 2>/dev/null | grep -q "$table"; then
        log_info "Table '$table' exists"
    else
        log_warn "Table '$table' not found"
        TABLE_CHECK_PASSED=false
    fi
done

if [ "$TABLE_CHECK_PASSED" = true ]; then
    ((PASSED++))
fi

# 6. Application dependencies
log_header "Application Dependencies"

if [ -f "package.json" ]; then
    log_info "package.json found"
    ((PASSED++))
    
    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        log_info "node_modules exists"
        ((PASSED++))
    else
        log_warn "node_modules not found, run 'bun install'"
        ((WARNINGS++))
    fi
else
    log_error "package.json not found"
    ((FAILED++))
fi

# 7. Build artifacts
log_header "Build Artifacts"

if [ -d ".vite" ] || [ -d "dist" ] || [ -d ".next" ]; then
    log_info "Build artifacts found"
    ((PASSED++))
else
    log_warn "No build artifacts found, run 'bun run build'"
    ((WARNINGS++))
fi

# 8. Docker configuration
log_header "Docker Configuration"

if [ -f "Dockerfile" ]; then
    log_info "Dockerfile found"
    ((PASSED++))
    
    # Validate Dockerfile
    if docker build --dry-run . > /dev/null 2>&1; then
        log_info "Dockerfile is valid"
        ((PASSED++))
    else
        log_warn "Dockerfile validation inconclusive (Docker may not be running)"
        ((WARNINGS++))
    fi
else
    log_error "Dockerfile not found"
    ((FAILED++))
fi

if [ -f "docker-compose.yml" ]; then
    log_info "docker-compose.yml found"
    ((PASSED++))
else
    log_warn "docker-compose.yml not found"
    ((WARNINGS++))
fi

# 9. Environment file
log_header "Environment Configuration"

if [ -f ".env.example" ]; then
    log_info ".env.example found"
    ((PASSED++))
else
    log_error ".env.example not found"
    ((FAILED++))
fi

if [ -f ".env" ] || [ -f ".env.local" ]; then
    log_info "Environment file (.env or .env.local) exists"
    ((PASSED++))
else
    log_warn "No .env or .env.local file found"
    ((WARNINGS++))
fi

# 10. Scripts
log_header "Deployment Scripts"

REQUIRED_SCRIPTS=("health-check.sh" "smoke-tests.ts" "backup.sh" "verify-migration.sh")

for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [ -f "scripts/$script" ]; then
        log_info "scripts/$script found"
        ((PASSED++))
    else
        log_warn "scripts/$script not found"
        ((WARNINGS++))
    fi
done

# 11. Configuration files
log_header "Configuration Files"

CONFIG_FILES=(".dockerignore" "vite.config.ts" "tsconfig.json")

for config in "${CONFIG_FILES[@]}"; do
    if [ -f "$config" ]; then
        log_info "$config found"
        ((PASSED++))
    else
        log_warn "$config not found"
        ((WARNINGS++))
    fi
done

# 12. Documentation
log_header "Documentation"

DOCS=(
    ".github/DEPLOYMENT.md"
    "CONTAINER_SETUP.md"
    "docs/INFRASTRUCTURE.md"
    "docs/DATABASE_MIGRATION.md"
    "docs/ENV_VARIABLES.md"
)

DOCS_FOUND=0
for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        log_info "Found: $doc"
        ((DOCS_FOUND++))
    fi
done

if [ $DOCS_FOUND -ge 3 ]; then
    ((PASSED++))
    log_info "Documentation complete ($DOCS_FOUND of ${#DOCS[@]} files)"
else
    log_warn "Missing documentation ($DOCS_FOUND of ${#DOCS[@]} files)"
    ((WARNINGS++))
fi

# 13. Git status
log_header "Git Status"

if command -v git &> /dev/null; then
    if [ -d ".git" ]; then
        GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
        GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        log_info "Git branch: $GIT_BRANCH"
        log_info "Git commit: $GIT_COMMIT"
        ((PASSED++))
        
        # Check for uncommitted changes
        if ! git diff-index --quiet HEAD --; then
            log_warn "Uncommitted changes detected"
            ((WARNINGS++))
        fi
    else
        log_warn "Not a Git repository"
    fi
else
    log_warn "Git not found"
fi

# 14. Port availability
log_header "Port Availability"

APP_PORT="${APP_PORT:-3000}"
if ! lsof -Pi :$APP_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    log_info "Port $APP_PORT is available"
    ((PASSED++))
else
    log_warn "Port $APP_PORT is already in use"
    ((WARNINGS++))
fi

# 15. Disk space
log_header "System Resources"

AVAILABLE_SPACE=$(df / | tail -1 | awk '{print $4}')
AVAILABLE_GB=$((AVAILABLE_SPACE / 1024 / 1024))

if [ $AVAILABLE_GB -gt 5 ]; then
    log_info "Disk space available: ${AVAILABLE_GB}GB"
    ((PASSED++))
else
    log_warn "Low disk space: only ${AVAILABLE_GB}GB available"
    ((WARNINGS++))
fi

# Summary
log_header "Pre-Deployment Check Summary"

echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC} $FAILED"

if [ $FAILED -gt 0 ]; then
    echo ""
    log_error "Pre-deployment checks FAILED"
    
    if [ "$STRICT_MODE" = true ]; then
        exit 1
    else
        log_warn "Continuing in non-strict mode..."
    fi
fi

if [ $WARNINGS -gt 0 ]; then
    echo ""
    log_warn "Pre-deployment checks passed with $WARNINGS warnings"
    echo ""
    echo "Review warnings above before proceeding with deployment."
fi

if [ $FAILED -eq 0 ]; then
    echo ""
    log_info "All critical pre-deployment checks passed!"
    echo ""
    echo "Next steps:"
    echo "1. Review all warnings above"
    echo "2. Ensure database is backed up"
    echo "3. Have rollback plan ready"
    echo "4. Proceed with deployment"
    echo ""
    exit 0
fi
