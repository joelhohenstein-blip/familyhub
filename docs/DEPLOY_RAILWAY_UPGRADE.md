# Railway.app Deployment Upgrade Guide

Complete guide for deploying and managing FamilyHub on Railway.app with production-grade features including custom domains, auto-scaling, monitoring, backups, and CI/CD integration.

---

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Custom Domain Configuration](#custom-domain-configuration)
3. [Auto-Scaling Configuration](#auto-scaling-configuration)
4. [Monitoring & Observability](#monitoring--observability)
5. [Automated Backups](#automated-backups)
6. [Environment Variables](#environment-variables)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Database Management](#database-management)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Initial Setup

### Prerequisites

- Railway.app account (https://railway.app)
- GitHub repository connected to Railway
- Domain name (for custom domain setup)
- Docker knowledge (optional but helpful)

### Step 1: Create a New Project

1. Log in to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub"**
4. Authorize Railway to access your GitHub account
5. Select your FamilyHub repository
6. Choose the branch to deploy (typically `main`)

### Step 2: Configure Services

Railway will auto-detect your project type. For a Node.js/Bun application:

1. **Add Database Service**
   - Click **"Add Service"** → **"Database"**
   - Select **PostgreSQL** (recommended for production)
   - Railway creates a `DATABASE_URL` environment variable automatically

2. **Configure Node.js Service**
   - Railway auto-detects `package.json` and `bun.lock`
   - Set build command: `bun install && bun run build`
   - Set start command: `bun run start`

3. **Add Redis (Optional)**
   - For caching and session management
   - Click **"Add Service"** → **"Database"** → **"Redis"**

### Step 3: Initial Deployment

```bash
# Push to main branch to trigger deployment
git push origin main

# Monitor deployment in Railway Dashboard
# Logs available in: Project → Service → Deployments → Logs
```

---

## Custom Domain Configuration

### Step 1: Point Domain to Railway

1. **In Railway Dashboard:**
   - Go to your project
   - Select the **web service**
   - Click **"Settings"** tab
   - Scroll to **"Domains"**
   - Click **"Add Domain"**
   - Enter your domain (e.g., `familyhub.com`)

2. **Railway provides DNS records:**
   - Copy the CNAME record provided
   - Example: `familyhub.com CNAME cname.railway.app`

### Step 2: Update DNS Provider

Update your domain registrar (GoDaddy, Namecheap, Route53, etc.):

```
Type: CNAME
Name: @ (or your subdomain)
Value: <railway-provided-cname>
TTL: 3600 (or default)
```

**For subdomains:**
```
Type: CNAME
Name: www
Value: <railway-provided-cname>
TTL: 3600
```

### Step 3: Enable SSL/TLS

Railway automatically provisions SSL certificates via Let's Encrypt:

1. DNS propagation takes 5-30 minutes
2. Railway automatically detects DNS and issues certificate
3. Check status in **Settings** → **Domains** → Certificate status

### Step 4: Redirect HTTP to HTTPS

Add to your application (e.g., in middleware):

```typescript
// app/server/middleware.ts
export function httpsRedirect(req: Request) {
  const url = new URL(req.url);
  
  if (url.protocol === 'http:' && process.env.NODE_ENV === 'production') {
    url.protocol = 'https:';
    return new Response(null, {
      status: 301,
      headers: { Location: url.toString() }
    });
  }
  
  return null;
}
```

### Step 5: Configure Multiple Domains

For `www` subdomain and apex domain:

1. Add both domains in Railway:
   - `familyhub.com`
   - `www.familyhub.com`

2. Update DNS for both:
   ```
   familyhub.com     CNAME cname.railway.app
   www.familyhub.com CNAME cname.railway.app
   ```

3. Add redirect in your app (optional):
   ```typescript
   // Redirect www to apex domain
   if (url.hostname === 'www.familyhub.com') {
     url.hostname = 'familyhub.com';
     return new Response(null, {
       status: 301,
       headers: { Location: url.toString() }
     });
   }
   ```

---

## Auto-Scaling Configuration

### Step 1: Enable Auto-Scaling

1. **In Railway Dashboard:**
   - Select your web service
   - Click **"Settings"** tab
   - Scroll to **"Scaling"**

2. **Configure Scaling Rules:**
   - **Min Instances:** 1 (minimum replicas)
   - **Max Instances:** 5 (maximum replicas)
   - **CPU Threshold:** 70% (scale up when exceeded)
   - **Memory Threshold:** 80% (scale up when exceeded)
   - **Scale Down Threshold:** 30% (scale down when below)

### Step 2: Set Resource Limits

1. **CPU & Memory per Instance:**
   - **CPU:** 0.5 - 2 vCPU (start with 1 vCPU)
   - **Memory:** 512MB - 4GB (start with 1GB)

2. **Configure in Railway:**
   - Settings → Resources
   - Set CPU: `1000m` (1 vCPU)
   - Set Memory: `1024Mi` (1GB)

### Step 3: Monitor Scaling Events

```bash
# View scaling logs in Railway Dashboard
# Project → Service → Logs → Filter by "scaling"

# Example log output:
# [SCALING] Scaling up from 1 to 2 instances (CPU: 75%)
# [SCALING] Scaling down from 2 to 1 instances (CPU: 25%)
```

### Step 4: Load Balancing

Railway automatically load-balances traffic across instances:

- **Session Persistence:** Use Redis for session storage (not in-memory)
- **Database Connections:** Use connection pooling (PgBouncer)

```typescript
// app/server/db.ts - Connection pooling example
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Max connections per instance
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
```

### Step 5: Health Checks

Configure health check endpoint:

```typescript
// app/routes/health.ts
export async function loader() {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

In Railway Settings:
- **Health Check Path:** `/health`
- **Health Check Interval:** 30s
- **Health Check Timeout:** 10s

---

## Monitoring & Observability

### Step 1: Enable Railway Metrics

1. **In Railway Dashboard:**
   - Project → Service → Metrics tab
   - View real-time metrics:
     - CPU usage
     - Memory usage
     - Network I/O
     - Request count
     - Error rate

### Step 2: Set Up Alerts

1. **Create Alert Rules:**
   - Click **"Alerts"** in project settings
   - **"New Alert"**

2. **Common Alert Configurations:**

   **High CPU Usage:**
   - Metric: CPU
   - Condition: > 80%
   - Duration: 5 minutes
   - Action: Email notification

   **High Memory Usage:**
   - Metric: Memory
   - Condition: > 85%
   - Duration: 5 minutes
   - Action: Email notification

   **High Error Rate:**
   - Metric: Error Rate
   - Condition: > 5%
   - Duration: 2 minutes
   - Action: Email + Slack webhook

3. **Configure Notifications:**
   - Email alerts
   - Slack integration: Settings → Integrations → Slack
   - PagerDuty integration (for critical alerts)

### Step 3: Application Logging

Configure structured logging in your app:

```typescript
// app/server/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      ...data
    }));
  },
  
  error: (message: string, error?: Error, data?: any) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      error: error?.message,
      stack: error?.stack,
      ...data
    }));
  },
  
  warn: (message: string, data?: any) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message,
      ...data
    }));
  }
};
```

### Step 4: Integrate with External Monitoring

**Option A: Sentry (Error Tracking)**

```bash
bun add @sentry/node
```

```typescript
// app/server/sentry.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

export default Sentry;
```

**Option B: DataDog (Full Observability)**

```bash
bun add dd-trace
```

```typescript
// app/server/datadog.ts
import tracer from 'dd-trace';

tracer.init({
  service: 'familyhub',
  env: process.env.NODE_ENV,
  version: process.env.APP_VERSION,
});

export default tracer;
```

**Option C: New Relic**

```bash
bun add newrelic
```

```typescript
// app/server/newrelic.ts
require('newrelic');
// Must be first require in your app
```

### Step 5: View Logs in Railway

```bash
# Real-time logs
# Dashboard → Service → Logs

# Filter logs:
# - By level: ERROR, WARN, INFO
# - By service: web, database, redis
# - By time range: Last hour, Last day, etc.

# Export logs:
# - Download as CSV
# - Stream to external service (Datadog, Splunk, etc.)
```

---

## Automated Backups

### Step 1: PostgreSQL Backups

Railway automatically backs up PostgreSQL databases:

1. **Automatic Backups:**
   - Frequency: Daily
   - Retention: 7 days (default)
   - Location: Railway's secure storage

2. **View Backups:**
   - Dashboard → Database Service → Backups tab
   - Shows backup history and size

### Step 2: Configure Backup Retention

1. **In Railway Dashboard:**
   - Select PostgreSQL service
   - Settings → Backups
   - Set retention policy:
     - **7 days** (default)
     - **30 days** (recommended for production)
     - **90 days** (for compliance)

### Step 3: Manual Backups

Create manual backups before major changes:

```bash
# Via Railway CLI
railway backup create

# Or in Dashboard:
# Database Service → Backups → "Create Backup"
```

### Step 4: Restore from Backup

**Via Railway Dashboard:**

1. Select PostgreSQL service
2. Backups tab
3. Click backup → "Restore"
4. Confirm restoration (creates new database)

**Via Railway CLI:**

```bash
railway backup restore <backup-id>
```

### Step 5: Export Data for External Backup

Create a scheduled backup export to S3:

```typescript
// app/server/backup.ts
import { exec } from 'child_process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { promisify } from 'util';

const execAsync = promisify(exec);
const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function backupToS3() {
  try {
    // Create database dump
    const { stdout } = await execAsync(
      `pg_dump ${process.env.DATABASE_URL} | gzip > backup.sql.gz`
    );
    
    // Upload to S3
    const fileContent = require('fs').readFileSync('backup.sql.gz');
    const timestamp = new Date().toISOString();
    
    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_BACKUP_BUCKET,
      Key: `backups/familyhub-${timestamp}.sql.gz`,
      Body: fileContent,
    }));
    
    console.log('Backup uploaded to S3');
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}
```

**Schedule with cron job:**

```typescript
// app/server/cron.ts
import cron from 'node-cron';
import { backupToS3 } from './backup';

// Run daily at 2 AM UTC
cron.schedule('0 2 * * *', async () => {
  console.log('Running scheduled backup...');
  await backupToS3();
});
```

### Step 6: Test Restore Procedure

Regularly test backup restoration:

```bash
# 1. Create test database
railway database create

# 2. Restore backup to test database
railway backup restore <backup-id> --target test-db

# 3. Verify data integrity
# 4. Delete test database
railway database delete test-db
```

---

## Environment Variables

### Step 1: Set Environment Variables in Railway

1. **In Railway Dashboard:**
   - Project → Service → Variables tab
   - Click **"New Variable"**

2. **Add Variables:**

```
# Database
DATABASE_URL=postgresql://user:pass@host:5432/familyhub

# Redis
REDIS_URL=redis://user:pass@host:6379

# Authentication
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# API Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# AWS (for backups/uploads)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_BACKUP_BUCKET=familyhub-backups

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
DATADOG_API_KEY=...

# Application
NODE_ENV=production
APP_VERSION=1.0.0
LOG_LEVEL=info
```

### Step 2: Use Reference Variables

Railway supports variable references:

```
# Reference another service's variable
DATABASE_URL=${{ PostgreSQL.DATABASE_URL }}
REDIS_URL=${{ Redis.REDIS_URL }}
```

### Step 3: Manage Secrets

**Best Practices:**

1. **Never commit secrets to Git**
2. **Use Railway's secret management**
3. **Rotate secrets regularly**
4. **Use different secrets per environment**

```bash
# Development
CLERK_SECRET_KEY=sk_test_dev_...

# Production
CLERK_SECRET_KEY=sk_live_prod_...
```

### Step 4: Environment-Specific Configuration

Create environment files:

```typescript
// app/config/env.ts
export const config = {
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
  
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production',
  },
  
  redis: {
    url: process.env.REDIS_URL,
  },
  
  auth: {
    clerkSecretKey: process.env.CLERK_SECRET_KEY,
    clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  },
  
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  },
  
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    logLevel: process.env.LOG_LEVEL || 'info',
  },
};
```

### Step 5: Validate Environment Variables

```typescript
// app/server/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  CLERK_SECRET_KEY: z.string(),
  CLERK_PUBLISHABLE_KEY: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  SENTRY_DSN: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
```

---

## CI/CD Pipeline

### Step 1: GitHub Actions Integration

Railway automatically deploys on push to main. For advanced CI/CD:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
      
      - name: Run type check
        run: bun run typecheck
      
      - name: Run tests
        run: bun run test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Build
        run: bun run build
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Railway
        uses: railway-app/deploy-action@v1
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
          service: web
          environment: production
```

### Step 2: Set Up Railway Token

1. **Generate Railway Token:**
   - Railway Dashboard → Account Settings → Tokens
   - Create new token
   - Copy token

2. **Add to GitHub Secrets:**
   - GitHub Repo → Settings → Secrets and variables → Actions
   - New secret: `RAILWAY_TOKEN`
   - Paste token

### Step 3: Preview Deployments

Enable preview deployments for pull requests:

```yaml
# .github/workflows/preview.yml
name: Preview Deployment

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  preview:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy Preview
        uses: railway-app/deploy-action@v1
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
          service: web
          environment: preview-${{ github.event.pull_request.number }}
      
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 Preview deployed to: https://preview-${{ github.event.pull_request.number }}.railway.app`
            })
```

### Step 4: Automated Testing

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test:unit
  
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - run: bun run test:e2e
```

### Step 5: Deployment Notifications

Send deployment notifications to Slack:

```yaml
# .github/workflows/notify.yml
name: Deployment Notification

on:
  deployment_status:

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Deployment ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment ${{ job.status }}*\nEnvironment: ${{ github.event.deployment.environment }}\nRef: ${{ github.event.deployment.ref }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Database Management

### Step 1: PostgreSQL Configuration

Optimize PostgreSQL for production:

```sql
-- Connection pooling
-- Use PgBouncer (Railway handles this)

-- Indexes for common queries
CREATE INDEX idx_donations_user_id ON donations(user_id);
CREATE INDEX idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX idx_users_email ON users(email);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM donations WHERE user_id = $1;
```

### Step 2: Database Migrations

Use Drizzle ORM for migrations:

```bash
# Generate migration
bun run db:generate

# Apply migration
bun run db:push

# Verify schema
bun run db:studio
```

### Step 3: Connection Pooling

Configure connection pooling in your app:

```typescript
// app/server/db.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;
```

### Step 4: Monitor Database Performance

```sql
-- Check active connections
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;

-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Step 5: Database Maintenance

Schedule regular maintenance:

```typescript
// app/server/maintenance.ts
import cron from 'node-cron';
import pool from './db';

// Vacuum and analyze daily at 3 AM UTC
cron.schedule('0 3 * * *', async () => {
  try {
    console.log('Running VACUUM ANALYZE...');
    await pool.query('VACUUM ANALYZE');
    console.log('VACUUM ANALYZE completed');
  } catch (error) {
    console.error('VACUUM ANALYZE failed:', error);
  }
});
```

---

## Security Best Practices

### Step 1: Network Security

1. **Enable Private Networking:**
   - Railway → Project Settings → Networking
   - Enable private networking between services
   - Database only accessible from web service

2. **Firewall Rules:**
   - Restrict database access to web service only
   - Use environment variables for connection strings

### Step 2: Secrets Management

1. **Never commit secrets:**
   ```bash
   # .gitignore
   .env
   .env.local
   .env.*.local
   ```

2. **Use Railway's secret management:**
   - All variables encrypted at rest
   - Encrypted in transit
   - Audit logs for access

3. **Rotate secrets regularly:**
   - Change API keys quarterly
   - Update database passwords
   - Regenerate tokens

### Step 3: SSL/TLS Configuration

1. **Enable HTTPS only:**
   ```typescript
   // app/server/middleware.ts
   export function enforceHttps(req: Request) {
     if (req.headers.get('x-forwarded-proto') !== 'https' && 
         process.env.NODE_ENV === 'production') {
       const url = new URL(req.url);
       url.protocol = 'https:';
       return new Response(null, {
         status: 301,
         headers: { Location: url.toString() }
       });
     }
   }
   ```

2. **Set security headers:**
   ```typescript
   // app/server/headers.ts
   export function securityHeaders(response: Response) {
     response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
     response.headers.set('X-Content-Type-Options', 'nosniff');
     response.headers.set('X-Frame-Options', 'DENY');
     response.headers.set('X-XSS-Protection', '1; mode=block');
     response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
     return response;
   }
   ```

### Step 4: Database Security

1. **Use strong passwords:**
   - Railway generates strong passwords by default
   - Change if needed: Settings → Database → Change Password

2. **Enable SSL for database connections:**
   ```typescript
   // app/server/db.ts
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
   });
   ```

3. **Restrict database access:**
   - Only web service can connect
   - No public internet access
   - Use private networking

### Step 5: Application Security

1. **Input validation:**
   ```typescript
   import { z } from 'zod';
   
   const donationSchema = z.object({
     amount: z.number().positive(),
     email: z.string().email(),
     message: z.string().max(500),
   });
   ```

2. **Rate limiting:**
   ```typescript
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests per windowMs
   });
   ```

3. **CORS configuration:**
   ```typescript
   // app/server/cors.ts
   export const corsOptions = {
     origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://familyhub.com'],
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE'],
   };
   ```

---

## Troubleshooting

### Common Issues

#### 1. Deployment Fails

**Check logs:**
```bash
# Railway Dashboard → Service → Logs
# Look for build errors or runtime errors
```

**Common causes:**
- Missing environment variables
- Build command fails
- Port not exposed correctly

**Solution:**
```bash
# Verify build locally
bun install
bun run build

# Check environment variables
railway variables list

# Redeploy
git push origin main
```

#### 2. High Memory Usage

**Symptoms:**
- Service crashes with OOM error
- Memory usage > 90%

**Solutions:**
```typescript
// 1. Increase memory limit
// Railway Settings → Resources → Memory: 2GB

// 2. Optimize code
// - Use streaming for large responses
// - Implement pagination
// - Cache frequently accessed data

// 3. Monitor memory leaks
import heapdump from 'heapdump';

if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const used = process.memoryUsage();
    console.log('Memory usage:', {
      rss: Math.round(used.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
    });
  }, 60000); // Every minute
}
```

#### 3. Database Connection Errors

**Symptoms:**
- "too many connections" error
- Connection timeout

**Solutions:**
```typescript
// 1. Increase max connections
const pool = new Pool({
  max: 30, // Increase from 20
});

// 2. Use connection pooling
// Railway handles this automatically

// 3. Check active connections
SELECT count(*) FROM pg_stat_activity;

// 4. Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND query_start < now() - interval '10 minutes';
```

#### 4. Custom Domain Not Working

**Symptoms:**
- Domain shows "Blocked request"
- SSL certificate not issued

**Solutions:**
```bash
# 1. Verify DNS propagation
nslookup familyhub.com
dig familyhub.com CNAME

# 2. Check Railway domain settings
# Dashboard → Service → Settings → Domains

# 3. Wait for SSL certificate
# Can take 5-30 minutes after DNS propagation

# 4. Force certificate renewal
# Settings → Domains → Renew Certificate
```

#### 5. Scaling Not Working

**Symptoms:**
- Service not scaling up under load
- Stuck at 1 instance

**Solutions:**
```bash
# 1. Check scaling configuration
# Settings → Scaling → Verify thresholds

# 2. Monitor metrics
# Metrics tab → CPU/Memory usage

# 3. Increase thresholds if needed
# CPU Threshold: 70% → 60%

# 4. Check health check endpoint
# Ensure /health returns 200 OK
```

### Getting Help

1. **Railway Support:**
   - Dashboard → Help → Contact Support
   - Community Discord: https://discord.gg/railway

2. **Check Logs:**
   - Service → Logs → Filter by error level
   - Export logs for analysis

3. **Monitor Metrics:**
   - Service → Metrics → Identify bottlenecks
   - Check CPU, memory, network usage

4. **Test Locally:**
   ```bash
   # Reproduce issue locally
   bun run dev
   
   # Check environment variables
   echo $DATABASE_URL
   
   # Test database connection
   psql $DATABASE_URL -c "SELECT 1"
   ```

---

## Deployment Checklist

Before deploying to production:

- [ ] All tests passing (`bun run test`)
- [ ] Type checking passes (`bun run typecheck`)
- [ ] Build succeeds locally (`bun run build`)
- [ ] Environment variables configured in Railway
- [ ] Database migrations applied
- [ ] Custom domain configured and DNS propagated
- [ ] SSL certificate issued
- [ ] Monitoring and alerts configured
- [ ] Backup strategy tested
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Error tracking (Sentry) configured
- [ ] Health check endpoint working
- [ ] Auto-scaling configured
- [ ] Database connection pooling enabled
- [ ] Secrets rotated and secured

---

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway CLI Reference](https://docs.railway.app/reference/cli-api)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/nodejs-performance/)
- [Security Best Practices](https://owasp.org/www-project-top-ten/)

---

## Support & Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Review error logs and fix issues
- Monitor performance metrics
- Check backup status

**Monthly:**
- Review and optimize slow queries
- Update dependencies
- Rotate secrets

**Quarterly:**
- Full security audit
- Database optimization
- Capacity planning

### Contact & Escalation

- **Technical Issues:** Railway Support Dashboard
- **Security Issues:** security@familyhub.com
- **Performance Issues:** Check metrics and scaling configuration
- **Database Issues:** Review connection pooling and query optimization

---

**Last Updated:** 2024
**Version:** 1.0.0
