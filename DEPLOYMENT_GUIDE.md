# 🚀 FamilyHub Deployment & Operations Guide

**Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: Production Ready

---

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Local Development](#local-development)
3. [Staging Deployment](#staging-deployment)
4. [Production Deployment](#production-deployment)
5. [Monitoring & Alerting](#monitoring--alerting)
6. [Troubleshooting](#troubleshooting)
7. [Rollback Procedures](#rollback-procedures)
8. [Scaling & Performance](#scaling--performance)

---

## Environment Setup

### Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Authentication (Clerk)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/familyhub

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI
OPENAI_API_KEY=sk-...

# Google Vision API
GOOGLE_VISION_API_KEY=...

# Pusher (Real-time)
VITE_PUSHER_APP_KEY=...
PUSHER_APP_ID=...
PUSHER_SECRET=...
PUSHER_CLUSTER=mt1

# Email (SendGrid or Resend)
SENDGRID_API_KEY=SG....
# OR
RESEND_API_KEY=re_...

# S3 / Cloud Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=familyhub-media

# Jitsi (Video Calls)
VITE_JITSI_DOMAIN=meet.jitsi.org
VITE_JITSI_ROOM_NAME=familyhub

# Session & Security
SESSION_SECRET=your-random-secret-key-here
JWT_SECRET=your-jwt-secret-key-here

# App Configuration
VITE_APP_URL=http://localhost:3000
VITE_API_URL=http://localhost:3000/api
NODE_ENV=development
```

### Production Environment Variables

For production, use a secure secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.):

```bash
# Same as above, but with production values
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
DATABASE_URL=postgresql://prod-user:prod-password@prod-db.example.com:5432/familyhub
# ... etc
```

---

## Local Development

### Prerequisites

- **Node.js**: 18.x or higher
- **Bun**: Latest version (package manager)
- **PostgreSQL**: 14.x or higher
- **Docker** (optional, for containerized development)

### Setup Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-org/familyhub.git
cd familyhub

# 2. Install dependencies
bun install

# 3. Setup environment variables
cp .env.example .env.local
# Edit .env.local with your local values

# 4. Setup database
bun run db:push

# 5. Seed database (optional)
bun run db:seed

# 6. Start dev server
bun run dev
```

The app will be available at `http://localhost:3000`.

### Development Commands

```bash
# Start dev server with HMR
bun run dev

# Build for production
bun run build

# Run tests
bun test

# Run type checking
bun run typecheck

# Format code
bun run format

# Lint code
bun run lint

# Database migrations
bun run db:push          # Apply pending migrations
bun run db:pull          # Pull schema from database
bun run db:generate      # Generate types from schema
bun run db:studio        # Open Drizzle Studio

# Database seeding
bun run db:seed
```

---

## Staging Deployment

### Prerequisites

- Staging server (AWS EC2, DigitalOcean, Heroku, etc.)
- PostgreSQL database
- Docker & Docker Compose (recommended)

### Deployment Steps

#### Option 1: Docker Compose

```bash
# 1. Build Docker image
docker build -t familyhub:staging .

# 2. Push to registry (if using private registry)
docker tag familyhub:staging your-registry/familyhub:staging
docker push your-registry/familyhub:staging

# 3. Deploy using docker-compose
docker-compose -f docker-compose.staging.yml up -d

# 4. Run migrations
docker-compose -f docker-compose.staging.yml exec app bun run db:push

# 5. Verify deployment
curl https://staging.familyhub.app/health
```

#### Option 2: Manual Deployment

```bash
# 1. SSH into staging server
ssh ubuntu@staging.familyhub.app

# 2. Clone repository
git clone https://github.com/your-org/familyhub.git
cd familyhub

# 3. Install dependencies
bun install

# 4. Setup environment variables
nano .env.production

# 5. Build application
bun run build

# 6. Run migrations
bun run db:push

# 7. Start application (using PM2 or systemd)
pm2 start "bun run start" --name familyhub
# OR
systemctl start familyhub
```

### Staging Verification

```bash
# Check application health
curl https://staging.familyhub.app/health

# Check database connection
curl https://staging.familyhub.app/api/health/db

# Run smoke tests
bun test:smoke

# Check logs
pm2 logs familyhub
# OR
journalctl -u familyhub -f
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] Database backups created
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Incident response team briefed

### Deployment Steps

#### Step 1: Create Database Backup

```bash
# Backup production database
pg_dump -h prod-db.example.com -U postgres familyhub > backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup
ls -lh backup-*.sql
```

#### Step 2: Build & Push Docker Image

```bash
# Build image
docker build -t familyhub:v1.0.0 .

# Tag for registry
docker tag familyhub:v1.0.0 your-registry/familyhub:v1.0.0
docker tag familyhub:v1.0.0 your-registry/familyhub:latest

# Push to registry
docker push your-registry/familyhub:v1.0.0
docker push your-registry/familyhub:latest
```

#### Step 3: Deploy to Production

```bash
# Using Kubernetes
kubectl set image deployment/familyhub \
  familyhub=your-registry/familyhub:v1.0.0 \
  --record

# Verify rollout
kubectl rollout status deployment/familyhub

# OR using Docker Compose
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

#### Step 4: Run Migrations

```bash
# Run database migrations
kubectl exec -it deployment/familyhub -- bun run db:push

# Verify migrations
kubectl exec -it deployment/familyhub -- bun run db:status
```

#### Step 5: Verify Deployment

```bash
# Check application health
curl https://familyhub.app/health

# Check database
curl https://familyhub.app/api/health/db

# Check real-time (Pusher)
curl https://familyhub.app/api/health/pusher

# Check payment processing (Stripe)
curl https://familyhub.app/api/health/stripe

# Monitor logs
kubectl logs -f deployment/familyhub
```

### Post-Deployment Monitoring

```bash
# Monitor error rates
kubectl logs deployment/familyhub | grep ERROR | wc -l

# Monitor response times
kubectl logs deployment/familyhub | grep "response_time"

# Check resource usage
kubectl top pods -l app=familyhub

# Monitor database connections
psql -h prod-db.example.com -U postgres -d familyhub \
  -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## Monitoring & Alerting

### Key Metrics to Monitor

#### Application Metrics
- **Error Rate**: Target <0.1%
- **Response Time**: Target <200ms (p95)
- **Requests Per Second**: Monitor for spikes
- **Active Users**: Real-time count
- **API Latency**: By endpoint

#### Database Metrics
- **Query Time**: Target <50ms (p95)
- **Connection Pool**: Monitor utilization
- **Disk Space**: Alert at 80% usage
- **Replication Lag**: Target <1s
- **Slow Queries**: Log and analyze

#### Infrastructure Metrics
- **CPU Usage**: Alert at 80%
- **Memory Usage**: Alert at 85%
- **Disk I/O**: Monitor for bottlenecks
- **Network Bandwidth**: Monitor for spikes
- **Uptime**: Target 99.9%+

### Monitoring Setup

#### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'familyhub'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/metrics'
```

#### Grafana Dashboards

Create dashboards for:
- Application Performance
- Database Performance
- Infrastructure Health
- User Activity
- Error Tracking

#### Alert Rules

```yaml
# alerts.yml
groups:
  - name: familyhub
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.001
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.2
        for: 5m
        annotations:
          summary: "High response time detected"

      - alert: DatabaseDown
        expr: pg_up == 0
        for: 1m
        annotations:
          summary: "Database is down"
```

### Alerting Channels

- **Email**: Critical alerts
- **Slack**: All alerts
- **PagerDuty**: Critical + on-call escalation
- **SMS**: Critical + business hours

---

## Troubleshooting

### Common Issues

#### Application Won't Start

```bash
# Check logs
kubectl logs deployment/familyhub

# Check environment variables
kubectl get configmap familyhub-config -o yaml

# Check secrets
kubectl get secret familyhub-secrets -o yaml

# Verify database connection
kubectl exec -it deployment/familyhub -- \
  psql $DATABASE_URL -c "SELECT 1"
```

#### High Error Rate

```bash
# Check error logs
kubectl logs deployment/familyhub | grep ERROR

# Check database performance
psql -h prod-db.example.com -U postgres -d familyhub \
  -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check API response times
kubectl logs deployment/familyhub | grep "response_time" | sort -t= -k2 -rn | head -10
```

#### Database Connection Issues

```bash
# Check connection pool
psql -h prod-db.example.com -U postgres -d familyhub \
  -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Check for long-running queries
psql -h prod-db.example.com -U postgres -d familyhub \
  -c "SELECT pid, usename, application_name, state, query_start FROM pg_stat_activity WHERE state != 'idle';"

# Kill long-running query
psql -h prod-db.example.com -U postgres -d familyhub \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid != pg_backend_pid() AND query_start < now() - interval '1 hour';"
```

#### Real-time Features Not Working

```bash
# Check Pusher connection
curl -X POST https://api.pusher.com/apps/$PUSHER_APP_ID/channels/test-channel/events \
  -H "Content-Type: application/json" \
  -d '{"name":"test","channels":["test-channel"],"data":"{\"message\":\"hello\"}"}'

# Check WebSocket connection
wscat -c wss://familyhub.app/ws

# Monitor Pusher logs
kubectl logs deployment/familyhub | grep pusher
```

#### Payment Processing Issues

```bash
# Check Stripe webhook logs
curl https://dashboard.stripe.com/webhooks

# Verify webhook secret
echo $STRIPE_WEBHOOK_SECRET

# Test webhook
curl -X POST https://familyhub.app/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=...,v1=..." \
  -d '{"type":"payment_intent.succeeded",...}'
```

---

## Rollback Procedures

### Quick Rollback (Last 5 Minutes)

```bash
# Using Kubernetes
kubectl rollout undo deployment/familyhub

# Verify rollback
kubectl rollout status deployment/familyhub
```

### Full Rollback (Database Included)

```bash
# 1. Stop current deployment
kubectl scale deployment familyhub --replicas=0

# 2. Restore database from backup
psql -h prod-db.example.com -U postgres familyhub < backup-YYYYMMDD-HHMMSS.sql

# 3. Rollback to previous version
kubectl set image deployment/familyhub \
  familyhub=your-registry/familyhub:v0.9.0

# 4. Scale back up
kubectl scale deployment familyhub --replicas=3

# 5. Verify
curl https://familyhub.app/health
```

### Partial Rollback (Canary)

```bash
# Deploy to 10% of traffic
kubectl set image deployment/familyhub-canary \
  familyhub=your-registry/familyhub:v1.0.0

# Monitor error rate
kubectl logs deployment/familyhub-canary | grep ERROR

# If OK, roll out to 100%
kubectl set image deployment/familyhub \
  familyhub=your-registry/familyhub:v1.0.0

# If not OK, rollback
kubectl rollout undo deployment/familyhub-canary
```

---

## Scaling & Performance

### Horizontal Scaling

```bash
# Scale application replicas
kubectl scale deployment familyhub --replicas=5

# Monitor scaling
kubectl get pods -l app=familyhub

# Check load balancing
kubectl get svc familyhub -o yaml
```

### Database Scaling

```bash
# Enable read replicas
# (Configure in your cloud provider's console)

# Monitor replication lag
psql -h prod-db.example.com -U postgres -d familyhub \
  -c "SELECT slot_name, restart_lsn, confirmed_flush_lsn FROM pg_replication_slots;"

# Optimize slow queries
EXPLAIN ANALYZE SELECT * FROM messages WHERE family_id = 1 ORDER BY created_at DESC LIMIT 10;

# Add indexes
CREATE INDEX idx_messages_family_created ON messages(family_id, created_at DESC);
```

### Caching Strategy

```bash
# Redis caching for frequently accessed data
# Configure in application code

# Cache invalidation on updates
# Implement cache-busting strategy

# Monitor cache hit rate
redis-cli INFO stats | grep hits
```

### CDN Configuration

```bash
# Configure CloudFront / Cloudflare for static assets
# Set cache headers in application

# Monitor CDN performance
# Check cache hit ratio in CDN dashboard
```

---

## Maintenance Windows

### Scheduled Maintenance

```bash
# 1. Announce maintenance window
# 2. Set maintenance mode
kubectl set env deployment/familyhub MAINTENANCE_MODE=true

# 3. Run maintenance tasks
kubectl exec -it deployment/familyhub -- bun run db:optimize
kubectl exec -it deployment/familyhub -- bun run cache:clear

# 4. Disable maintenance mode
kubectl set env deployment/familyhub MAINTENANCE_MODE=false

# 5. Verify
curl https://familyhub.app/health
```

### Database Maintenance

```bash
# Vacuum and analyze
psql -h prod-db.example.com -U postgres -d familyhub -c "VACUUM ANALYZE;"

# Reindex
psql -h prod-db.example.com -U postgres -d familyhub -c "REINDEX DATABASE familyhub;"

# Check table sizes
psql -h prod-db.example.com -U postgres -d familyhub \
  -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

## Security Checklist

- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Setup DDoS protection
- [ ] Enable audit logging
- [ ] Rotate secrets regularly
- [ ] Enable database encryption
- [ ] Setup VPN for admin access
- [ ] Enable 2FA for all admin accounts
- [ ] Regular security audits

---

## Support & Escalation

**On-Call Engineer**: Check PagerDuty schedule  
**Escalation**: Slack #familyhub-incidents  
**Status Page**: status.familyhub.app

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Next Review**: 2024 (Quarterly)
