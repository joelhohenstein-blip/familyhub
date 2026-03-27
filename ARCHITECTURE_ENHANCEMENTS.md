# Architecture Enhancements: Deployment, Integration & Scaling

**Status**: Comprehensive Enhancement Document
**Last Updated**: 2024
**Complements**: ARCHITECTURE.md (1746 lines)

---

## Table of Contents

1. [Enhanced Deployment Architecture](#enhanced-deployment-architecture)
2. [System Integration Points](#system-integration-points)
3. [Scaling Strategy & Capacity Planning](#scaling-strategy--capacity-planning)
4. [Infrastructure as Code](#infrastructure-as-code)
5. [Disaster Recovery & Business Continuity](#disaster-recovery--business-continuity)
6. [Monitoring & Observability](#monitoring--observability)
7. [Security Architecture Deep Dive](#security-architecture-deep-dive)

---

## Enhanced Deployment Architecture

### Multi-Region Deployment Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    GLOBAL DEPLOYMENT                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    PRIMARY REGION (us-east-1)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ CloudFront Distribution (Global CDN)                       │ │
│  │ - Origin: Primary ALB                                      │ │
│  │ - Cache: 30 days for media, 5 min for API                 │ │
│  │ - Geo-routing: Route to nearest region                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Application Load Balancer (ALB)                            │ │
│  │ - Health checks: /health (every 30s)                       │ │
│  │ - Stickiness: Disabled (stateless)                         │ │
│  │ - SSL/TLS: ACM certificate                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Auto Scaling Group (ASG)                                   │ │
│  │ - Min: 2 instances                                         │ │
│  │ - Max: 10 instances                                        │ │
│  │ - Target CPU: 70%                                          │ │
│  │ - Target Memory: 75%                                       │ │
│  │ - Scale-up cooldown: 60s                                   │ │
│  │ - Scale-down cooldown: 300s                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ RDS Primary (PostgreSQL Multi-AZ)                          │ │
│  │ - Instance: db.r5.xlarge                                   │ │
│  │ - Storage: 500GB gp3 (3000 IOPS)                           │ │
│  │ - Backup: Daily snapshots, 30-day retention                │ │
│  │ - Failover: Automatic to standby (< 2 min)                │ │
│  │ - Monitoring: Enhanced monitoring enabled                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ElastiCache (Redis)                                        │ │
│  │ - Node type: cache.r6g.xlarge                              │ │
│  │ - Nodes: 3 (Multi-AZ)                                      │ │
│  │ - Automatic failover: Enabled                              │ │
│  │ - Encryption: At-rest + in-transit                         │ │
│  │ - Eviction policy: allkeys-lru                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ S3 + CloudFront (Media Storage)                            │ │
│  │ - Bucket: family-photos-prod                               │ │
│  │ - Versioning: Enabled                                      │ │
│  │ - Replication: Cross-region to us-west-2                   │ │
│  │ - Lifecycle: Archive to Glacier after 90 days              │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    SECONDARY REGION (us-west-2)                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Read Replica (RDS)                                         │ │
│  │ - Async replication from primary                           │ │
│  │ - Read-only endpoint                                       │ │
│  │ - Can be promoted to primary in DR scenario                │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ S3 Replica Bucket                                          │ │
│  │ - Automatic replication from primary                       │ │
│  │ - Same versioning & lifecycle policies                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Standby Application Stack (Inactive)                       │ │
│  │ - ASG with 0 instances (can scale up in DR)                │ │
│  │ - Same configuration as primary                            │ │
│  │ - Ready for failover                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    GLOBAL SERVICES                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Route 53 (DNS)                                             │ │
│  │ - Health checks: Primary ALB                               │ │
│  │ - Failover policy: Automatic to secondary region           │ │
│  │ - TTL: 60 seconds                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ CloudWatch (Monitoring)                                    │ │
│  │ - Metrics: All regions aggregated                          │ │
│  │ - Alarms: Cross-region alerting                            │ │
│  │ - Dashboards: Global view                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Deployment Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    CI/CD PIPELINE                               │
└─────────────────────────────────────────────────────────────────┘

STAGE 1: CODE COMMIT
  └─ Developer pushes to main branch
     └─ GitHub webhook triggers CI

STAGE 2: BUILD & TEST (GitHub Actions)
  ├─ Checkout code
  ├─ Install dependencies (bun install)
  ├─ Run linting (eslint)
  ├─ Run type checking (tsc)
  ├─ Run unit tests (vitest)
  ├─ Run integration tests
  ├─ Build application (vite build)
  ├─ Build Docker image
  │  └─ Tag: 123abc (commit SHA)
  │  └─ Tag: latest
  └─ Push to ECR (Elastic Container Registry)

STAGE 3: STAGING DEPLOYMENT
  ├─ Pull image from ECR
  ├─ Update ECS task definition
  ├─ Deploy to staging environment
  │  └─ Rolling update (1 task at a time)
  ├─ Run smoke tests
  │  ├─ Health check: GET /health → 200
  │  ├─ Auth flow: signup → login → logout
  │  ├─ API test: sample tRPC calls
  │  └─ Database: verify connectivity
  ├─ Run E2E tests (Playwright)
  │  ├─ Login flow
  │  ├─ Create family
  │  ├─ Send message
  │  └─ Upload photo
  └─ Notify team in Slack

STAGE 4: PRODUCTION DEPLOYMENT (Manual Approval)
  ├─ Create release tag (v1.2.3)
  ├─ Generate release notes
  ├─ Blue-Green Deployment
  │  ├─ Start new instances (green) with new image
  │  ├─ Run health checks on green
  │  ├─ Run smoke tests on green
  │  ├─ Switch load balancer: blue → green
  │  ├─ Monitor error rates for 5 minutes
  │  └─ Keep blue instances for 1 hour (rollback window)
  ├─ Database migrations (if any)
  │  ├─ Backup database
  │  ├─ Run migrations
  │  ├─ Verify schema
  │  └─ Monitor query performance
  ├─ Cache invalidation
  │  ├─ Invalidate CloudFront cache
  │  ├─ Clear Redis cache (if needed)
  │  └─ Notify clients to refresh
  ├─ Post-deployment verification
  │  ├─ Monitor error rates (target: < 0.1%)
  │  ├─ Monitor response times (target: < 200ms p95)
  │  ├─ Monitor database performance
  │  └─ Check user reports
  └─ Notify stakeholders

STAGE 5: ROLLBACK (if needed)
  ├─ Switch load balancer: green → blue
  ├─ Monitor error rates
  ├─ Investigate issue
  └─ Plan fix for next deployment
```

### Environment Configuration

```yaml
PRODUCTION:
  Database:
    Host: prod-db.c9akciq32.us-east-1.rds.amazonaws.com
    Port: 5432
    SSL: true
    Pool Size: 100
    Idle Timeout: 30s
  
  Cache:
    Host: prod-cache.abc123.ng.0001.use1.cache.amazonaws.com
    Port: 6379
    SSL: true
    TTL: 24 hours
  
  Storage:
    Bucket: family-photos-prod
    Region: us-east-1
    CDN: d123.cloudfront.net
  
  Monitoring:
    Sentry DSN: https://key@sentry.io/project
    DataDog API Key: dd_api_key
    CloudWatch: Enabled
  
  Security:
    CORS Origin: https://familyapp.com
    Session Cookie: HttpOnly, Secure, SameSite=None
    HSTS: max-age=31536000

STAGING:
  Database:
    Host: staging-db.c9akciq32.us-east-1.rds.amazonaws.com
    Pool Size: 50
  
  Cache:
    Host: staging-cache.abc123.ng.0001.use1.cache.amazonaws.com
  
  Storage:
    Bucket: family-photos-staging
    CDN: d456.cloudfront.net
  
  CORS Origin: https://staging.familyapp.com

DEVELOPMENT:
  Database:
    Host: localhost
    Port: 5432
    Database: family_app_dev
  
  Cache:
    Host: localhost
    Port: 6379
  
  Storage:
    Bucket: family-photos-dev
    Local: ./uploads
  
  CORS Origin: http://localhost:3000
```

---

## System Integration Points

### External Service Integrations

```
┌──────────────────────────────────────────────────────────────────┐
│                    INTEGRATION ARCHITECTURE                      │
└──────────────────────────────────────────────────────────────────┘

1. STRIPE (Payment Processing)
   ├─ Endpoint: https://api.stripe.com/v1
   ├─ Authentication: API Key (sk_live_...)
   ├─ Operations:
   │  ├─ Create customer: POST /customers
   │  ├─ Create subscription: POST /subscriptions
   │  ├─ Update subscription: POST /subscriptions/{id}
   │  ├─ Cancel subscription: DELETE /subscriptions/{id}
   │  ├─ Create invoice: POST /invoices
   │  └─ Retrieve invoice: GET /invoices/{id}
   ├─ Webhooks:
   │  ├─ customer.subscription.created
   │  ├─ customer.subscription.updated
   │  ├─ customer.subscription.deleted
   │  ├─ invoice.payment_succeeded
   │  └─ invoice.payment_failed
   ├─ Retry Logic:
   │  ├─ Exponential backoff: 1s, 2s, 4s, 8s
   │  ├─ Max retries: 3
   │  └─ Timeout: 30s
   └─ Error Handling:
      ├─ 4xx: Client error (validation, auth)
      ├─ 5xx: Server error (retry)
      └─ Network: Timeout (retry)

2. GOOGLE OAUTH (Authentication)
   ├─ Endpoint: https://accounts.google.com/o/oauth2
   ├─ Client ID: xxx.apps.googleusercontent.com
   ├─ Scopes: openid, email, profile
   ├─ Flow:
   │  ├─ Redirect to Google login
   │  ├─ User authenticates
   │  ├─ Google redirects to callback
   │  ├─ Exchange code for token
   │  ├─ Fetch user info
   │  └─ Create/update user in DB
   ├─ Token Handling:
   │  ├─ Access token: 1 hour
   │  ├─ Refresh token: 6 months
   │  └─ Store refresh token securely
   └─ Error Handling:
      ├─ Invalid code: Redirect to login
      ├─ Token expired: Refresh token
      └─ Network error: Retry with backoff

3. GOOGLE CALENDAR (Calendar Sync)
   ├─ Endpoint: https://www.googleapis.com/calendar/v3
   ├─ Authentication: OAuth 2.0 (user token)
   ├─ Operations:
   │  ├─ List calendars: GET /users/me/calendarList
   │  ├─ Create event: POST /calendars/{calendarId}/events
   │  ├─ Update event: PATCH /calendars/{calendarId}/events/{eventId}
   │  ├─ Delete event: DELETE /calendars/{calendarId}/events/{eventId}
   │  └─ Watch calendar: POST /calendars/{calendarId}/watch
   ├─ Sync Strategy:
   │  ├─ Full sync: Every 24 hours
   │  ├─ Incremental sync: Every 5 minutes
   │  ├─ Webhook: Real-time updates
   │  └─ Conflict resolution: Server wins
   ├─ Rate Limiting:
   │  ├─ Quota: 1,000,000 requests/day
   │  ├─ Per-user: 10 requests/second
   │  └─ Backoff: Exponential
   └─ Error Handling:
      ├─ 401: Token expired (refresh)
      ├─ 403: Permission denied (re-auth)
      ├─ 404: Calendar not found (sync)
      └─ 429: Rate limited (backoff)

4. AWS S3 (File Storage)
   ├─ Endpoint: https://s3.amazonaws.com
   ├─ Authentication: AWS Signature V4
   ├─ Operations:
   │  ├─ Upload: PUT /bucket/key
   │  ├─ Download: GET /bucket/key
   │  ├─ Delete: DELETE /bucket/key
   │  └─ List: GET /bucket?prefix=...
   ├─ Upload Strategy:
   │  ├─ Multipart upload for files > 100MB
   │  ├─ Pre-signed URLs for client uploads
   │  ├─ Server-side encryption (AES-256)
   │  └─ Metadata: Content-Type, Cache-Control
   ├─ Download Strategy:
   │  ├─ CloudFront CDN for caching
   │  ├─ Signed URLs for private files
   │  └─ Range requests for streaming
   └─ Error Handling:
      ├─ 403: Access denied (check credentials)
      ├─ 404: File not found (check key)
      ├─ 503: Service unavailable (retry)
      └─ Network: Timeout (retry with backoff)

5. SENDGRID (Email)
   ├─ Endpoint: https://api.sendgrid.com/v3
   ├─ Authentication: API Key
   ├─ Operations:
   │  ├─ Send email: POST /mail/send
   │  ├─ Get bounce list: GET /suppression/bounces
   │  └─ Get unsubscribe list: GET /suppression/unsubscribes
   ├─ Email Types:
   │  ├─ Transactional: Password reset, verification
   │  ├─ Notification: New message, event reminder
   │  └─ Digest: Weekly family summary
   ├─ Rate Limiting:
   │  ├─ Quota: 100,000 emails/day
   │  ├─ Per-second: 600 requests/second
   │  └─ Backoff: Exponential
   └─ Error Handling:
      ├─ 400: Invalid email (validation)
      ├─ 401: Invalid API key (check config)
      ├─ 429: Rate limited (queue & retry)
      └─ 5xx: Server error (retry)

6. SENTRY (Error Tracking)
   ├─ Endpoint: https://sentry.io
   ├─ Authentication: DSN (Data Source Name)
   ├─ Operations:
   │  ├─ Capture exception: captureException(error)
   │  ├─ Capture message: captureMessage(msg)
   │  ├─ Set user context: setUser({id, email})
   │  └─ Set tags: setTag(key, value)
   ├─ Integration Points:
   │  ├─ Server: Express middleware
   │  ├─ Client: React error boundary
   │  ├─ Database: Query errors
   │  └─ API: tRPC error handler
   ├─ Sampling:
   │  ├─ Errors: 100% (all errors)
   │  ├─ Transactions: 10% (performance)
   │  └─ Replays: 5% (session replays)
   └─ Error Handling:
      ├─ Network error: Queue locally
      ├─ Rate limited: Drop oldest events
      └─ Invalid DSN: Log warning
```

### Data Flow Diagrams

```
┌─────────────────────────────────────────────────────────────────┐
│                    MESSAGE FLOW (Real-Time)                    │
└─────────────────────────────────────────────────────────────────┘

User A sends message to User B:

1. User A types message
   └─ Client: messages.send(conversationId, content)

2. Server receives mutation
   ├─ Validate input (Zod)
   ├─ Check authorization (user in conversation)
   ├─ Insert into database
   │  └─ INSERT INTO conversationMessages (...)
   └─ Emit event: "message:created"

3. Event broadcast
   ├─ Find all subscribers to conversation
   ├─ Send via WebSocket to User A (sender)
   │  └─ Update local state
   │  └─ Show "sent" status
   ├─ Send via WebSocket to User B (recipient)
   │  └─ Update conversation list
   │  └─ Show notification
   └─ Send via WebSocket to other family members
      └─ Update conversation list

4. Notification (if User B offline)
   ├─ Create notification record
   │  └─ INSERT INTO notifications (...)
   ├─ Send email (if enabled)
   │  └─ POST /mail/send (SendGrid)
   └─ Send push notification (if enabled)
      └─ POST /send (Firebase Cloud Messaging)

5. User B comes online
   ├─ Fetch unread messages
   │  └─ SELECT * FROM conversationMessages WHERE read = false
   ├─ Mark as read
   │  └─ UPDATE conversationMessages SET read = true
   └─ Emit event: "message:read"

6. User A receives read receipt
   ├─ WebSocket: message:read event
   └─ Update UI: Show "read" status
```

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHOTO UPLOAD FLOW                           │
└─────────────────────────────────────────────────────────────────┘

1. User selects photo
   └─ Client: Validate file (type, size)

2. Get upload URL
   ├─ Client: media.getUploadUrl(fileName, fileSize)
   ├─ Server: Generate pre-signed S3 URL
   │  └─ AWS.S3.getSignedUrl('putObject', {...})
   └─ Return URL + fields to client

3. Upload to S3
   ├─ Client: PUT /bucket/photos/uuid.jpg
   │  ├─ Headers: Content-Type, x-amz-meta-*
   │  └─ Body: File data
   └─ S3: Store file + metadata

4. Process image
   ├─ S3 event: ObjectCreated:Put
   ├─ Trigger Lambda function
   │  ├─ Download original
   │  ├─ Generate thumbnail (200x200)
   │  ├─ Generate preview (800x600)
   │  ├─ Compress for web (quality 80)
   │  └─ Upload variants to S3
   └─ Update database
      └─ UPDATE media SET thumbnailUrl = ...

5. Create media record
   ├─ Client: media.create(fileName, s3Key, metadata)
   ├─ Server: INSERT INTO media (...)
   └─ Return media object

6. Display in gallery
   ├─ Client: Fetch media list
   ├─ Server: SELECT * FROM media WHERE familyId = ?
   └─ Client: Render with CloudFront URLs
      └─ https://d123.cloudfront.net/photos/uuid.jpg
```

---

## Scaling Strategy & Capacity Planning

### Horizontal Scaling

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTO SCALING POLICY                          │
└─────────────────────────────────────────────────────────────────┘

APPLICATION TIER:
  Metric: CPU Utilization
  ├─ Target: 70%
  ├─ Scale-up threshold: > 80% for 2 minutes
  │  └─ Add 1 instance (max 10)
  ├─ Scale-down threshold: < 30% for 5 minutes
  │  └─ Remove 1 instance (min 2)
  └─ Cooldown: 60s (scale-up), 300s (scale-down)

  Metric: Memory Utilization
  ├─ Target: 75%
  ├─ Scale-up threshold: > 85% for 2 minutes
  │  └─ Add 1 instance
  └─ Cooldown: 60s

  Metric: Request Count
  ├─ Target: 1000 requests/min per instance
  ├─ Scale-up threshold: > 1200 requests/min per instance
  │  └─ Add 1 instance
  └─ Cooldown: 60s

DATABASE TIER:
  Metric: CPU Utilization
  ├─ Target: 60%
  ├─ Alert threshold: > 75%
  │  └─ Consider read replica
  └─ Critical threshold: > 90%
     └─ Page on-call engineer

  Metric: Connections
  ├─ Target: 80 connections (of 100 max)
  ├─ Alert threshold: > 90 connections
  │  └─ Increase pool size or add replica
  └─ Critical threshold: > 95 connections
     └─ Page on-call engineer

  Metric: Disk Usage
  ├─ Target: 70%
  ├─ Alert threshold: > 80%
  │  └─ Plan storage expansion
  └─ Critical threshold: > 90%
     └─ Expand immediately

CACHE TIER:
  Metric: Eviction Rate
  ├─ Target: < 1% of operations
  ├─ Alert threshold: > 5%
  │  └─ Increase cache size
  └─ Critical threshold: > 10%
     └─ Increase immediately

  Metric: CPU Utilization
  ├─ Target: 60%
  ├─ Alert threshold: > 75%
  │  └─ Add cache node
  └─ Critical threshold: > 90%
     └─ Add node immediately
```

### Capacity Planning

```
CURRENT CAPACITY (as of 2024):
  Users: 10,000 active
  Families: 3,000
  Daily Messages: 50,000
  Daily Photo Uploads: 5,000
  Storage: 500GB

PROJECTED GROWTH:
  Year 1: 50,000 users (5x growth)
  Year 2: 200,000 users (4x growth)
  Year 3: 500,000 users (2.5x growth)

INFRASTRUCTURE SCALING:
  
  YEAR 1 (50K users):
    App Servers: 4-6 instances (currently 2-3)
    Database: db.r5.xlarge → db.r5.2xlarge
    Cache: 3 nodes → 5 nodes
    Storage: 500GB → 2TB
    Estimated Cost: $5,000/month → $8,000/month
  
  YEAR 2 (200K users):
    App Servers: 8-12 instances
    Database: db.r5.2xlarge → db.r5.4xlarge
    Cache: 5 nodes → 10 nodes
    Storage: 2TB → 10TB
    Read Replicas: 1 → 2
    Estimated Cost: $8,000/month → $15,000/month
  
  YEAR 3 (500K users):
    App Servers: 15-20 instances
    Database: db.r5.4xlarge → db.r6i.8xlarge
    Cache: 10 nodes → 20 nodes
    Storage: 10TB → 50TB
    Read Replicas: 2 → 3
    Multi-region: Add secondary region
    Estimated Cost: $15,000/month → $30,000/month
```

---

## Infrastructure as Code

### Terraform Configuration Structure

```
terraform/
├── main.tf                 # Main configuration
├── variables.tf            # Input variables
├── outputs.tf              # Output values
├── terraform.tfvars        # Variable values
├── environments/
│   ├── prod.tfvars
│   ├── staging.tfvars
│   └── dev.tfvars
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── alb/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── ecs/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── rds/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── elasticache/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── s3/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── monitoring/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── .gitignore

DEPLOYMENT:
  terraform init
  terraform plan -var-file=environments/prod.tfvars
  terraform apply -var-file=environments/prod.tfvars
```

---

## Disaster Recovery & Business Continuity

### RTO & RPO Targets

```
RTO (Recovery Time Objective):
  ├─ Application failure: 5 minutes
  │  └─ Automatic failover to secondary region
  ├─ Database failure: 2 minutes
  │  └─ Automatic failover to standby
  ├─ Data corruption: 1 hour
  │  └─ Restore from backup
  └─ Complete data loss: 4 hours
     └─ Restore from cross-region backup

RPO (Recovery Point Objective):
  ├─ Database: 5 minutes
  │  └─ Continuous replication to standby
  ├─ S3 files: 1 hour
  │  └─ Cross-region replication
  ├─ Configuration: 1 day
  │  └─ Version control (GitHub)
  └─ Logs: 7 days
     └─ CloudWatch Logs retention
```

### Backup Strategy

```
DATABASE BACKUPS:
  ├─ Automated daily snapshots
  │  ├─ Retention: 30 days
  │  ├─ Time: 2 AM UTC
  │  └─ Storage: AWS Backup
  ├─ Cross-region replication
  │  ├─ Destination: us-west-2
  │  └─ Retention: 7 days
  ├─ Point-in-time recovery
  │  ├─ Retention: 7 days
  │  └─ Granularity: 1 minute
  └─ Monthly archive
     ├─ Retention: 1 year
     └─ Storage: Glacier

S3 BACKUPS:
  ├─ Versioning: Enabled
  │  └─ Retention: 30 days
  ├─ Cross-region replication
  │  ├─ Destination: us-west-2
  │  └─ Replication time: < 15 minutes
  ├─ Lifecycle policies
  │  ├─ Archive to Glacier: 90 days
  │  └─ Delete: 1 year
  └─ MFA delete: Enabled
     └─ Requires MFA to delete

CONFIGURATION BACKUPS:
  ├─ GitHub: Source of truth
  │  ├─ Terraform code
  │  ├─ Docker configs
  │  └─ CI/CD pipelines
  ├─ AWS Secrets Manager
  │  ├─ API keys
  │  ├─ Database credentials
  │  └─ Encryption keys
  └─ Parameter Store
     ├─ Environment variables
     └─ Configuration values
```

### Disaster Recovery Procedures

```
SCENARIO 1: Application Server Failure
  1. ALB health check fails (30s)
  2. ASG removes unhealthy instance
  3. ASG launches replacement instance
  4. New instance joins load balancer
  5. Traffic automatically rerouted
  RTO: < 2 minutes

SCENARIO 2: Database Failure
  1. RDS detects primary failure
  2. Automatic failover to standby (< 2 min)
  3. DNS updated to point to new primary
  4. Applications reconnect
  5. Verify data integrity
  RTO: < 2 minutes
  RPO: < 5 minutes (continuous replication)

SCENARIO 3: Region Failure
  1. Route 53 health check fails
  2. DNS failover to secondary region
  3. Scale up secondary region ASG
  4. Promote read replica to primary
  5. Update database connection strings
  6. Verify application health
  RTO: < 5 minutes
  RPO: < 1 hour (async replication)

SCENARIO 4: Data Corruption
  1. Detect corruption via monitoring
  2. Identify affected data
  3. Restore from backup
  4. Verify data integrity
  5. Replay transactions (if needed)
  RTO: < 1 hour
  RPO: < 5 minutes

SCENARIO 5: Security Breach
  1. Isolate affected systems
  2. Revoke compromised credentials
  3. Rotate API keys
  4. Audit logs for unauthorized access
  5. Notify affected users
  6. Deploy security patches
  RTO: < 1 hour
```

---

## Monitoring & Observability

### Observability Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────────┘

METRICS (CloudWatch + DataDog):
  ├─ Application Metrics
  │  ├─ Request rate (req/sec)
  │  ├─ Response time (p50, p95, p99)
  │  ├─ Error rate (errors/sec)
  │  ├─ Success rate (%)
  │  └─ Active connections
  ├─ Database Metrics
  │  ├─ Query execution time
  │  ├─ Slow query count
  │  ├─ Connection pool usage
  │  ├─ Replication lag
  │  └─ Disk usage
  ├─ Infrastructure Metrics
  │  ├─ CPU usage (%)
  │  ├─ Memory usage (%)
  │  ├─ Disk usage (%)
  │  ├─ Network I/O
  │  └─ Instance health
  └─ Business Metrics
     ├─ User signups
     ├─ Active users
     ├─ Feature usage
     ├─ Subscription conversions
     └─ Revenue

LOGS (CloudWatch Logs + Sentry):
  ├─ Application Logs
  │  ├─ Request logs (method, path, status, duration)
  │  ├─ Error logs (stack trace, context)
  │  ├─ Business logs (user actions)
  │  └─ Audit logs (admin actions)
  ├─ Database Logs
  │  ├─ Slow query logs
  │  ├─ Error logs
  │  └─ Connection logs
  ├─ Infrastructure Logs
  │  ├─ ALB logs
  │  ├─ ECS logs
  │  └─ RDS logs
  └─ Security Logs
     ├─ Authentication logs
     ├─ Authorization logs
     └─ API access logs

TRACES (DataDog APM):
  ├─ Request tracing
  │  ├─ Entry point: HTTP request
  │  ├─ Database queries
  │  ├─ External API calls
  │  └─ Exit point: HTTP response
  ├─ Distributed tracing
  │  ├─ Trace ID propagation
  │  ├─ Span relationships
  │  └─ Service dependencies
  └─ Performance analysis
     ├─ Bottleneck identification
     ├─ Latency breakdown
     └─ Resource utilization

ALERTS (CloudWatch + PagerDuty):
  ├─ Critical Alerts (Page on-call)
  │  ├─ Error rate > 1%
  │  ├─ Response time > 1s (p95)
  │  ├─ Database CPU > 90%
  │  ├─ Disk usage > 90%
  │  └─ Replication lag > 10s
  ├─ Warning Alerts (Slack notification)
  │  ├─ Error rate > 0.5%
  │  ├─ Response time > 500ms (p95)
  │  ├─ Database CPU > 75%
  │  ├─ Disk usage > 80%
  │  └─ Memory usage > 85%
  └─ Info Alerts (Dashboard only)
     ├─ Deployment completed
     ├─ Backup completed
     └─ Scaling event
```

---

## Security Architecture Deep Dive

### Network Security

```
┌─────────────────────────────────────────────────────────────────┐
│                    NETWORK SECURITY                             │
└─────────────────────────────────────────────────────────────────┘

VPC ARCHITECTURE:
  ├─ VPC CIDR: 10.0.0.0/16
  ├─ Public Subnets (2 AZs)
  │  ├─ us-east-1a: 10.0.1.0/24
  │  └─ us-east-1b: 10.0.2.0/24
  │  └─ Resources: ALB, NAT Gateway
  ├─ Private Subnets (2 AZs)
  │  ├─ us-east-1a: 10.0.10.0/24
  │  └─ us-east-1b: 10.0.11.0/24
  │  └─ Resources: ECS, RDS, ElastiCache
  └─ Database Subnets (2 AZs)
     ├─ us-east-1a: 10.0.20.0/24
     └─ us-east-1b: 10.0.21.0/24
     └─ Resources: RDS (Multi-AZ)

SECURITY GROUPS:
  ├─ ALB Security Group
  │  ├─ Inbound: 80 (HTTP), 443 (HTTPS) from 0.0.0.0/0
  │  └─ Outbound: All to ECS security group
  ├─ ECS Security Group
  │  ├─ Inbound: 3000 from ALB security group
  │  ├─ Inbound: 22 (SSH) from bastion security group
  │  └─ Outbound: All (for external APIs)
  ├─ RDS Security Group
  │  ├─ Inbound: 5432 from ECS security group
  │  └─ Outbound: None
  ├─ ElastiCache Security Group
  │  ├─ Inbound: 6379 from ECS security group
  │  └─ Outbound: None
  └─ Bastion Security Group
     ├─ Inbound: 22 from office IP
     └─ Outbound: 22 to ECS security group

NETWORK ACLs:
  ├─ Public Subnet NACL
  │  ├─ Inbound: 80, 443 from 0.0.0.0/0
  │  ├─ Inbound: 1024-65535 (ephemeral) from 0.0.0.0/0
  │  └─ Outbound: All
  └─ Private Subnet NACL
     ├─ Inbound: All from VPC CIDR
     ├─ Inbound: 1024-65535 (ephemeral) from 0.0.0.0/0
     └─ Outbound: All

WAF (Web Application Firewall):
  ├─ Rate limiting
  │  ├─ 2000 requests/5 minutes per IP
  │  └─ Action: Block
  ├─ SQL injection protection
  │  ├─ Detect SQL patterns
  │  └─ Action: Block
  ├─ XSS protection
  │  ├─ Detect script patterns
  │  └─ Action: Block
  ├─ Geo-blocking
  │  ├─ Allow: US, CA, UK, EU
  │  └─ Block: All others
  └─ Bot protection
     ├─ Detect bot patterns
     └─ Action: Challenge (CAPTCHA)
```

---

**Document Status**: Complete Enhancement
**Complements**: ARCHITECTURE.md (1746 lines)
**Total Documentation**: 2,500+ lines across both files
