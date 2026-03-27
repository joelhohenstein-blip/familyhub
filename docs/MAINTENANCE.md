# Maintenance & Support Documentation

## Overview

This document covers the maintenance procedures, health monitoring, error logging, and alerting systems for the Family Hub application.

## Table of Contents

1. [Health Check Procedures](#health-check-procedures)
2. [Error Logging & Investigation](#error-logging--investigation)
3. [Alert Management](#alert-management)
4. [Common Incident Scenarios](#common-incident-scenarios)
5. [Dashboard Access](#dashboard-access)

## Health Check Procedures

### Components Monitored

The system monitors three main components:

1. **Database** - PostgreSQL connectivity and performance
2. **External Services** - Third-party API integrations
3. **Memory** - Application memory usage and heap size

### Health Check Execution

Health checks are performed automatically:

```bash
# Manual health check via tRPC API
POST /trpc/maintenance.health.status
```

### Health Status Levels

- **Healthy** 🟢 - All systems operating normally
- **Degraded** 🟡 - Some issues detected but system is functional
  - Memory usage between 70-90% of heap limit
  - Some external services experiencing delays
- **Unhealthy** 🔴 - Critical issues requiring immediate attention
  - Database connectivity failure
  - Memory usage exceeding 90% of heap limit
  - Multiple external services unavailable

### Response Times

Expected component response times:

| Component | Normal | Warning | Critical |
|-----------|--------|---------|----------|
| Database  | <100ms | 100-500ms | >500ms |
| Memory    | <70%   | 70-90%  | >90%     |
| External  | <1000ms | 1-3s | >3s |

## Error Logging & Investigation

### Error Log Storage

Errors are persisted to the `error_logs` table with the following fields:

- `id` - Unique identifier
- `timestamp` - When the error occurred
- `level` - error, warn, or info
- `message` - Error description
- `stack` - Stack trace
- `json_payload` - Additional JSON data
- `service` - Which service generated the error
- `env` - Environment (development, staging, production)
- `metadata` - Custom metadata

### Error Levels

- **error** - Application errors requiring investigation
- **warn** - Non-critical issues or deprecation warnings
- **info** - Informational messages for debugging

### Accessing Error Logs

#### Via Admin Dashboard

Navigate to `/admin/maintenance` to view the error log viewer:

1. Filter by level (error, warn, info)
2. Search by service
3. Select an error to view full details including stack trace
4. Review metadata and JSON payload

#### Via tRPC API

```typescript
// Get recent errors
const errors = await trpc.maintenance.errors.list.query({
  level: 'error',
  service: 'api',
  limit: 50,
  offset: 0
});

// Get error summary
const summary = await trpc.maintenance.errors.summary.query({
  timeWindowMinutes: 60
});
```

### Error Investigation Steps

1. **Identify the pattern** - Are errors clustered by time, service, or type?
2. **Check the stack trace** - Look for the root cause in the trace
3. **Review metadata** - Check request IDs, user context, and payload
4. **Cross-reference logs** - Check application logs for context
5. **Document findings** - Add notes to incident tracking system

## Alert Management

### Active Alerts

Active, unacknowledged alerts are displayed on the maintenance dashboard.

### Acknowledging Alerts

```typescript
// Acknowledge an alert
await trpc.maintenance.alerts.acknowledge.mutate({
  alertId: 'alert-123'
});
```

### Alert Types

- **Error Rate Spike** - Error rate exceeds threshold (default: 5% in 5 minutes)
- **Memory Warning** - Heap usage exceeds 70%
- **Memory Critical** - Heap usage exceeds 90%
- **Service Degradation** - Component health status changed to degraded
- **Service Unavailable** - Component health status changed to unhealthy

### Alert Escalation

1. **Low Priority** (Warnings)
   - Logged to error_logs table
   - Visible in dashboard
   - No immediate notification

2. **Medium Priority** (Degraded)
   - In-app alert
   - Email notification (configurable)
   - 1-hour response SLA

3. **High Priority** (Unhealthy)
   - Immediate email/webhook notification
   - In-app alert with high visibility
   - 15-minute response SLA
   - Page on-call engineer if SLA approaching

## Common Incident Scenarios

### Scenario 1: High Error Rate

**Symptoms:**
- Error count spike visible on dashboard
- Error rate alert triggered

**Investigation:**
```sql
-- Check error distribution
SELECT level, service, COUNT(*) as count 
FROM error_logs 
WHERE timestamp > now() - interval '1 hour'
GROUP BY level, service
ORDER BY count DESC;

-- Check for error patterns
SELECT message, COUNT(*) as count
FROM error_logs
WHERE timestamp > now() - interval '1 hour'
AND level = 'error'
GROUP BY message
ORDER BY count DESC
LIMIT 10;
```

**Resolution:**
1. Identify the service generating errors
2. Check if recent deployment introduced issues
3. Review the error messages and stack traces
4. Roll back deployment if necessary
5. Document findings in incident log

### Scenario 2: Memory Leak

**Symptoms:**
- Memory usage gradually increasing
- Degraded alert for memory component
- Eventually leads to unhealthy status

**Investigation:**
```bash
# Check current memory usage
node -e "console.log(process.memoryUsage())"

# Monitor memory over time
watch -n 1 'node -e "console.log(process.memoryUsage())"'
```

**Resolution:**
1. Review recent code changes
2. Check for uncleared timers or intervals
3. Look for event listener leaks
4. Consider restarting the application
5. Enable heap snapshots for detailed analysis

### Scenario 3: Database Connection Failure

**Symptoms:**
- Database component shows unhealthy status
- Database-related errors in error_logs
- Application functionality impaired

**Investigation:**
```bash
# Test database connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"

# Check connection pool status
# Review application logs for connection errors
```

**Resolution:**
1. Verify database credentials in environment variables
2. Check network connectivity to database host
3. Verify database is running and accepting connections
4. Check connection pool configuration
5. Restart application if connection recovered

### Scenario 4: External Service Degradation

**Symptoms:**
- External services component shows degraded status
- Timeouts in error logs for API calls
- Specific features become slow or unreliable

**Investigation:**
1. Check status page of external service provider
2. Review API rate limiting statistics
3. Check network connectivity
4. Review error logs for timeout details

**Resolution:**
1. Implement retry logic if not present
2. Add circuit breaker pattern for cascading failures
3. Cache responses when possible
4. Contact service provider if outage confirmed
5. Implement fallback behavior if available

## Dashboard Access

### URL

```
http://localhost:3000/admin/maintenance
```

### Features

- **Real-time Health Status** - Overall and per-component status
- **Error Log Viewer** - Browse and search error logs
- **Alert Management** - View and acknowledge active alerts
- **Metrics Summary** - Error rate, uptime, active alerts
- **Auto-refresh** - Toggle automatic data refresh (default: 10 seconds)

### Permissions

Access to the maintenance dashboard requires:
- Authenticated user
- Admin role

## Maintenance Windows

### Scheduled Maintenance

- **Weekly Backups** - Sundays 2:00 AM UTC
- **Dependency Updates** - First Tuesday of each month
- **Security Patches** - As needed, prioritized by severity

### Communication

1. Notify users 24 hours before maintenance window
2. Display maintenance banner on application
3. Reduce external traffic during window
4. Monitor closely for issues during and after maintenance

## Best Practices

1. **Monitor regularly** - Check dashboard at least once daily
2. **Acknowledge alerts** - Don't ignore warnings; investigate promptly
3. **Document incidents** - Keep incident log with resolution steps
4. **Review trends** - Weekly review of error patterns
5. **Test procedures** - Monthly test of disaster recovery procedures
6. **Update runbooks** - Keep documentation current with system changes

## Support & Escalation

For incidents:

1. **Severity 1** (System Down) - Page on-call engineer immediately
2. **Severity 2** (Partial Outage) - Contact engineering lead within 30 min
3. **Severity 3** (Degraded) - Schedule investigation within 4 hours
4. **Severity 4** (Minor Issue) - Include in next maintenance window

## Related Documents

- [RUNBOOKS.md](./RUNBOOKS.md) - Operational procedures
- [SECURITY-PATCHES.md](./SECURITY-PATCHES.md) - Security update procedures
