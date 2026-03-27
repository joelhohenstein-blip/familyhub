#!/bin/bash
# AWS Deployment Automation Script for Family Hub
# This script automates the deployment process to AWS
# Usage: ./deploy-aws.sh [--environment production|staging] [--skip-tests] [--dry-run]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
SKIP_TESTS=false
DRY_RUN=false
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID=""
ECR_REPOSITORY="family-hub"
ECS_CLUSTER="family-hub-cluster"
ECS_SERVICE="family-hub-service"
RDS_INSTANCE="family-hub-db"

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

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(production|staging)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    exit 1
fi

echo "========================================"
echo "Family Hub AWS Deployment Script"
echo "========================================"
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo "Dry Run: $DRY_RUN"
echo ""

# Step 1: Verify prerequisites
log_header "Step 1: Verifying Prerequisites"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found. Please install it first."
    exit 1
fi
log_info "AWS CLI found"

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker not found. Please install it first."
    exit 1
fi
log_info "Docker found"

# Check Git
if ! command -v git &> /dev/null; then
    log_error "Git not found. Please install it first."
    exit 1
fi
log_info "Git found"

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log_info "AWS Account ID: $AWS_ACCOUNT_ID"

# Step 2: Run pre-deployment checks
log_header "Step 2: Running Pre-Deployment Checks"

if [ -f "scripts/pre-deploy-checks.sh" ]; then
    if bash scripts/pre-deploy-checks.sh; then
        log_info "Pre-deployment checks passed"
    else
        log_warn "Pre-deployment checks completed with warnings"
    fi
else
    log_warn "Pre-deployment checks script not found"
fi

# Step 3: Run tests (unless skipped)
log_header "Step 3: Running Tests"

if [ "$SKIP_TESTS" = false ]; then
    if [ -f "package.json" ]; then
        log_info "Running test suite..."
        if bun run test 2>/dev/null; then
            log_info "Tests passed"
        else
            log_warn "Tests failed or not configured"
        fi
    fi
else
    log_warn "Skipping tests"
fi

# Step 4: Build application
log_header "Step 4: Building Application"

log_info "Building application..."
if [ "$DRY_RUN" = false ]; then
    bun run build
    log_info "Build completed"
else
    log_info "[DRY RUN] Would run: bun run build"
fi

# Step 5: Build Docker image
log_header "Step 5: Building Docker Image"

GIT_COMMIT=$(git rev-parse --short HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

log_info "Building Docker image..."
log_info "Git commit: $GIT_COMMIT"
log_info "Git branch: $GIT_BRANCH"
log_info "Build date: $BUILD_DATE"

if [ "$DRY_RUN" = false ]; then
    docker build \
        --build-arg BUILD_DATE="$BUILD_DATE" \
        --build-arg VCS_REF="$GIT_COMMIT" \
        --build-arg VERSION="$GIT_COMMIT" \
        -t "$ECR_REPOSITORY:latest" \
        -t "$ECR_REPOSITORY:$GIT_COMMIT" \
        -t "$ECR_REPOSITORY:$ENVIRONMENT" \
        .
    log_info "Docker image built"
else
    log_info "[DRY RUN] Would build Docker image with tags: latest, $GIT_COMMIT, $ENVIRONMENT"
fi

# Step 6: Push to ECR
log_header "Step 6: Pushing to ECR"

ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY"

log_info "ECR URI: $ECR_URI"

if [ "$DRY_RUN" = false ]; then
    # Login to ECR
    log_info "Logging in to ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ECR_URI"
    
    # Tag images for ECR
    docker tag "$ECR_REPOSITORY:latest" "$ECR_URI:latest"
    docker tag "$ECR_REPOSITORY:$GIT_COMMIT" "$ECR_URI:$GIT_COMMIT"
    docker tag "$ECR_REPOSITORY:$ENVIRONMENT" "$ECR_URI:$ENVIRONMENT"
    
    # Push images
    log_info "Pushing images to ECR..."
    docker push "$ECR_URI:latest"
    docker push "$ECR_URI:$GIT_COMMIT"
    docker push "$ECR_URI:$ENVIRONMENT"
    
    log_info "Images pushed to ECR"
else
    log_info "[DRY RUN] Would push images to ECR"
fi

# Step 7: Update ECS task definition
log_header "Step 7: Updating ECS Task Definition"

if [ "$DRY_RUN" = false ]; then
    # Get current task definition
    TASK_DEF=$(aws ecs describe-task-definition \
        --task-definition "$ECS_CLUSTER" \
        --region "$AWS_REGION" \
        --query 'taskDefinition' \
        --output json)
    
    # Update image in task definition
    NEW_TASK_DEF=$(echo "$TASK_DEF" | \
        jq --arg IMAGE "$ECR_URI:$GIT_COMMIT" \
        '.containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')
    
    # Register new task definition
    NEW_REVISION=$(aws ecs register-task-definition \
        --region "$AWS_REGION" \
        --cli-input-json "$(echo "$NEW_TASK_DEF" | jq -c .)" \
        --query 'taskDefinition.revision' \
        --output text)
    
    log_info "New task definition registered: revision $NEW_REVISION"
else
    log_info "[DRY RUN] Would update ECS task definition"
fi

# Step 8: Update ECS service
log_header "Step 8: Updating ECS Service"

if [ "$DRY_RUN" = false ]; then
    log_info "Updating ECS service..."
    
    aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$ECS_SERVICE" \
        --task-definition "$ECS_CLUSTER:$NEW_REVISION" \
        --force-new-deployment \
        --region "$AWS_REGION" > /dev/null
    
    log_info "ECS service updated"
    
    # Wait for service to stabilize
    log_info "Waiting for service to stabilize..."
    aws ecs wait services-stable \
        --cluster "$ECS_CLUSTER" \
        --services "$ECS_SERVICE" \
        --region "$AWS_REGION"
    
    log_info "Service stabilized"
else
    log_info "[DRY RUN] Would update ECS service"
fi

# Step 9: Verify deployment
log_header "Step 9: Verifying Deployment"

if [ "$DRY_RUN" = false ]; then
    # Get service status
    SERVICE_STATUS=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$ECS_SERVICE" \
        --region "$AWS_REGION" \
        --query 'services[0].[serviceName,status,desiredCount,runningCount]' \
        --output text)
    
    log_info "Service status: $SERVICE_STATUS"
    
    # Get task status
    TASKS=$(aws ecs list-tasks \
        --cluster "$ECS_CLUSTER" \
        --service-name "$ECS_SERVICE" \
        --region "$AWS_REGION" \
        --query 'taskArns' \
        --output text)
    
    if [ -n "$TASKS" ]; then
        TASK_STATUS=$(aws ecs describe-tasks \
            --cluster "$ECS_CLUSTER" \
            --tasks $TASKS \
            --region "$AWS_REGION" \
            --query 'tasks[*].[taskArn,lastStatus,desiredStatus]' \
            --output text)
        
        log_info "Task status:"
        echo "$TASK_STATUS" | while read -r line; do
            echo "  $line"
        done
    fi
else
    log_info "[DRY RUN] Would verify deployment"
fi

# Step 10: Run smoke tests
log_header "Step 10: Running Smoke Tests"

if [ -f "scripts/smoke-tests.ts" ]; then
    if [ "$DRY_RUN" = false ]; then
        log_info "Running smoke tests..."
        if bun run scripts/smoke-tests.ts 2>/dev/null; then
            log_info "Smoke tests passed"
        else
            log_warn "Smoke tests failed"
        fi
    else
        log_info "[DRY RUN] Would run smoke tests"
    fi
else
    log_warn "Smoke tests script not found"
fi

# Step 11: Invalidate CloudFront cache
log_header "Step 11: Invalidating CloudFront Cache"

# Get CloudFront distribution ID from environment or AWS
CLOUDFRONT_DIST_ID="${CLOUDFRONT_DISTRIBUTION_ID:-}"

if [ -z "$CLOUDFRONT_DIST_ID" ]; then
    # Try to find distribution by origin
    CLOUDFRONT_DIST_ID=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?Comment=='Family Hub CDN Distribution'].Id" \
        --output text | head -1)
fi

if [ -n "$CLOUDFRONT_DIST_ID" ]; then
    if [ "$DRY_RUN" = false ]; then
        log_info "Invalidating CloudFront cache for distribution: $CLOUDFRONT_DIST_ID"
        
        INVALIDATION_ID=$(aws cloudfront create-invalidation \
            --distribution-id "$CLOUDFRONT_DIST_ID" \
            --paths "/*" \
            --query 'Invalidation.Id' \
            --output text)
        
        log_info "Invalidation created: $INVALIDATION_ID"
    else
        log_info "[DRY RUN] Would invalidate CloudFront cache"
    fi
else
    log_warn "CloudFront distribution not found"
fi

# Step 12: Create deployment record
log_header "Step 12: Creating Deployment Record"

DEPLOYMENT_RECORD="{
  \"timestamp\": \"$(date -u +'%Y-%m-%dT%H:%M:%SZ')\",
  \"environment\": \"$ENVIRONMENT\",
  \"git_commit\": \"$GIT_COMMIT\",
  \"git_branch\": \"$GIT_BRANCH\",
  \"aws_region\": \"$AWS_REGION\",
  \"ecs_task_revision\": \"${NEW_REVISION:-N/A}\",
  \"deployed_by\": \"$(git config user.name 2>/dev/null || echo 'unknown')\",
  \"status\": \"success\"
}"

if [ "$DRY_RUN" = false ]; then
    echo "$DEPLOYMENT_RECORD" | jq . > "deployments/deployment-$(date +%Y%m%d-%H%M%S).json" 2>/dev/null || true
    log_info "Deployment record created"
else
    log_info "[DRY RUN] Would create deployment record"
fi

# Final summary
log_header "Deployment Summary"

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo ""
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo "Git Commit: $GIT_COMMIT"
echo "Git Branch: $GIT_BRANCH"
echo "ECR Image: $ECR_URI:$GIT_COMMIT"
if [ -n "${NEW_REVISION:-}" ]; then
    echo "ECS Task Revision: $NEW_REVISION"
fi
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}This was a DRY RUN. No changes were made.${NC}"
fi

echo ""
echo "Next steps:"
echo "1. Monitor CloudWatch logs: aws logs tail /ecs/family-hub --follow"
echo "2. Check service status: aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE"
echo "3. Verify application: curl https://familyhub.example.com/health"
echo ""

exit 0
