# AWS Performance Tuning Guide

Performance optimization strategies for Family Hub on AWS.

## Database Performance

### RDS Optimization

```bash
# Enable Performance Insights
aws rds modify-db-instance \
  --db-instance-identifier family-hub-db \
  --enable-performance-insights \
  --performance-insights-retention-period 7

# Check slow queries
aws logs tail /aws/rds/instance/family-hub-db/postgresql --follow

# Analyze query performance
psql -h <RDS_ENDPOINT> -U admin -d family_hub << 'SQL'
EXPLAIN ANALYZE SELECT * FROM messages WHERE user_id = 1;
SQL

# Create indexes
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_donations_user_id ON donations(user_id);
```

### Connection Pooling

```bash
# Use PgBouncer for connection pooling
docker run -d \
  --name pgbouncer \
  -e DATABASES_HOST=<RDS_ENDPOINT> \
  -e DATABASES_PORT=5432 \
  -e DATABASES_USER=admin \
  -e DATABASES_PASSWORD=<PASSWORD> \
  -p 6432:6432 \
  pgbouncer:latest
```

## ECS Performance

### Task Configuration

```bash
# Optimize CPU and memory
aws ecs update-service \
  --cluster family-hub-cluster \
  --service family-hub-service \
  --task-definition family-hub:latest \
  --deployment-configuration maximumPercent=200,minimumHealthyPercent=100
```

### Container Optimization

```dockerfile
# Multi-stage build for smaller images
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## CloudFront Caching

### Cache Optimization

```bash
# Set cache headers
aws cloudfront create-invalidation \
  --distribution-id E1234EXAMPLE \
  --paths "/*"

# Configure cache behaviors
# Static assets: 1 year TTL
# API endpoints: 0 TTL (no cache)
# HTML: 5 minutes TTL
```

## Monitoring Performance

```bash
# CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=family-hub-service \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

---

**Last Updated**: 2024-03-22