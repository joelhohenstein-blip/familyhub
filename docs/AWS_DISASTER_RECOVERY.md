# AWS Disaster Recovery Runbook for Family Hub

Step-by-step procedures for recovering from various disaster scenarios.

## RDS Database Failure

### Scenario: Database becomes unavailable

**Detection**: CloudWatch alarm triggers, application logs show connection errors

**Recovery Steps**:

```bash
# 1. Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier family-hub-db \
  --query 'DBInstances[0].[DBInstanceStatus,MultiAZ]'

# 2. If Multi-AZ enabled, automatic failover occurs (2-3 minutes)
aws rds describe-db-instances \
  --db-instance-identifier family-hub-db \
  --query 'DBInstances[0].PendingModifiedValues'

# 3. Verify connectivity
psql -h <RDS_ENDPOINT> -U admin -d family_hub -c "SELECT NOW();"

# 4. Check application logs
aws logs tail /ecs/family-hub-production --follow

# 5. If failover doesn't work, restore from snapshot
SNAPSHOT_ID=$(aws rds describe-db-snapshots \
  --db-instance-identifier family-hub-db \
  --query 'DBSnapshots[0].DBSnapshotIdentifier' \
  --output text)

aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier family-hub-db-restored \
  --db-snapshot-identifier $SNAPSHOT_ID
```

**RTO**: 2-3 minutes (automatic failover) or 10-15 minutes (restore from snapshot)  
**RPO**: 0 minutes (Multi-AZ) or last backup

---

## ECS Service Failure

### Scenario: ECS tasks are crashing or not starting

**Detection**: CloudWatch alarm, unhealthy targets in ALB

**Recovery Steps**:

```bash
# 1. Check service status
aws ecs describe-services \
  --cluster family-hub-cluster \
  --services family-hub-service \
  --query 'services[0].[serviceName,status,desiredCount,runningCount]'

# 2. Check task status
aws ecs list-tasks \
  --cluster family-hub-cluster \
  --service-name family-hub-service

# 3. Check logs
aws logs tail /ecs/family-hub-production --follow

# 4. Rollback to previous task definition
aws ecs update-service \
  --cluster family-hub-cluster \
  --service family-hub-service \
  --task-definition family-hub:previous-revision \
  --force-new-deployment

# 5. Wait for service to stabilize
aws ecs wait services-stable \
  --cluster family-hub-cluster \
  --services family-hub-service

# 6. Verify health
curl -f https://familyhub.example.com/health
```

**RTO**: 2-5 minutes  
**RPO**: 0 minutes (no data loss)

---

## Complete Outage

### Scenario: All infrastructure is down

**Recovery Steps**:

```bash
# 1. Assess damage
aws ecs describe-services \
  --cluster family-hub-cluster \
  --services family-hub-service

aws rds describe-db-instances \
  --db-instance-identifier family-hub-db

# 2. Restore RDS from latest snapshot
SNAPSHOT_ID=$(aws rds describe-db-snapshots \
  --db-instance-identifier family-hub-db \
  --query 'DBSnapshots[0].DBSnapshotIdentifier' \
  --output text)

aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier family-hub-db-restored \
  --db-snapshot-identifier $SNAPSHOT_ID

# 3. Wait for RDS to be available
aws rds wait db-instance-available \
  --db-instance-identifier family-hub-db-restored

# 4. Restart ECS service
aws ecs update-service \
  --cluster family-hub-cluster \
  --service family-hub-service \
  --force-new-deployment

# 5. Wait for service to be healthy
aws ecs wait services-stable \
  --cluster family-hub-cluster \
  --services family-hub-service

# 6. Verify application
curl -f https://familyhub.example.com/health
```

**RTO**: 30-45 minutes  
**RPO**: Last backup (typically < 1 hour)

---

## Data Corruption

### Scenario: Database contains corrupted data

**Recovery Steps**:

```bash
# 1. Stop application to prevent further corruption
aws ecs update-service \
  --cluster family-hub-cluster \
  --service family-hub-service \
  --desired-count 0

# 2. Find last good backup
aws rds describe-db-snapshots \
  --db-instance-identifier family-hub-db \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime]' \
  --output table

# 3. Restore from backup before corruption
SNAPSHOT_ID="family-hub-backup-2024-03-20-03-00"

aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier family-hub-db-restored \
  --db-snapshot-identifier $SNAPSHOT_ID

# 4. Swap databases
aws rds modify-db-instance \
  --db-instance-identifier family-hub-db \
  --new-db-instance-identifier family-hub-db-corrupted \
  --apply-immediately

aws rds modify-db-instance \
  --db-instance-identifier family-hub-db-restored \
  --new-db-instance-identifier family-hub-db \
  --apply-immediately

# 5. Restart application
aws ecs update-service \
  --cluster family-hub-cluster \
  --service family-hub-service \
  --desired-count 2 \
  --force-new-deployment
```

**RTO**: 1-2 hours  
**RPO**: Last good backup

---

## Security Breach

### Scenario: Security vulnerability or unauthorized access detected

**Recovery Steps**:

```bash
# 1. Isolate affected resources
aws ec2 modify-security-group-rules \
  --group-id sg-ecs \
  --security-group-rules IpProtocol=tcp,FromPort=3000,ToPort=3000,CidrIp=0.0.0.0/0 \
  --action revoke

# 2. Rotate credentials
aws secretsmanager rotate-secret \
  --secret-id family-hub/db/password \
  --rotation-rules AutomaticallyAfterDays=1

# 3. Review CloudTrail logs
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=family-hub-db \
  --max-results 50

# 4. Rollback to known good state
aws ecs update-service \
  --cluster family-hub-cluster \
  --service family-hub-service \
  --task-definition family-hub:10 \
  --force-new-deployment
```

**RTO**: 15-30 minutes  
**RPO**: 0 minutes (no data loss)

---

## Testing DR Plan

### Monthly DR Drill

```bash
#!/bin/bash

echo "🚨 Starting DR Drill..."

# 1. Create test snapshot
TEST_SNAPSHOT=$(aws rds create-db-snapshot \
  --db-instance-identifier family-hub-db \
  --db-snapshot-identifier family-hub-dr-test-$(date +%Y%m%d-%H%M%S) \
  --query 'DBSnapshot.DBSnapshotIdentifier' \
  --output text)

echo "Created test snapshot: $TEST_SNAPSHOT"

# 2. Wait for snapshot
aws rds wait db-snapshot-available \
  --db-snapshot-identifier $TEST_SNAPSHOT

# 3. Restore from snapshot
TEST_DB=$(aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier family-hub-dr-test \
  --db-snapshot-identifier $TEST_SNAPSHOT \
  --query 'DBInstance.DBInstanceIdentifier' \
  --output text)

# 4. Wait for restoration
aws rds wait db-instance-available \
  --db-instance-identifier $TEST_DB

# 5. Clean up
aws rds delete-db-instance \
  --db-instance-identifier $TEST_DB \
  --skip-final-snapshot

echo "✅ DR Drill completed successfully"
```

---

**Last Updated**: 2024-03-22