# GCP Cost Optimization Guide

Strategies and best practices for optimizing costs on Google Cloud Platform.

## Table of Contents

1. [Cost Overview](#cost-overview)
2. [Cloud Run Optimization](#cloud-run-optimization)
3. [Cloud SQL Optimization](#cloud-sql-optimization)
4. [Cloud CDN Optimization](#cloud-cdn-optimization)
5. [Storage Optimization](#storage-optimization)
6. [Monitoring Costs](#monitoring-costs)
7. [Cost Reduction Strategies](#cost-reduction-strategies)
8. [Pricing Calculator](#pricing-calculator)

---

## Cost Overview

### Current Monthly Costs (Production)

```
Service                    | Size                      | Monthly Cost
---------------------------|---------------------------|-------------
Cloud Run                  | 1 vCPU, 1GB RAM, 1M req  | $30-50
Cloud SQL                  | db-f1-micro, 100GB       | $28
Cloud CDN                  | 100GB/month              | $12
Cloud DNS                  | 1 zone                   | $0.20
Cloud Storage              | 10GB                     | $0.20
---------------------------|---------------------------|-------------
TOTAL                      |                           | $70-90
```

### Cost Breakdown by Service

```
Cloud Run:     57% ($40)
Cloud SQL:     32% ($28)
Cloud CDN:     11% ($12)
Other:          0% ($0.20)
```

---

## Cloud Run Optimization

### 1. Right-Size Memory and CPU

```bash
# Current configuration
gcloud run services describe family-hub --region=us-central1 \
  --format='value(spec.template.spec.containers[0].resources.limits)'

# Analyze actual usage
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/memory_utilization" AND resource.labels.service_name="family-hub"' \
  --format='value(points[0].value.double_value)'

# If memory utilization < 50%, reduce allocation
gcloud run services update family-hub \
  --region=us-central1 \
  --memory=512Mi \
  --cpu=0.5

# Cost impact: Reduces monthly cost by ~$15-20
```

### 2. Optimize Auto-Scaling

```bash
# Current configuration
gcloud run services describe family-hub --region=us-central1 \
  --format='value(spec.template.metadata.annotations.autoscaling)'

# Set appropriate min/max instances
gcloud run services update family-hub \
  --region=us-central1 \
  --min-instances=1 \
  --max-instances=50 \
  --concurrency=80

# Cost impact: Prevents runaway scaling, saves $10-30/month
```

### 3. Optimize Request Concurrency

```bash
# Increase concurrency to reduce instances needed
gcloud run services update family-hub \
  --region=us-central1 \
  --concurrency=100

# Monitor instance count
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/instance_count" AND resource.labels.service_name="family-hub"'

# Cost impact: Reduces instances by 20-30%, saves $5-15/month
```

### 4. Use Cloud Run's Free Tier

```bash
# Cloud Run free tier includes:
# - 2,000,000 requests/month
# - 360,000 GB-seconds/month
# - 180,000 vCPU-seconds/month

# Monitor usage
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count" AND resource.labels.service_name="family-hub"'

# If under free tier limits, cost is $0
```

### 5. Optimize Container Image Size

```bash
# Check current image size
gcloud artifacts docker images describe \
  us-central1-docker.pkg.dev/PROJECT_ID/family-hub/family-hub:latest

# Reduce image size with multi-stage builds
cat > Dockerfile << 'EOF'
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN npm install -g bun && bun install --frozen-lockfile
COPY . .
RUN bun run build

# Production stage
FROM node:20-alpine
WORKDIR /app
RUN npm install -g bun
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["bun", "run", "start"]
EOF

# Build and check size
docker build -t family-hub:latest .
docker images family-hub:latest

# Cost impact: Smaller images = faster deployments, minimal cost savings
```

### 6. Use Preemptible Instances (if applicable)

```bash
# Note: Cloud Run doesn't support preemptible instances directly
# But you can use Compute Engine with preemptible VMs for non-critical workloads
# Cost savings: 60-70% reduction
```

---

## Cloud SQL Optimization

### 1. Right-Size Database Instance

```bash
# Current configuration
gcloud sql instances describe family-hub-db \
  --format='value(databaseVersion,settings.tier)'

# Analyze actual usage
gcloud monitoring time-series list \
  --filter='metric.type="cloudsql.googleapis.com/database/cpu/utilization" AND resource.labels.database_id="PROJECT_ID:family-hub-db"'

# If CPU < 20%, downgrade instance
gcloud sql instances patch family-hub-db \
  --tier=db-f1-micro

# Cost impact: Reduces monthly cost by ~$15-20
```

### 2. Optimize Storage

```bash
# Check current storage usage
gcloud sql instances describe family-hub-db \
  --format='value(currentDiskSize)'

# Enable automatic storage increase
gcloud sql instances patch family-hub-db \
  --storage-auto-increase \
  --storage-auto-increase-limit=500

# Monitor storage growth
gcloud monitoring time-series list \
  --filter='metric.type="cloudsql.googleapis.com/database/disk/utilization" AND resource.labels.database_id="PROJECT_ID:family-hub-db"'

# Cost impact: Prevents over-provisioning, saves $5-10/month
```

### 3. Use Shared-Core Instances for Development

```bash
# For development/staging, use db-f1-micro (shared-core)
# Cost: ~$10/month vs $50+/month for standard instances

# Create development instance
gcloud sql instances create family-hub-dev \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1

# Cost impact: Reduces dev/staging costs by 80%
```

### 4. Disable Unnecessary Features

```bash
# Disable binary logging if not needed
gcloud sql instances patch family-hub-db \
  --no-backup

# Disable HA replica for non-production
gcloud sql instances patch family-hub-db \
  --availability-type=ZONAL

# Cost impact: Saves $10-20/month
```

### 5. Optimize Backups

```bash
# Reduce backup retention
gcloud sql instances patch family-hub-db \
  --retained-backups-count=7

# Reduce transaction log retention
gcloud sql instances patch family-hub-db \
  --transaction-log-retention-days=3

# Cost impact: Saves $2-5/month
```

### 6. Use Read Replicas Strategically

```bash
# Only create read replicas if needed for scaling
# Cost: Additional $28/month per replica

# Monitor query patterns
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.query_type=SELECT" \
  --limit=1000 \
  --format=json | grep -c "query_type"

# If read queries < 30%, don't create replica
```

### 7. Connection Pooling

```bash
# Use Cloud SQL Proxy with connection pooling
# Reduces connection overhead and improves performance

# Install Cloud SQL Proxy
curl -o cloud-sql-proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64
chmod +x cloud-sql-proxy

# Run with connection pooling
./cloud-sql-proxy \
  --max-connections=20 \
  --port=5432 \
  PROJECT_ID:us-central1:family-hub-db

# Cost impact: Minimal, but improves performance
```

---

## Cloud CDN Optimization

### 1. Enable Caching

```bash
# Verify CDN is enabled
gcloud compute backend-services describe family-hub-backend \
  --global \
  --format='value(enableCdn)'

# If not enabled, enable it
gcloud compute backend-services update family-hub-backend \
  --global \
  --enable-cdn

# Cost impact: Reduces origin requests by 50-80%, saves $5-10/month
```

### 2. Optimize Cache TTL

```bash
# Set appropriate cache TTL
gcloud compute backend-services update family-hub-backend \
  --global \
  --default-ttl=3600 \
  --max-ttl=86400 \
  --client-ttl=3600

# Monitor cache hit ratio
gcloud compute backend-services get-health family-hub-backend --global

# Cost impact: Higher TTL = more cache hits = lower costs
```

### 3. Cache Static Assets

```bash
# Create separate backend for static assets
gcloud compute backend-services create family-hub-static \
  --protocol=HTTP \
  --global \
  --enable-cdn \
  --cache-mode=CACHE_ALL_STATIC \
  --default-ttl=86400 \
  --max-ttl=604800

# Add path rule for static assets
gcloud compute url-maps add-path-rule family-hub-lb \
  --service=family-hub-static \
  --path-rule="/static/*" \
  --new-path-rule

# Cost impact: Caches static assets for 7 days, saves $10-20/month
```

### 4. Compress Content

```bash
# Enable compression
gcloud compute backend-services update family-hub-backend \
  --global \
  --enable-compression

# Cost impact: Reduces bandwidth by 60-70%, saves $5-15/month
```

### 5. Monitor CDN Performance

```bash
# Check cache hit ratio
gcloud compute backend-services get-health family-hub-backend --global

# Monitor bandwidth usage
gcloud monitoring time-series list \
  --filter='metric.type="compute.googleapis.com/https/request_bytes_count"'

# Cost impact: Identify optimization opportunities
```

---

## Storage Optimization

### 1. Use Cloud Storage for Static Assets

```bash
# Create bucket for static assets
gsutil mb -l us-central1 gs://family-hub-static

# Upload static assets
gsutil -m cp -r public/* gs://family-hub-static/

# Set cache headers
gsutil -h "Cache-Control:public, max-age=86400" \
  -m cp -r public/* gs://family-hub-static/

# Cost impact: Cheaper than serving from Cloud Run, saves $5-10/month
```

### 2. Enable Lifecycle Policies

```bash
# Delete old backups after 30 days
cat > lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://family-hub-backups

# Cost impact: Reduces storage costs by 20-30%
```

### 3. Use Nearline Storage for Backups

```bash
# Create nearline bucket for backups
gsutil mb -c NEARLINE -l us-central1 gs://family-hub-backups-nearline

# Move old backups to nearline
gsutil -m mv gs://family-hub-backups/* gs://family-hub-backups-nearline/

# Cost impact: Reduces storage costs by 50%
```

---

## Monitoring Costs

### 1. Set Up Billing Alerts

```bash
# Create budget alert for $100/month
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Family Hub Monthly Budget" \
  --budget-amount=100 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100

# List budgets
gcloud billing budgets list --billing-account=BILLING_ACCOUNT_ID
```

### 2. Export Billing Data to BigQuery

```bash
# Create dataset
bq mk --dataset \
  --description="Billing data" \
  --location=US \
  billing_data

# Export billing data
bq query --use_legacy_sql=false << 'EOF'
SELECT
  service.description,
  SUM(cost) as total_cost,
  SUM(usage.amount) as total_usage,
  COUNT(*) as line_items
FROM
  `PROJECT_ID.billing_data.gcp_billing_export_v1_BILLING_ACCOUNT_ID`
WHERE
  DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY
  service.description
ORDER BY
  total_cost DESC
EOF
```

### 3. Create Cost Dashboard

```bash
# Create monitoring dashboard for costs
gcloud monitoring dashboards create --config-from-file=- << 'EOF'
{
  "displayName": "Family Hub Cost Dashboard",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Monthly Costs",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"billing.googleapis.com/billing_account_cost\""
              }
            }
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Cost by Service",
          "pieChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"billing.googleapis.com/service_cost\""
                  }
                }
              }
            ]
          }
        }
      }
    ]
  }
}
EOF
```

### 4. Monitor Resource Usage

```bash
# Cloud Run usage
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count" AND resource.labels.service_name="family-hub"'

# Cloud SQL usage
gcloud monitoring time-series list \
  --filter='metric.type="cloudsql.googleapis.com/database/cpu/utilization" AND resource.labels.database_id="PROJECT_ID:family-hub-db"'

# Cloud CDN usage
gcloud monitoring time-series list \
  --filter='metric.type="compute.googleapis.com/https/request_bytes_count"'
```

---

## Cost Reduction Strategies

### Strategy 1: Consolidate Services

**Current**: Separate dev, staging, prod environments
**Optimized**: Shared dev/staging environment

```bash
# Consolidate dev and staging
gcloud sql instances delete family-hub-staging-db
gcloud run services delete family-hub-staging --region=us-central1

# Cost savings: $40-60/month
```

### Strategy 2: Use Spot/Preemptible Resources

**Current**: Always-on instances
**Optimized**: Preemptible instances for non-critical workloads

```bash
# Use Compute Engine preemptible VMs for batch jobs
gcloud compute instances create batch-processor \
  --preemptible \
  --machine-type=n1-standard-1

# Cost savings: 60-70% reduction
```

### Strategy 3: Optimize Data Transfer

**Current**: All data transfer through internet
**Optimized**: Use VPC peering and private endpoints

```bash
# Use private Cloud SQL instance
gcloud sql instances patch family-hub-db \
  --network=default \
  --no-assign-ip

# Cost savings: Eliminates egress charges, saves $5-10/month
```

### Strategy 4: Use Committed Use Discounts

**Current**: Pay-as-you-go pricing
**Optimized**: 1-year or 3-year commitments

```bash
# Purchase 1-year commitment for Cloud Run
# Savings: 25% discount
# Cost: $30/month → $22.50/month

# Purchase 1-year commitment for Cloud SQL
# Savings: 25% discount
# Cost: $28/month → $21/month

# Total savings: ~$12/month
```

### Strategy 5: Optimize Database Queries

**Current**: Inefficient queries
**Optimized**: Indexed queries with query optimization

```bash
# Analyze slow queries
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.query_duration_ms>1000" \
  --limit=100

# Add indexes
gcloud sql connect family-hub-db --user=admin --database=family_hub << 'EOF'
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_donations_user_id ON donations(user_id);
CREATE INDEX idx_events_date ON events(event_date);
EOF

# Cost savings: Reduces query time, improves performance
```

---

## Pricing Calculator

### Monthly Cost Estimation

```bash
# Cloud Run
# Requests: 1,000,000/month
# Memory: 1GB
# CPU: 1 vCPU
# Cost: (1,000,000 - 2,000,000 free) * $0.00002400 = $0
#       (1GB * 3,600 seconds * 1,000,000 requests / 1,000,000) * $0.0000050 = $18
# Total: $18/month (within free tier)

# Cloud SQL
# Instance: db-f1-micro
# Storage: 100GB
# Backups: 30 days
# Cost: $10 (instance) + $18 (storage) = $28/month

# Cloud CDN
# Bandwidth: 100GB/month
# Cost: 100GB * $0.12 = $12/month

# Cloud DNS
# Zones: 1
# Queries: 1,000,000/month
# Cost: $0.20 (zone) + $0.40 (queries) = $0.60/month

# Total: $18 + $28 + $12 + $0.60 = $58.60/month
```

### Cost Optimization Opportunities

| Optimization | Current | Optimized | Savings |
|--------------|---------|-----------|---------|
| Cloud Run memory | 1GB | 512MB | $10 |
| Cloud SQL tier | db-f1-micro | db-f1-micro | $0 |
| Cloud CDN caching | 50% hit rate | 80% hit rate | $5 |
| Storage optimization | 100GB | 50GB | $5 |
| Committed discounts | None | 1-year | $12 |
| **Total Savings** | | | **$32/month** |

### Optimized Monthly Costs

```
Service                    | Optimized Cost
---------------------------|---------------
Cloud Run                  | $8
Cloud SQL                  | $18
Cloud CDN                  | $7
Cloud DNS                  | $0.60
Cloud Storage              | $0.10
Committed Discounts        | -$12
---------------------------|---------------
TOTAL                      | $21.70/month
```

---

## Best Practices

1. **Monitor costs regularly**: Review costs weekly
2. **Set budgets and alerts**: Get notified when approaching limits
3. **Right-size resources**: Use actual usage data to optimize
4. **Use free tiers**: Maximize free tier usage
5. **Consolidate services**: Reduce number of instances
6. **Cache aggressively**: Use CDN and application caching
7. **Optimize queries**: Reduce database load
8. **Archive old data**: Move to cheaper storage tiers
9. **Use committed discounts**: For predictable workloads
10. **Automate optimization**: Use scripts to manage resources

---

## Tools & Resources

### GCP Tools
- [GCP Pricing Calculator](https://cloud.google.com/products/calculator)
- [Cloud Billing Console](https://console.cloud.google.com/billing)
- [Cost Management Tools](https://cloud.google.com/cost-management)

### Third-Party Tools
- [CloudHealth by VMware](https://www.cloudhealthtech.com/)
- [Cloudability](https://www.cloudability.com/)
- [Densify](https://www.densify.com/)

### Documentation
- [GCP Pricing](https://cloud.google.com/pricing)
- [Cost Optimization Guide](https://cloud.google.com/architecture/best-practices-for-running-cost-effective-kubernetes-applications-on-gke)

---

## Quarterly Cost Review

### Q1 Review Template

```markdown
## Q1 Cost Review

### Actual Costs
- Cloud Run: $XX
- Cloud SQL: $XX
- Cloud CDN: $XX
- Other: $XX
- **Total: $XX**

### Budget vs Actual
- Budget: $100/month
- Actual: $XX/month
- Variance: $XX

### Optimizations Implemented
- [ ] Memory optimization
- [ ] Storage optimization
- [ ] Cache optimization
- [ ] Query optimization

### Recommendations for Q2
- ...
- ...
- ...

### Approved By
- DevOps Lead: ___________
- Finance: ___________
```

---

**Last Updated**: January 2024
**Review Frequency**: Quarterly
**Next Review**: April 2024
