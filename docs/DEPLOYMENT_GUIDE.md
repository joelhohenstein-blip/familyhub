# FamilyHub Deployment Guide

**Last Updated:** February 2025  
**Status:** Production-Ready  
**Version:** 1.0.0

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Local Development Setup](#local-development-setup)
4. [Docker Deployment](#docker-deployment)
5. [Cloud Deployment Options](#cloud-deployment-options)
6. [Environment Configuration](#environment-configuration)
7. [Database Setup & Migrations](#database-setup--migrations)
8. [Health Checks & Monitoring](#health-checks--monitoring)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)
11. [Post-Deployment Verification](#post-deployment-verification)

---

## Quick Start

### For Local Development

```bash
# 1. Clone and install
git clone <repository-url>
cd familyhub
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your local values

# 3. Start dev server with database
docker-compose up -d postgres redis
npm run dev

# 4. Access application
# Open http://localhost:3000
```

### For Docker Deployment

```bash
# 1. Build and start all services
docker-compose up -d

# 2. Run migrations
docker-compose exec app npm run db:push

# 3. Seed data (optional)
docker-compose exec app npm run db:seed

# 4. Verify health
docker-compose exec app npm run health-check

# 5. Access application
# Open http://localhost:3000
```

### For Production Cloud Deployment

```bash
# 1. Choose your platform (see Cloud Deployment Options)
# 2. Set environment variables in platform dashboard
# 3. Deploy using platform's CLI or GitHub integration
# 4. Run post-deployment verification
npm run deploy:verify
```

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript files pass type checking: `npm run typecheck:full`
- [ ] All tests pass: `npm run test:run`
- [ ] No console errors or warnings in production build
- [ ] All environment variables documented in `.env.example`
- [ ] No hardcoded secrets or API keys in code

### Infrastructure
- [ ] PostgreSQL 16+ database provisioned
- [ ] Redis 7+ cache provisioned
- [ ] SSL/TLS certificates configured
- [ ] Domain name configured with DNS
- [ ] CDN configured (optional but recommended)

### Configuration
- [ ] All required environment variables set
- [ ] Database connection string verified
- [ ] Redis connection string verified
- [ ] Clerk authentication configured
- [ ] Jitsi domain configured
- [ ] Pusher credentials configured
- [ ] Stripe API keys configured
- [ ] OpenWeather API key configured
- [ ] Streaming service APIs configured (Pluto, Tubi, Roku, Freeview)

### Security
- [ ] Database backups configured
- [ ] Monitoring and alerting enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers configured
- [ ] Database encryption enabled
- [ ] Secrets manager configured

### Performance
- [ ] Build optimization verified: `npm run build`
- [ ] Bundle size analyzed
- [ ] Database indexes created
- [ ] Redis cache strategy configured
- [ ] CDN cache headers configured

### Monitoring
- [ ] Error tracking (Sentry) configured
- [ ] Application logging configured
- [ ] Database monitoring enabled
- [ ] Health check endpoint verified
- [ ] Uptime monitoring configured

---

## Local Development Setup

### Prerequisites

- **Node.js**: 20.x or higher
- **npm/bun**: Latest version
- **Docker**: 20.10+ (for database services)
- **Docker Compose**: 2.0+ (for multi-container setup)

### Installation Steps

#### 1. Clone Repository

```bash
git clone <repository-url>
cd familyhub
```

#### 2. Install Dependencies

```bash
npm install
# or
bun install
```

#### 3. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your local development values:

```env
# Database
DATABASE_URL=postgresql://family_hub:password@localhost:5432/family_hub
DB_USER=family_hub
DB_PASSWORD=password
DB_NAME=family_hub
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=development
PREDEV_DEPLOYMENT_URL=http://localhost:3000

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Jitsi Video Conferencing
JITSI_DOMAIN=meet.jitsi.net

# Streaming Services (optional)
PLUTO_API_URL=https://api.pluto.tv
TUBI_API_URL=https://api.tubi.tv
ROKU_API_URL=https://api.roku.com
FREEVIEW_API_URL=https://api.freeview.com

# Weather API
OPENWEATHER_API_KEY=your_openweather_api_key

# Pusher Real-time
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=your_pusher_cluster

# Stripe Payments
STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Sentry Error Tracking
SENTRY_DSN=your_sentry_dsn
```

#### 4. Start Database Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Verify services are running
docker-compose ps
```

#### 5. Initialize Database

```bash
# Run migrations
npm run db:push

# Seed sample data (optional)
npm run db:seed
```

#### 6. Start Development Server

```bash
# Start with clean restart (recommended first time)
npm run dev

# Or quick start (if you know everything is clean)
npm run dev:quick
```

The application will be available at `http://localhost:3000`

#### 7. Verify Setup

```bash
# Run health checks
npm run health-check

# Run smoke tests
npm run smoke-tests
```

### Development Workflow

```bash
# Type checking (incremental)
npm run typecheck

# Full type checking with code generation
npm run typecheck:full

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Build for production
npm run build

# Preview production build
npm run prod
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Stop only database services
docker-compose stop postgres redis
```

---

## Docker Deployment

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   FamilyHub  │  │  PostgreSQL  │  │    Redis     │  │
│  │     App      │  │   Database   │  │    Cache     │  │
│  │  (Port 3000) │  │ (Port 5432)  │  │ (Port 6379)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │   Adminer    │  │ Redis Cmdr   │                     │
│  │ (Port 8080)  │  │ (Port 8081)  │                     │
│  └──────────────┘  └──────────────┘                     │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Docker Compose Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `app` | Node 20 Alpine | 3000 | FamilyHub application |
| `postgres` | PostgreSQL 16 Alpine | 5432 | Primary database |
| `redis` | Redis 7 Alpine | 6379 | Cache & real-time messaging |
| `adminer` | Adminer Latest | 8080 | Database management UI |
| `redis-commander` | Redis Commander | 8081 | Redis inspection UI |

### Building Docker Image

```bash
# Build production image
docker build -t familyhub:latest .

# Build with specific tag
docker build -t familyhub:v1.0.0 .

# Build for specific platform
docker buildx build --platform linux/amd64,linux/arm64 -t familyhub:latest .
```

### Running with Docker Compose

#### Start All Services

```bash
# Start in background
docker-compose up -d

# Start with logs visible
docker-compose up

# Start specific services
docker-compose up -d postgres redis app
```

#### Database Operations

```bash
# Run migrations
docker-compose exec app npm run db:push

# Seed data
docker-compose exec app npm run db:seed

# Reset database (WARNING: deletes all data)
docker-compose exec app npm run db:reset

# Backup database
docker-compose exec postgres pg_dump -U family_hub family_hub > backup.sql

# Restore database
docker-compose exec -T postgres psql -U family_hub family_hub < backup.sql
```

#### Monitoring Services

```bash
# View logs
docker-compose logs -f app

# View logs for specific service
docker-compose logs -f postgres

# View service status
docker-compose ps

# Inspect service
docker-compose exec app sh
```

#### Stopping Services

```bash
# Stop all services
docker-compose stop

# Stop specific service
docker-compose stop app

# Remove containers (keep volumes)
docker-compose down

# Remove everything including volumes
docker-compose down -v
```

### Health Checks

Docker Compose includes health checks for all services:

```bash
# Check service health
docker-compose ps

# Manual health check
docker-compose exec app curl -f http://localhost:3000/health

# Check database health
docker-compose exec postgres pg_isready -U family_hub -d family_hub

# Check Redis health
docker-compose exec redis redis-cli ping
```

### Production Docker Deployment

For production, use a multi-stage build with optimizations:

```dockerfile
# See Dockerfile for production-optimized build
# Key features:
# - Multi-stage build (builder + runtime)
# - Non-root user (nodejs)
# - Minimal Alpine base image
# - Health checks
# - Proper signal handling (dumb-init)
# - Production dependencies only
```

Deploy to production container registry:

```bash
# Tag image
docker tag familyhub:latest myregistry.azurecr.io/familyhub:latest

# Push to registry
docker push myregistry.azurecr.io/familyhub:latest

# Deploy to container orchestration platform
# (Kubernetes, Docker Swarm, Azure Container Instances, etc.)
```

---

## Cloud Deployment Options

### Option 1: Vercel (Recommended for React Router)

**Pros:**
- Zero-config deployment for React Router
- Automatic HTTPS and CDN
- Serverless functions for API routes
- Built-in analytics and monitoring
- Free tier available

**Cons:**
- Requires serverless database (Vercel Postgres)
- Limited to Node.js runtime
- Cold starts on serverless functions

**Setup:**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel

# 4. Configure environment variables in Vercel dashboard
# - DATABASE_URL (Vercel Postgres)
# - REDIS_URL (Upstash Redis)
# - All API keys and secrets

# 5. Set production environment
vercel env add DATABASE_URL
vercel env add REDIS_URL
# ... add all other variables
```

**vercel.json Configuration:**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

### Option 2: Railway

**Pros:**
- Simple deployment from GitHub
- Built-in PostgreSQL and Redis
- Automatic deployments on push
- Good free tier
- Excellent for full-stack apps

**Cons:**
- Smaller ecosystem than Vercel
- Limited customization

**Setup:**

```bash
# 1. Connect GitHub repository to Railway
# Visit: https://railway.app

# 2. Create new project
# Select "Deploy from GitHub"

# 3. Add services:
# - Node.js (for app)
# - PostgreSQL (for database)
# - Redis (for cache)

# 4. Configure environment variables
# - DATABASE_URL (auto-generated)
# - REDIS_URL (auto-generated)
# - All API keys

# 5. Deploy
# Automatic on push to main branch
```

### Option 3: Render

**Pros:**
- Free tier with auto-sleep
- Native PostgreSQL support
- Simple GitHub integration
- Good documentation

**Cons:**
- Auto-sleep on free tier
- Slower cold starts

**Setup:**

```bash
# 1. Connect GitHub to Render
# Visit: https://render.com

# 2. Create new Web Service
# Select GitHub repository

# 3. Configure:
# - Build Command: npm run build
# - Start Command: npm start
# - Environment: Node 20

# 4. Add PostgreSQL database
# - Create new PostgreSQL service
# - Link to web service

# 5. Add Redis cache
# - Create new Redis service
# - Link to web service

# 6. Set environment variables
# - DATABASE_URL
# - REDIS_URL
# - All API keys
```

### Option 4: AWS (ECS + RDS + ElastiCache)

**Pros:**
- Highly scalable
- Full control
- Enterprise-grade
- Auto-scaling support

**Cons:**
- Complex setup
- Higher cost
- Requires AWS knowledge

**Setup:**

```bash
# 1. Create ECR repository
aws ecr create-repository --repository-name familyhub

# 2. Build and push Docker image
docker build -t familyhub:latest .
docker tag familyhub:latest <account-id>.dkr.ecr.<region>.amazonaws.com/familyhub:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/familyhub:latest

# 3. Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier familyhub-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password <password>

# 4. Create ElastiCache Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id familyhub-redis \
  --cache-node-type cache.t3.micro \
  --engine redis

# 5. Create ECS cluster and task definition
# See AWS documentation for detailed steps

# 6. Deploy using CloudFormation or Terraform
```

### Option 5: DigitalOcean App Platform

**Pros:**
- Simple deployment
- Integrated databases
- Good pricing
- Straightforward scaling

**Cons:**
- Smaller ecosystem
- Limited customization

**Setup:**

```bash
# 1. Connect GitHub to DigitalOcean
# Visit: https://cloud.digitalocean.com/apps

# 2. Create new app
# Select GitHub repository

# 3. Configure services:
# - Web Service (Node.js)
# - PostgreSQL database
# - Redis cache

# 4. Set environment variables
# - DATABASE_URL
# - REDIS_URL
# - All API keys

# 5. Deploy
# Automatic on push to main branch
```

### Option 6: Self-Hosted (VPS)

**Pros:**
- Full control
- No vendor lock-in
- Potentially cheaper at scale

**Cons:**
- Requires DevOps knowledge
- Manual scaling
- Maintenance responsibility

**Setup:**

```bash
# 1. Provision VPS (DigitalOcean, Linode, AWS EC2, etc.)
# - Ubuntu 22.04 LTS recommended
# - 2GB+ RAM
# - 20GB+ storage

# 2. Install dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git docker.io docker-compose nginx certbot python3-certbot-nginx

# 3. Clone repository
git clone <repository-url>
cd familyhub

# 4. Setup environment
cp .env.example .env
# Edit .env with production values

# 5. Start services
docker-compose -f docker-compose.prod.yml up -d

# 6. Configure Nginx reverse proxy
# See nginx.conf example below

# 7. Setup SSL with Let's Encrypt
sudo certbot certonly --nginx -d yourdomain.com

# 8. Enable auto-renewal
sudo systemctl enable certbot.timer
```

**Nginx Configuration (nginx.conf):**

```nginx
upstream familyhub {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy configuration
    location / {
        proxy_pass http://familyhub;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://familyhub;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

---

## Environment Configuration

### Required Environment Variables

```env
# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================
DATABASE_URL=postgresql://user:password@host:5432/database
DB_USER=family_hub
DB_PASSWORD=secure_password_here
DB_NAME=family_hub
DB_PORT=5432

# ============================================================================
# REDIS CONFIGURATION
# ============================================================================
REDIS_URL=redis://localhost:6379

# ============================================================================
# APPLICATION CONFIGURATION
# ============================================================================
NODE_ENV=production
PREDEV_DEPLOYMENT_URL=https://yourdomain.com

# ============================================================================
# AUTHENTICATION (Clerk)
# ============================================================================
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# ============================================================================
# VIDEO CONFERENCING (Jitsi)
# ============================================================================
JITSI_DOMAIN=meet.jitsi.net

# ============================================================================
# STREAMING SERVICES (Optional)
# ============================================================================
PLUTO_API_URL=https://api.pluto.tv
TUBI_API_URL=https://api.tubi.tv
ROKU_API_URL=https://api.roku.com
FREEVIEW_API_URL=https://api.freeview.com

# ============================================================================
# WEATHER API
# ============================================================================
OPENWEATHER_API_KEY=your_api_key_here

# ============================================================================
# REAL-TIME MESSAGING (Pusher)
# ============================================================================
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=mt1

# ============================================================================
# PAYMENTS (Stripe)
# ============================================================================
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# ============================================================================
# ERROR TRACKING (Sentry)
# ============================================================================
SENTRY_DSN=https://...@sentry.io/...
```

### Environment-Specific Configuration

#### Development (.env.development)

```env
NODE_ENV=development
DATABASE_URL=postgresql://family_hub:password@localhost:5432/family_hub
REDIS_URL=redis://localhost:6379
PREDEV_DEPLOYMENT_URL=http://localhost:3000
# Use test/sandbox API keys
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

#### Staging (.env.staging)

```env
NODE_ENV=staging
DATABASE_URL=postgresql://user:password@staging-db.example.com:5432/family_hub
REDIS_URL=redis://staging-redis.example.com:6379
PREDEV_DEPLOYMENT_URL=https://staging.yourdomain.com
# Use staging API keys
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

#### Production (.env.production)

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@prod-db.example.com:5432/family_hub
REDIS_URL=redis://prod-redis.example.com:6379
PREDEV_DEPLOYMENT_URL=https://yourdomain.com
# Use production API keys
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

### Secrets Management

**Never commit `.env` files to version control!**

#### Using Environment Variable Services

**Vercel:**
```bash
vercel env add DATABASE_URL
vercel env add REDIS_URL
# ... add all other variables
```

**Railway:**
- Set variables in Railway dashboard
- Automatically injected at runtime

**AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name familyhub/database-url \
  --secret-string "postgresql://..."

aws secretsmanager create-secret \
  --name familyhub/redis-url \
  --secret-string "redis://..."
```

**HashiCorp Vault:**
```bash
vault kv put secret/familyhub \
  database_url="postgresql://..." \
  redis_url="redis://..."
```

---

## Database Setup & Migrations

### Initial Setup

```bash
# 1. Create database
createdb -U postgres family_hub

# 2. Run migrations
npm run db:push

# 3. Verify schema
npm run db:migrate

# 4. Seed sample data (optional)
npm run db:seed
```

### Running Migrations

#### Automatic Migration (Recommended)

```bash
# Push schema changes to database
npm run db:push

# This will:
# - Generate migration files
# - Apply migrations
# - Update database schema
```

#### Manual Migration

```bash
# Generate migration files
npm run drizzle:generate

# Review generated migrations in drizzle/migrations/

# Apply migrations
npm run drizzle:push
```

### Database Backup

#### Automated Backup (Docker)

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U family_hub family_hub > backup-$(date +%Y%m%d-%H%M%S).sql

# Backup with compression
docker-compose exec postgres pg_dump -U family_hub family_hub | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz
```

#### Backup Script

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup-$TIMESTAMP.sql.gz"

mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U family_hub family_hub | gzip > $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup-*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

#### Restore from Backup

```bash
# Restore from backup
gunzip < backup-20250207-120000.sql.gz | docker-compose exec -T postgres psql -U family_hub family_hub

# Or without compression
docker-compose exec -T postgres psql -U family_hub family_hub < backup-20250207-120000.sql
```

### Database Maintenance

```bash
# Analyze query performance
docker-compose exec postgres psql -U family_hub family_hub -c "ANALYZE;"

# Vacuum database (cleanup)
docker-compose exec postgres psql -U family_hub family_hub -c "VACUUM ANALYZE;"

# Check database size
docker-compose exec postgres psql -U family_hub family_hub -c "SELECT pg_size_pretty(pg_database_size('family_hub'));"

# List all tables
docker-compose exec postgres psql -U family_hub family_hub -c "\dt"

# Check table sizes
docker-compose exec postgres psql -U family_hub family_hub -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

## Health Checks & Monitoring

### Application Health Check

```bash
# Check application health
curl -f http://localhost:3000/health

# Expected response:
# HTTP 200 OK
# { "status": "healthy", "timestamp": "2025-02-07T12:00:00Z" }
```

### Automated Health Checks

```bash
# Run health check script
npm run health-check

# This checks:
# - Application is running
# - Database is accessible
# - Redis is accessible
# - All required services are healthy
```

### Smoke Tests

```bash
# Run smoke tests
npm run smoke-tests

# This tests:
# - API endpoints are responding
# - Database queries work
# - Authentication flow works
# - Real-time features work
```

### Monitoring Setup

#### Sentry Error Tracking

```bash
# 1. Create Sentry account
# Visit: https://sentry.io

# 2. Create new project
# Select: Node.js + React

# 3. Get DSN
# Copy DSN from project settings

# 4. Add to environment
SENTRY_DSN=https://...@sentry.io/...

# 5. Errors are automatically tracked
```

#### Application Logging

```bash
# View application logs
docker-compose logs -f app

# View logs with timestamps
docker-compose logs -f --timestamps app

# View last 100 lines
docker-compose logs --tail=100 app

# View logs for specific time range
docker-compose logs --since 2025-02-07T12:00:00 app
```

#### Database Monitoring

```bash
# Connect to database
docker-compose exec postgres psql -U family_hub family_hub

# Check active connections
SELECT datname, usename, application_name, state FROM pg_stat_activity;

# Check slow queries
SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

# Check table bloat
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Redis Monitoring

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Check memory usage
INFO memory

# Check connected clients
INFO clients

# Monitor commands in real-time
MONITOR

# Check key statistics
INFO keyspace
```

### Uptime Monitoring

#### Using Uptime Robot

```
1. Visit: https://uptimerobot.com
2. Create new monitor
3. Set URL: https://yourdomain.com/health
4. Set interval: 5 minutes
5. Enable notifications
```

#### Using Pingdom

```
1. Visit: https://www.pingdom.com
2. Create new check
3. Set URL: https://yourdomain.com/health
4. Set interval: 5 minutes
5. Configure alerts
```

---

## Backup & Recovery

### Automated Backup Strategy

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/scripts/backup.sh

# Weekly backup (Sunday at 3 AM)
0 3 * * 0 /path/to/scripts/backup.sh

# Monthly backup (1st of month at 4 AM)
0 4 1 * * /path/to/scripts/backup.sh
```

### Backup Verification

```bash
# Verify backup integrity
pg_restore --list backup-20250207-120000.sql.gz | head -20

# Test restore to temporary database
createdb family_hub_test
pg_restore -d family_hub_test backup-20250207-120000.sql.gz
# Run tests...
dropdb family_hub_test
```

### Disaster Recovery Plan

#### RTO (Recovery Time Objective): 1 hour
#### RPO (Recovery Point Objective): 15 minutes

**Recovery Steps:**

```bash
# 1. Identify issue
# Check logs, monitoring, error tracking

# 2. Assess damage
# Determine what data is affected

# 3. Restore from backup
# Find most recent clean backup
gunzip < backup-20250207-120000.sql.gz | psql -U family_hub family_hub

# 4. Verify restoration
npm run health-check
npm run smoke-tests

# 5. Notify users
# Send status update

# 6. Post-incident review
# Document what happened
# Update procedures
```

---

## Troubleshooting

### Common Issues

#### Application Won't Start

```bash
# Check logs
docker-compose logs app

# Common causes:
# 1. Database not running
docker-compose up -d postgres

# 2. Database not initialized
docker-compose exec app npm run db:push

# 3. Environment variables missing
# Check .env file

# 4. Port already in use
lsof -i :3000
kill -9 <PID>
```

#### Database Connection Error

```bash
# Check database is running
docker-compose ps postgres

# Check connection string
echo $DATABASE_URL

# Test connection
docker-compose exec postgres psql -U family_hub family_hub -c "SELECT 1;"

# Check database exists
docker-compose exec postgres psql -U postgres -l | grep family_hub

# Recreate database if needed
docker-compose exec postgres dropdb -U family_hub family_hub
docker-compose exec postgres createdb -U family_hub family_hub
docker-compose exec app npm run db:push
```

#### Redis Connection Error

```bash
# Check Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping

# Check Redis URL
echo $REDIS_URL

# Clear Redis cache
docker-compose exec redis redis-cli FLUSHALL
```

#### High Memory Usage

```bash
# Check memory usage
docker stats

# Check Node.js memory
docker-compose exec app node -e "console.log(process.memoryUsage())"

# Restart application
docker-compose restart app

# Check for memory leaks
# Enable heap snapshots and analyze
```

#### Slow Queries

```bash
# Enable query logging
docker-compose exec postgres psql -U family_hub family_hub -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"

# Reload configuration
docker-compose exec postgres psql -U family_hub family_hub -c "SELECT pg_reload_conf();"

# Check slow query log
docker-compose logs postgres | grep "duration:"

# Analyze query plan
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

#### WebSocket Connection Issues

```bash
# Check WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:3000/ws

# Check Pusher configuration
echo $PUSHER_KEY
echo $PUSHER_SECRET

# Test Pusher connection
# Use Pusher debug console
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run dev

# Enable specific module debugging
DEBUG=familyhub:* npm run dev

# Check environment
npm run typecheck:full

# Run tests with verbose output
npm run test -- --reporter=verbose
```

---

## Post-Deployment Verification

### Immediate Verification (First 5 minutes)

```bash
# 1. Check application is running
curl -f https://yourdomain.com/health

# 2. Check database connectivity
# Monitor logs for errors
docker-compose logs app | grep -i error

# 3. Check Redis connectivity
# Monitor logs for errors
docker-compose logs app | grep -i redis

# 4. Verify SSL certificate
curl -I https://yourdomain.com

# 5. Check response times
time curl https://yourdomain.com
```

### Functional Verification (First hour)

```bash
# 1. Test user authentication
# - Sign up with test account
# - Sign in
# - Sign out

# 2. Test core features
# - Create family
# - Add family members
# - Send messages
# - Schedule events

# 3. Test real-time features
# - Open app in multiple browsers
# - Send message in one, verify in other
# - Check WebSocket connection

# 4. Test file uploads
# - Upload profile picture
# - Upload document
# - Verify files are accessible

# 5. Test integrations
# - Verify Jitsi video call works
# - Verify Stripe payment works
# - Verify email notifications work
```

### Performance Verification

```bash
# 1. Check page load times
# Use browser DevTools or Lighthouse

# 2. Check API response times
npm run smoke-tests

# 3. Check database performance
# Monitor slow queries

# 4. Check memory usage
docker stats

# 5. Check CPU usage
top
```

### Security Verification

```bash
# 1. Check SSL/TLS
curl -I https://yourdomain.com
# Verify: Strict-Transport-Security header

# 2. Check security headers
curl -I https://yourdomain.com
# Verify: X-Content-Type-Options, X-Frame-Options, etc.

# 3. Check authentication
# Verify: Clerk is properly configured

# 4. Check database encryption
# Verify: Database is encrypted at rest

# 5. Check secrets
# Verify: No secrets in logs or error messages
```

### Monitoring Verification

```bash
# 1. Check error tracking
# Verify: Sentry is receiving errors

# 2. Check logging
# Verify: Logs are being collected

# 3. Check uptime monitoring
# Verify: Uptime robot is monitoring

# 4. Check alerts
# Verify: Alert notifications are working

# 5. Check dashboards
# Verify: Monitoring dashboards are displaying data
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Code review completed
- [ ] All tests passing
- [ ] Type checking passing
- [ ] No console errors
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Security review completed

### Deployment
- [ ] Build successful
- [ ] Docker image built
- [ ] Services started
- [ ] Database migrations applied
- [ ] Health checks passing
- [ ] Smoke tests passing
- [ ] No errors in logs

### Post-Deployment
- [ ] Application responding
- [ ] Database accessible
- [ ] Redis accessible
- [ ] Authentication working
- [ ] Real-time features working
- [ ] File uploads working
- [ ] Integrations working
- [ ] Performance acceptable
- [ ] Security headers present
- [ ] Monitoring active
- [ ] Alerts configured

---

## Support & Resources

### Documentation
- [Architecture Guide](./ARCHITECTURE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Developer Setup Guide](./DEVELOPER_SETUP.md)
- [Database Schema Guide](./DATABASE_SCHEMA.md)

### External Resources
- [React Router Documentation](https://reactrouter.com)
- [tRPC Documentation](https://trpc.io)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Redis Documentation](https://redis.io/documentation)
- [Docker Documentation](https://docs.docker.com)

### Getting Help
- Check logs: `docker-compose logs -f`
- Run health checks: `npm run health-check`
- Run smoke tests: `npm run smoke-tests`
- Check troubleshooting section above
- Review error tracking (Sentry)

---

**Last Updated:** February 2025  
**Maintained By:** FamilyHub Team  
**Version:** 1.0.0
