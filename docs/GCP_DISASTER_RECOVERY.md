# GCP Disaster Recovery Plan

Comprehensive disaster recovery procedures for Family Hub on Google Cloud Platform.

## Table of Contents

1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [Recovery Procedures](#recovery-procedures)
4. [Failover Procedures](#failover-procedures)
5. [Testing & Validation](#testing--validation)
6. [Runbooks](#runbooks)
7. [Contact Information](#contact-information)

---

## Overview

### RTO/RPO Targets

| Metric | Target | Current |
|--------|--------|---------|
| **RTO** (Recovery Time Objective) | < 1 hour | < 30 minutes |
| **RPO** (Recovery Point Objective) | < 1 hour | < 15 minutes |
| **Backup Frequency** | Daily | Every 6 hours |
| **Retention Period** | 30 days | 30 days |

### Disaster Scenarios

1. **Cloud Run Service Failure** - Application crashes or becomes unresponsive
2. **Database Failure** - Cloud SQL instance becomes unavailable
3. **Data Corruption** - Accidental data deletion or corruption
4. **Regional Outage** - Entire GCP region becomes unavailable
5. **Security Breach** - Unauthorized access or data compromise
6. **DNS Failure** - Domain name resolution fails

---

## Backup Strategy

### 1. Cloud SQL Backups

#### Automated Backups

```bash
# Verify automated backup configuration
gcloud sql instances describe family-hub-db \
  --format='value(settings.backupConfiguration)'

# Expected output:
# backupConfiguration:
#   binaryLogEnabled: true
#   enabled: true
#   location: us
#   pointInTimeRecoveryEnabled: true
#   replicationLogArchivingEnabled: true
#   startTime: '03:00'
#   transactionLogRetentionDays: 7
```

#### Manual Backups

```bash
# Create on-demand backup
gcloud sql backups create \
  --instance=family-hub-db \
  --description="Pre-deployment backup"

# List all backups
gcloud sql backups list --instance=family-hub-db

# Describe specific backup
gcloud sql backups describe BACKUP_ID --instance=family-hub-db

# Get backup details
gcloud sql backups describe BACKUP_ID \
  --instance=family-hub-db \
  --format='value(windowStartTime,status,type)'
```

#### Backup Retention

```bash
# Update backup retention to 30 days
gcloud sql instances patch family-hub-db \
  --retained-backups-count=30

# Enable point-in-time recovery (7 days)
gcloud sql instances patch family-hub-db \
  --transaction-log-retention-days=7

# Verify configuration
gcloud sql instances describe family-hub-db \
  --format='value(settings.backupConfiguration.retainedBackupsCount,settings.backupConfiguration.transactionLogRetentionDays)'
```

### 2. Application Backups

#### Cloud Run Revisions

```bash
# List all revisions
gcloud run revisions list \
  --service=family-hub \
  --region=us-central1

# Describe specific revision
gcloud run revisions describe REVISION_NAME \
  --region=us-central1

# Get revision image
gcloud run revisions describe REVISION_NAME \
  --region=us-central1 \
  --format='value(spec.template.spec.containers[0].image)'
```

#### Docker Image Backups

```bash
# Tag image with date
docker tag us-central1-docker.pkg.dev/PROJECT_ID/family-hub/family-hub:latest \
  us-central1-docker.pkg.dev/PROJECT_ID/family-hub/family-hub:backup-$(date +%Y%m%d)

# Push backup image
docker push us-central1-docker.pkg.dev/PROJECT_ID/family-hub/family-hub:backup-$(date +%Y%m%d)

# List all images
gcloud artifacts docker images list us-central1-docker.pkg.dev/PROJECT_ID/family-hub
```

### 3. Configuration Backups

#### Secret Manager Backups

```bash
# Export all secrets
for secret in $(gcloud secrets list --format='value(name)'); do
  echo "Backing up secret: $secret"
  gcloud secrets versions access latest --secret=$secret > /tmp/$secret.txt
done

# Store backups securely
gsutil -m cp /tmp/*.txt gs://family-hub-backups/secrets/$(date +%Y%m%d)/
```

#### Cloud Run Configuration Backups

```bash
# Export service configuration
gcloud run services describe family-hub \
  --region=us-central1 \
  --format=json > /tmp/family-hub-service.json

# Store backup
gsutil cp /tmp/family-hub-service.json gs://family-hub-backups/config/$(date +%Y%m%d)/
```

---

## Recovery Procedures

### 1. Cloud Run Service Recovery

#### Scenario: Service Crashes or Becomes Unresponsive

```bash
# Step 1: Check service status
gcloud run services describe family-hub --region=us-central1

# Step 2: View recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" \
  --limit=50 \
  --format=json

# Step 3: Check for errors
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub AND severity=ERROR" \
  --limit=50 \
  --format=json

# Step 4: Rollback to previous revision
PREVIOUS_REVISION=$(gcloud run revisions list \
  --service=family-hub \
  --region=us-central1 \
  --format='value(name)' \
  --limit=2 | tail -1)

gcloud run services update-traffic family-hub \
  --region=us-central1 \
  --to-revisions $PREVIOUS_REVISION=100

# Step 5: Verify service is healthy
curl -I https://familyhub.example.com/health

# Step 6: Monitor logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" \
  --follow \
  --format=json
```

#### Scenario: Deployment Failure

```bash
# Step 1: Check deployment status
gcloud run services describe family-hub --region=us-central1

# Step 2: List recent revisions
gcloud run revisions list \
  --service=family-hub \
  --region=us-central1 \
  --limit=5

# Step 3: Identify last working revision
WORKING_REVISION=$(gcloud run revisions list \
  --service=family-hub \
  --region=us-central1 \
  --format='value(name)' \
  --limit=3 | tail -1)

# Step 4: Shift traffic to working revision
gcloud run services update-traffic family-hub \
  --region=us-central1 \
  --to-revisions $WORKING_REVISION=100

# Step 5: Verify recovery
curl -I https://familyhub.example.com/health
```

### 2. Database Recovery

#### Scenario: Database Becomes Unavailable

```bash
# Step 1: Check instance status
gcloud sql instances describe family-hub-db

# Step 2: Check for failover status (if HA enabled)
gcloud sql instances describe family-hub-db \
  --format='value(settings.availabilityType,currentDiskSize)'

# Step 3: If HA replica exists, failover is automatic
# Monitor the failover process
gcloud sql operations list --instance=family-hub-db --limit=5

# Step 4: Verify database connectivity
gcloud sql connect family-hub-db --user=admin --database=family_hub

# Step 5: Check application logs for connection errors
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.error_type=database" \
  --limit=50
```

#### Scenario: Data Corruption or Accidental Deletion

```bash
# Step 1: Identify the issue
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.error_type=database" \
  --limit=100 \
  --format=json

# Step 2: List available backups
gcloud sql backups list --instance=family-hub-db

# Step 3: Identify backup to restore from
BACKUP_ID=$(gcloud sql backups list \
  --instance=family-hub-db \
  --format='value(name)' \
  --limit=1)

# Step 4: Create new instance from backup (safer than in-place restore)
gcloud sql instances clone family-hub-db family-hub-db-restored \
  --backup-id=$BACKUP_ID

# Step 5: Verify restored data
gcloud sql connect family-hub-db-restored --user=admin --database=family_hub

# Step 6: Update application to use restored instance
# Update DATABASE_URL secret to point to new instance

# Step 7: Perform data validation
# Run data integrity checks

# Step 8: Switch back to original instance (if validation passes)
# Or rename restored instance to original name

# Step 9: Delete old instance
gcloud sql instances delete family-hub-db
gcloud sql instances patch family-hub-db-restored --backup-start-time=03:00
```

#### Scenario: Point-in-Time Recovery

```bash
# Step 1: Identify the point in time to recover to
# Example: Recover to 2 hours ago
RECOVERY_TIME=$(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%SZ)

# Step 2: Create clone from point in time
gcloud sql instances clone family-hub-db family-hub-db-pitr \
  --point-in-time=$RECOVERY_TIME

# Step 3: Verify recovered data
gcloud sql connect family-hub-db-pitr --user=admin --database=family_hub

# Step 4: Validate data integrity
# Run data validation queries

# Step 5: Switch application to recovered instance
# Update DATABASE_URL secret

# Step 6: Delete old instance
gcloud sql instances delete family-hub-db
gcloud sql instances patch family-hub-db-pitr --backup-start-time=03:00
```

### 3. Complete Application Recovery

#### Scenario: Total Outage (All Services Down)

```bash
# Step 1: Assess the situation
gcloud run services describe family-hub --region=us-central1
gcloud sql instances describe family-hub-db

# Step 2: Check regional status
# Go to https://status.cloud.google.com

# Step 3: If regional outage, deploy to different region
gcloud run deploy family-hub \
  --image=us-central1-docker.pkg.dev/PROJECT_ID/family-hub/family-hub:latest \
  --region=us-east1 \
  --platform=managed \
  --set-cloudsql-instances=PROJECT_ID:us-east1:family-hub-db-replica

# Step 4: Update DNS to point to new region
gcloud dns record-sets update familyhub.example.com \
  --rrdatas=NEW_IP \
  --ttl=300 \
  --type=A \
  --zone=family-hub-zone

# Step 5: Verify application is accessible
curl -I https://familyhub.example.com/health

# Step 6: Monitor logs and metrics
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" \
  --follow
```

---

## Failover Procedures

### 1. Automatic Failover (HA Configuration)

```bash
# Verify HA is enabled
gcloud sql instances describe family-hub-db \
  --format='value(settings.availabilityType)'

# Expected output: REGIONAL

# Monitor failover process
gcloud sql operations list --instance=family-hub-db --limit=10

# Check failover status
gcloud sql instances describe family-hub-db \
  --format='value(currentDiskSize,ipAddresses[*].ipAddress)'
```

### 2. Manual Failover

```bash
# Initiate manual failover
gcloud sql instances failover family-hub-db

# Monitor failover progress
watch -n 5 'gcloud sql instances describe family-hub-db --format="value(state)"'

# Verify failover completed
gcloud sql instances describe family-hub-db \
  --format='value(currentDiskSize,ipAddresses[*].ipAddress)'

# Test database connectivity
gcloud sql connect family-hub-db --user=admin --database=family_hub
```

### 3. Cross-Region Failover

```bash
# Create read replica in different region
gcloud sql instances create family-hub-db-replica \
  --master-instance-name=family-hub-db \
  --region=us-east1 \
  --replica-type=READ

# Promote replica to standalone instance
gcloud sql instances promote-replica family-hub-db-replica

# Update application to use new instance
# Update DATABASE_URL secret

# Verify connectivity
gcloud sql connect family-hub-db-replica --user=admin --database=family_hub
```

---

## Testing & Validation

### 1. Backup Restoration Test

```bash
# Monthly: Test backup restoration
# Step 1: Create test instance from backup
BACKUP_ID=$(gcloud sql backups list \
  --instance=family-hub-db \
  --format='value(name)' \
  --limit=1)

gcloud sql instances clone family-hub-db family-hub-db-test \
  --backup-id=$BACKUP_ID

# Step 2: Verify data integrity
gcloud sql connect family-hub-db-test --user=admin --database=family_hub

# Step 3: Run data validation queries
psql -h INSTANCE_IP -U admin -d family_hub << 'EOF'
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as donation_count FROM donations;
SELECT COUNT(*) as event_count FROM events;
EOF

# Step 4: Delete test instance
gcloud sql instances delete family-hub-db-test
```

### 2. Failover Test

```bash
# Quarterly: Test failover procedures
# Step 1: Schedule maintenance window
# Step 2: Initiate manual failover
gcloud sql instances failover family-hub-db

# Step 3: Monitor failover process
watch -n 5 'gcloud sql instances describe family-hub-db --format="value(state)"'

# Step 4: Verify application connectivity
curl -I https://familyhub.example.com/health

# Step 5: Check application logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" \
  --limit=50

# Step 6: Document results
```

### 3. Disaster Recovery Drill

```bash
# Semi-annually: Full disaster recovery drill
# Step 1: Notify team
# Step 2: Simulate service failure
gcloud run services update-traffic family-hub \
  --region=us-central1 \
  --to-revisions PREVIOUS_REVISION=100

# Step 3: Execute recovery procedures
# (Follow recovery procedures above)

# Step 4: Verify recovery
curl -I https://familyhub.example.com/health

# Step 5: Document findings and improvements
# Step 6: Update runbooks based on findings
```

---

## Runbooks

### Runbook 1: Service Recovery

**Trigger**: Cloud Run service is down or returning errors

**Steps**:
1. Check service status: `gcloud run services describe family-hub --region=us-central1`
2. View logs: `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" --limit=50`
3. Identify issue from logs
4. If deployment issue: Rollback to previous revision
5. If configuration issue: Update environment variables
6. If database issue: Follow database recovery procedures
7. Verify recovery: `curl -I https://familyhub.example.com/health`
8. Monitor logs for 30 minutes

**Escalation**: If issue persists > 15 minutes, contact GCP support

### Runbook 2: Database Recovery

**Trigger**: Database is unavailable or data is corrupted

**Steps**:
1. Check instance status: `gcloud sql instances describe family-hub-db`
2. If HA enabled, wait for automatic failover (5-10 minutes)
3. If manual intervention needed:
   - Identify backup to restore from
   - Create clone from backup
   - Validate data integrity
   - Update application connection string
4. Verify application connectivity
5. Monitor logs for errors

**Escalation**: If issue persists > 30 minutes, contact GCP support

### Runbook 3: Complete Outage

**Trigger**: All services are down (regional outage)

**Steps**:
1. Check GCP status: https://status.cloud.google.com
2. If regional outage:
   - Deploy to alternate region
   - Update DNS records
   - Verify application accessibility
3. If service-specific issue:
   - Follow Service Recovery runbook
4. Communicate status to stakeholders
5. Monitor recovery progress

**Escalation**: Contact GCP support immediately

---

## Contact Information

### On-Call Team

| Role | Name | Phone | Email |
|------|------|-------|-------|
| DevOps Lead | John Doe | +1-555-0100 | john@example.com |
| Backend Lead | Jane Smith | +1-555-0101 | jane@example.com |
| Database Admin | Bob Johnson | +1-555-0102 | bob@example.com |

### External Contacts

| Service | Contact | Phone | Email |
|---------|---------|-------|-------|
| GCP Support | Support Portal | 1-844-4-GOOGLE | support@google.com |
| Domain Registrar | GoDaddy | 1-480-505-8877 | support@godaddy.com |
| Incident Commander | TBD | TBD | TBD |

### Escalation Path

1. **Level 1** (0-15 min): On-call DevOps engineer
2. **Level 2** (15-30 min): DevOps lead + Backend lead
3. **Level 3** (30+ min): Engineering manager + GCP support

---

## Documentation

### Related Documents
- [DEPLOY_GCP.md](DEPLOY_GCP.md) - Deployment guide
- [GCP_MONITORING.md](GCP_MONITORING.md) - Monitoring and alerting
- [GCP_ENV_VARIABLES.md](GCP_ENV_VARIABLES.md) - Configuration management

### Backup Locations
- **Cloud SQL Backups**: Managed by GCP (30-day retention)
- **Configuration Backups**: `gs://family-hub-backups/config/`
- **Secret Backups**: `gs://family-hub-backups/secrets/`
- **Docker Images**: `us-central1-docker.pkg.dev/PROJECT_ID/family-hub/`

### Recovery Time Estimates

| Scenario | RTO | RPO |
|----------|-----|-----|
| Service rollback | 5 minutes | 0 minutes |
| Database failover | 10 minutes | < 1 minute |
| Database restore | 30 minutes | 1 hour |
| Regional failover | 1 hour | 1 hour |
| Complete recovery | 2 hours | 1 hour |

---

## Maintenance Schedule

### Daily
- [ ] Monitor Cloud Logging for errors
- [ ] Check Cloud Monitoring dashboards
- [ ] Review alert notifications

### Weekly
- [ ] Verify backups are running
- [ ] Check backup sizes
- [ ] Review recovery procedures

### Monthly
- [ ] Test backup restoration
- [ ] Review disaster recovery plan
- [ ] Update contact information

### Quarterly
- [ ] Test failover procedures
- [ ] Conduct disaster recovery drill
- [ ] Update runbooks

### Annually
- [ ] Full disaster recovery audit
- [ ] Update RTO/RPO targets
- [ ] Review and update procedures

---

## Appendix: Recovery Commands Reference

```bash
# Quick reference for common recovery commands

# Check service status
gcloud run services describe family-hub --region=us-central1

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" --limit=50

# Rollback to previous revision
gcloud run services update-traffic family-hub --region=us-central1 --to-revisions PREVIOUS_REVISION=100

# Check database status
gcloud sql instances describe family-hub-db

# List backups
gcloud sql backups list --instance=family-hub-db

# Restore from backup
gcloud sql instances clone family-hub-db family-hub-db-restored --backup-id=BACKUP_ID

# Failover database
gcloud sql instances failover family-hub-db

# Test connectivity
gcloud sql connect family-hub-db --user=admin --database=family_hub

# Update DNS
gcloud dns record-sets update familyhub.example.com --rrdatas=NEW_IP --ttl=300 --type=A --zone=family-hub-zone
```

---

**Last Updated**: January 2024
**Reviewed By**: DevOps Team
**Next Review**: April 2024
