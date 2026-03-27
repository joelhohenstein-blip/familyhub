# Operational Runbooks

Quick reference guides for common operational tasks and incident responses.

## Table of Contents

1. [Handling High Error Rates](#handling-high-error-rates)
2. [Service Degradation Response](#service-degradation-response)
3. [Database Connection Failures](#database-connection-failures)
4. [WebSocket Disconnections](#websocket-disconnections)
5. [Memory/CPU Spikes](#memorycpu-spikes)
6. [Deployment Incidents](#deployment-incidents)
7. [Rollback Procedures](#rollback-procedures)

## Handling High Error Rates

### Definition
Error rate > 5% in any 5-minute window

### Initial Response (0-5 minutes)

1. **Acknowledge the alert**
   ```bash
   # Go to /admin/maintenance dashboard
   # Click "Acknowledge" on the error rate alert
   ```

2. **Assess severity**
   ```bash
   # Check error distribution
   curl -X GET http://localhost:3000/trpc/maintenance.errors.summary
   ```

3. **Identify pattern**
   - All errors the same message? → Single issue
   - Distributed across services? → System-wide issue
   - Clustered to one service? → Service-specific issue

### Investigation (5-15 minutes)

```bash
# Get recent error details
curl -X GET "http://localhost:3000/trpc/maintenance.errors.list?level=error"

# Check application logs
tail -f /var/log/familyhub/app.log | grep ERROR

# Monitor in real-time
watch -n 1 'curl -s http://localhost:3000/trpc/maintenance.metrics.summary | jq .errorRate'
```

### Resolution Steps

**If recent deployment:**
```bash
# Step 1: Check deployment status
git log --oneline -5

# Step 2: Review changes
git diff HEAD~1 HEAD

# Step 3: Rollback if needed (see Rollback Procedures)
git revert HEAD
npm run deploy
```

**If database issue:**
```bash
# Step 1: Check database connectivity
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"

# Step 2: Check query performance
# In psql:
SELECT query, calls, mean_time FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

# Step 3: Check locks
SELECT * FROM pg_locks WHERE NOT granted;
```

**If external service issue:**
```bash
# Step 1: Check external service status
curl -I https://api.external-service.com/health

# Step 2: Review rate limiting
curl -I https://api.external-service.com/health | grep RateLimit

# Step 3: Implement backoff
# Check AlertingService for retry configuration
```

### Escalation

- If error rate > 10%: Page on-call engineer
- If errors continue > 15 minutes: Consider rollback
- If unknown cause: Gather logs and escalate to engineering lead

---

## Service Degradation Response

### Definition
Component health status: degraded (70-90% utilization or slow responses)

### Immediate Actions (0-5 minutes)

1. **Acknowledge alert** in dashboard
2. **Check affected component** via health status panel
3. **Monitor trending** - Is it getting worse?

### Component-Specific Responses

**Memory Degradation (70-90%):**
```bash
# Step 1: Check current usage
node -e "console.log(process.memoryUsage())"

# Step 2: Identify leaks
node --inspect &
# Open chrome://inspect

# Step 3: Monitor closely
# If > 90%: Proceed to rollback/restart

# Step 4: Graceful restart
# Tell load balancer to stop sending traffic
# Wait for current requests to complete
# Restart service
systemctl restart familyhub
```

**Database Degradation (slow responses):**
```bash
# Step 1: Check query performance
psql -c "\timing on"
SELECT * FROM table WHERE condition; -- Should be < 100ms

# Step 2: Check for long-running queries
SELECT pid, query, query_start FROM pg_stat_activity 
WHERE state = 'active' ORDER BY query_start;

# Step 3: Kill problematic queries if needed
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE ...;

# Step 4: Analyze/vacuum if needed
ANALYZE table_name;
VACUUM ANALYZE table_name;
```

**External Service Degradation:**
```bash
# Step 1: Check latency to service
time curl https://api.service.com/ping

# Step 2: Check if we're being rate limited
curl -v https://api.service.com/health 2>&1 | grep Rate

# Step 3: Implement timeout
# Already in AlertingService - monitor response times

# Step 4: Consider circuit breaker
# Implement fallback if service unavailable
```

---

## Database Connection Failures

### Immediate Diagnosis

```bash
# Test connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"

# Check if database is running
ps aux | grep postgres

# Check firewall/network
nc -zv $DB_HOST 5432

# Check credentials
echo $DATABASE_URL
```

### Resolution

**If database is down:**
```bash
# Step 1: Attempt recovery
systemctl status postgresql
systemctl restart postgresql

# Step 2: Check logs
tail -f /var/log/postgresql/postgresql.log

# Step 3: If won't restart, check disk space
df -h /var/lib/postgresql

# Step 4: If low disk, delete old WAL files
rm /var/lib/postgresql/*/pg_wal/archive_status/*
```

**If network issue:**
```bash
# Trace route to database
traceroute $DB_HOST

# Check routing
netstat -rn | grep $DB_HOST

# Restart networking if needed
systemctl restart networking
```

**If connection pool exhausted:**
```bash
# Check current connections
psql -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Check connection pool settings
# In database.ts or connection config

# Increase pool size or timeout limits if needed
```

### Recovery Steps

1. Confirm connection restored: `psql -h $DB_HOST -U $DB_USER -c "SELECT 1"`
2. Check for data inconsistencies: `PRAGMA integrity_check;` or equivalent
3. Monitor error logs for cascading issues
4. Run health check: `GET /trpc/maintenance.health.status`
5. Verify application functionality

---

## WebSocket Disconnections

### Symptoms

- Real-time features not updating
- Chat messages not sending/receiving
- Video call participants not seeing updates

### Diagnosis

```bash
# Check WebSocket server status
systemctl status websocket-server

# Check port listening
netstat -tuln | grep LISTEN | grep 3001

# Check logs
tail -f /var/log/familyhub/websocket.log

# Test WebSocket connection
wscat -c ws://localhost:3001
```

### Common Issues & Solutions

**Issue: WebSocket server crashed**
```bash
# Restart
systemctl restart websocket-server

# Check for memory leaks
node --inspect /app/websocket-server.js
```

**Issue: Network proxy blocking WebSockets**
```bash
# Check nginx configuration
cat /etc/nginx/sites-available/familyhub | grep -A5 websocket

# Ensure these are present:
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

**Issue: High connection count**
```bash
# Check active connections
wc -l /proc/net/tcp

# Check per-process
lsof -p $(pgrep -f websocket-server) | grep -c TCP

# If too high, implement connection limits:
# In WebSocket server config: max_connections = 1000
```

### Recovery

1. Restart WebSocket server: `systemctl restart websocket-server`
2. Monitor connections: `watch -n 1 'wc -l /proc/net/tcp'`
3. Verify real-time features working
4. Review logs for root cause

---

## Memory/CPU Spikes

### Memory Spike Response

```bash
# Step 1: Check memory usage
free -h
top -b -n1 | head -20

# Step 2: Identify process
ps aux --sort=-%mem | head -5

# Step 3: Get process details
/proc/$(pgrep -f familyhub)/status | grep VmRSS

# Step 4: Check for leaks
node --inspect
# Chrome DevTools -> Memory -> Heap snapshots

# Step 5: If heap full and growing
# Gracefully shutdown and restart
kill -SIGTERM $(pgrep -f familyhub)
wait
systemctl restart familyhub
```

### CPU Spike Response

```bash
# Step 1: Check CPU usage
top -b -n1 | head -20

# Step 2: Check for runaway processes
ps aux --sort=-%cpu | head -5

# Step 3: Profile if needed
node --prof app.js
node --prof-process isolate-*.log > profile.txt

# Step 4: Check for busy loops
# Review recent code changes

# Step 5: Reduce load
# Tell load balancer to send traffic elsewhere
# Fix the issue
# Restore traffic
```

### Prevention

- Set memory limits in environment: `NODE_MAX_OLD_SPACE_SIZE=2048`
- Monitor trends over time
- Set alerts for > 80% utilization
- Regular profiling in dev environment

---

## Deployment Incidents

### Deployment Preparation

```bash
# Pre-deployment checklist
- [ ] Code reviewed and approved
- [ ] Tests passing (npm run test)
- [ ] Type checking passed (npm run typecheck)
- [ ] No breaking changes
- [ ] Migration scripts tested
- [ ] Rollback plan documented

# Create rollback tag
git tag -a rollback-$(date +%s) -m "Rollback point before deployment"
git push origin rollback-$(date +%s)
```

### Deployment Issues

**Issue: Application won't start**
```bash
# Check logs
systemctl status familyhub
journalctl -u familyhub -n 50

# Try starting manually for more details
node /app/server.js

# Check for syntax errors
npm run typecheck

# Check dependencies
npm ls

# Clear cache if needed
rm -rf node_modules package-lock.json
npm install
```

**Issue: Database migrations fail**
```bash
# Check migration status
npm run db:migrate:status

# Rollback migrations
npm run db:migrate:down

# Check migration files for issues
ls -la /app/migrations/

# Run migrations step by step
npm run db:migrate:up --step 1
```

**Issue: Performance degradation after deployment**
```bash
# Gather data
curl http://localhost:3000/trpc/maintenance.metrics.summary

# Compare with pre-deployment metrics
# Check for new slow queries
# Profile application

# If needed: Rollback
git revert HEAD
npm run build
systemctl restart familyhub
```

---

## Rollback Procedures

### Planned Rollback

```bash
# Step 1: Stop accepting new requests
# Update load balancer or firewall

# Step 2: Wait for current requests
sleep 30

# Step 3: Identify rollback point
git log --oneline | head -10

# Step 4: Revert to previous version
git revert HEAD
# or
git reset --hard HEAD~1

# Step 5: Rebuild and restart
npm install --production
npm run build
systemctl restart familyhub

# Step 6: Verify
curl http://localhost:3000/health
npm run test -- --run

# Step 7: Resume traffic
# Update load balancer to accept requests again
```

### Emergency Rollback

```bash
# When seconds matter:

# Quick rollback to known good version
git reset --hard origin/main
npm install --production
npm run build
systemctl restart familyhub

# Or use tagged version
git checkout rollback-1234567890
npm install --production
npm run build
systemctl restart familyhub

# Monitor after rollback
watch -n 1 'curl -s http://localhost:3000/trpc/maintenance.metrics.summary'
```

### Post-Rollback

1. Verify application is functioning
2. Check error logs for any issues
3. Document what went wrong
4. Plan remediation for next deployment
5. Review code changes and tests
6. Update deployment checklist if needed

---

## Contact & Escalation

- **On-Call Engineer**: Check on-call rotation
- **Engineering Lead**: For unclear issues
- **DevOps Team**: For infrastructure issues
- **Database Team**: For database-specific issues

## Related Documents

- [MAINTENANCE.md](./MAINTENANCE.md)
- [SECURITY-PATCHES.md](./SECURITY-PATCHES.md)
