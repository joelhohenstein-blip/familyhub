# AWS Cost Optimization Guide

This guide provides strategies to optimize costs for Family Hub on AWS while maintaining performance and reliability.

## Table of Contents

1. [Cost Analysis](#cost-analysis)
2. [Compute Optimization](#compute-optimization)
3. [Database Optimization](#database-optimization)
4. [Storage Optimization](#storage-optimization)
5. [Network Optimization](#network-optimization)
6. [Monitoring and Alerts](#monitoring-and-alerts)
7. [Reserved Instances and Savings Plans](#reserved-instances-and-savings-plans)

---

## Cost Analysis

### 1. Estimate Current Costs

```bash
# Get cost and usage data for the last month
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -d '30 days ago' +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE \
  --output table

# Get daily cost breakdown
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -d '7 days ago' +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity DAILY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE \
  --output table

# Get cost by resource
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -d '30 days ago' +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=TAG,Key=Name \
  --output table
```

### 2. Create Cost Anomaly Detection

```bash
# Create anomaly monitor
aws ce put-anomaly-monitor \
  --anomaly-monitor '{
    "MonitorName": "family-hub-cost-monitor",
    "MonitorType": "DIMENSIONAL",
    "MonitorDimension": "SERVICE",
    "MonitorSpecification": {
      "InvocationFrequency": "DAILY"
    }
  }'

# Create anomaly subscription
SNS_TOPIC_ARN=$(aws sns create-topic \
  --name family-hub-cost-alerts \
  --query 'TopicArn' \
  --output text)

aws ce put-anomaly-subscription \
  --anomaly-subscription '{
    "SubscriptionName": "family-hub-cost-alert",
    "Threshold": 100,
    "Frequency": "DAILY",
    "MonitorArnList": ["arn:aws:ce:us-east-1:ACCOUNT_ID:anomalymonitor/family-hub-cost-monitor"],
    "SubscriptionArn": "'$SNS_TOPIC_ARN'"
  }'

# Subscribe to alerts
aws sns subscribe \
  --topic-arn $SNS_TOPIC_ARN \
  --protocol email \
  --notification-endpoint your-email@example.com
```

### 3. Cost Breakdown by Service

Typical monthly costs for production deployment:

| Service | Configuration | Estimated Cost |
|---------|---------------|-----------------|
| **ECS Fargate** | 2 tasks × 512 CPU, 1GB RAM | $30-50 |
| **RDS PostgreSQL** | db.t3.medium, 100GB, Multi-AZ | $50-80 |
| **Application Load Balancer** | 1 ALB | $15-20 |
| **NAT Gateway** | 1 NAT, ~100GB data | $30-45 |
| **Data Transfer** | ~100GB outbound | $10-20 |
| **CloudWatch** | Logs, metrics, alarms | $5-10 |
| **Route53** | Hosted zone + queries | $1-5 |
| **S3** | Static assets, backups | $5-10 |
| **Backup/Snapshots** | RDS snapshots | $5-10 |
| **Miscellaneous** | Secrets Manager, Parameter Store | $2-5 |
| **TOTAL** | | **$153-255** |

---

## Compute Optimization

### 1. Use Fargate Spot for Non-Critical Workloads

Fargate Spot can save up to 70% on compute costs.

```bash
# Update ECS service to use Spot
aws ecs update-service \
  --cluster family-hub-cluster \
  --service family-hub-service \
  --capacity-provider-strategy capacityProvider=FARGATE_SPOT,weight=70 capacityProvider=FARGATE,weight=30 \
  --force-new-deployment
```

**Trade-offs**:
- ✓ 70% cost savings
- ✗ Tasks can be interrupted with 2-minute notice
- ✓ Good for non-critical workloads, background jobs
- ✗ Not suitable for production APIs

### 2. Right-Size ECS Tasks

```bash
# Monitor actual resource usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=family-hub-service \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum

aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=family-hub-service \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum
```

**Recommendations**:
- If CPU < 20% and Memory < 30%: Reduce task size
- If CPU > 80% or Memory > 80%: Increase task size
- Monitor for 1-2 weeks before making changes

### 3. Optimize Auto-Scaling

```bash
# Adjust scaling policies for better efficiency
aws application-autoscaling put-scaling-policy \
  --policy-name family-hub-cpu-scaling-optimized \
  --service-namespace ecs \
  --resource-id service/family-hub-cluster/family-hub-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 60.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleOutCooldown": 300,
    "ScaleInCooldown": 600
  }'
```

**Optimization tips**:
- Increase scale-in cooldown to avoid rapid scaling
- Use target tracking instead of step scaling
- Set appropriate target values (60-70% for stability)

---

## Database Optimization

### 1. Use RDS Reserved Instances

Save 40-60% with 1-3 year commitments.

```bash
# Get current RDS usage
aws rds describe-db-instances \
  --db-instance-identifier family-hub-db \
  --query 'DBInstances[0].[DBInstanceClass,Engine,MultiAZ]'

# Purchase Reserved Instance
aws rds purchase-reserved-db-instances-offering \
  --reserved-db-instances-offering-id 438012d3-74da-4d29-a285-079a8dcf3c50 \
  --reserved-db-instance-id family-hub-db-reserved-1yr
```

**Cost comparison**:
- On-Demand db.t3.medium: ~$150/month
- 1-Year Reserved: ~$90/month (40% savings)
- 3-Year Reserved: ~$70/month (53% savings)

### 2. Optimize Database Configuration

```bash
# Reduce backup retention for non-production
aws rds modify-db-instance \
  --db-instance-identifier family-hub-db \
  --backup-retention-period 7 \
  --apply-immediately

# Disable Multi-AZ for staging/development
aws rds modify-db-instance \
  --db-instance-identifier family-hub-staging-db \
  --no-multi-az \
  --apply-immediately

# Use gp3 storage instead of gp2
aws rds modify-db-instance \
  --db-instance-identifier family-hub-db \
  --storage-type gp3 \
  --iops 3000 \
  --apply-immediately
```

**Savings**:
- Reducing backup retention: $5-10/month
- Disabling Multi-AZ: $50-80/month
- Using gp3: $5-15/month

### 3. Enable Performance Insights Selective Retention

```bash
# Reduce retention period for non-production
aws rds modify-db-instance \
  --db-instance-identifier family-hub-staging-db \
  --performance-insights-retention-period 7 \
  --apply-immediately
```

---

## Storage Optimization

### 1. Optimize S3 Storage

```bash
# Enable S3 Intelligent-Tiering
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket family-hub-assets \
  --id AutoArchive \
  --intelligent-tiering-configuration '{
    "Id": "AutoArchive",
    "Filter": {"Prefix": ""},
    "Status": "Enabled",
    "Tierings": [
      {
        "Days": 90,
        "AccessTier": "ARCHIVE_ACCESS"
      },
      {
        "Days": 180,
        "AccessTier": "DEEP_ARCHIVE_ACCESS"
      }
    ]
  }'

# Enable versioning cleanup
aws s3api put-bucket-lifecycle-configuration \
  --bucket family-hub-assets \
  --lifecycle-configuration '{
    "Rules": [
      {
        "Id": "DeleteOldVersions",
        "Status": "Enabled",
        "NoncurrentVersionExpiration": {
          "NoncurrentDays": 30
        }
      },
      {
        "Id": "DeleteIncompleteUploads",
        "Status": "Enabled",
        "AbortIncompleteMultipartUpload": {
          "DaysAfterInitiation": 7
        }
      }
    ]
  }'
```

**Savings**:
- Intelligent-Tiering: 20-40% on infrequently accessed data
- Lifecycle policies: 10-20% on old versions

### 2. Optimize RDS Snapshots

```bash
# Delete old snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier family-hub-db \
  --query 'DBSnapshots[?SnapshotCreateTime<`2024-01-01`].DBSnapshotIdentifier' \
  --output text | xargs -I {} aws rds delete-db-snapshot --db-snapshot-identifier {}

# Set up automated cleanup
aws rds modify-db-instance \
  --db-instance-identifier family-hub-db \
  --backup-retention-period 7 \
  --apply-immediately
```

**Savings**: $5-20/month per old snapshot

### 3. Optimize CloudWatch Logs

```bash
# Reduce log retention for non-production
aws logs put-retention-policy \
  --log-group-name /ecs/family-hub-staging \
  --retention-in-days 7

# Archive old logs to S3
aws logs create-export-task \
  --log-group-name /ecs/family-hub-production \
  --from $(date -d '30 days ago' +%s)000 \
  --to $(date -d '7 days ago' +%s)000 \
  --destination family-hub-logs \
  --destination-prefix logs/archive
```

**Savings**: $1-5/month per log group

---

## Network Optimization

### 1. Optimize Data Transfer

```bash
# Use VPC endpoints to avoid NAT gateway charges
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxxxxx \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-xxxxxxxx

# Enable S3 Transfer Acceleration (if needed)
aws s3api put-bucket-accelerate-configuration \
  --bucket family-hub-assets \
  --accelerate-configuration Status=Enabled
```

**Savings**:
- VPC endpoints: $5-10/month per endpoint
- Reduced NAT gateway usage: $20-40/month

### 2. Optimize CloudFront

```bash
# Enable compression
aws cloudfront update-distribution \
  --id E1234EXAMPLE \
  --distribution-config '{
    "DefaultCacheBehavior": {
      "Compress": true
    }
  }'

# Set appropriate cache TTLs
# Static assets: 1 year
# HTML: 1 hour
# API: 0 (no cache)
```

**Savings**: 20-40% on data transfer costs

### 3. Use CloudFront for Static Assets

```bash
# Create CloudFront distribution for S3
aws cloudfront create-distribution \
  --distribution-config '{
    "Origins": {
      "Items": [{
        "DomainName": "family-hub-assets.s3.amazonaws.com",
        "S3OriginConfig": {}
      }]
    },
    "DefaultCacheBehavior": {
      "Compress": true,
      "ViewerProtocolPolicy": "https-only",
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
    }
  }'
```

**Savings**: 50-70% on data transfer for static content

---

## Monitoring and Alerts

### 1. Set Up Budget Alerts

```bash
# Create budget
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{
    "BudgetName": "family-hub-monthly",
    "BudgetLimit": {
      "Amount": "300",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[{
    "Notification": {
      "NotificationType": "FORECASTED",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [{
      "SubscriptionType": "EMAIL",
      "Address": "your-email@example.com"
    }]
  }]'

# Create alert for actual spending
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{
    "BudgetName": "family-hub-actual",
    "BudgetLimit": {
      "Amount": "250",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[{
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 90,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [{
      "SubscriptionType": "EMAIL",
      "Address": "your-email@example.com"
    }]
  }]'
```

### 2. Create Cost Dashboard

```bash
# Create CloudWatch dashboard for cost tracking
aws cloudwatch put-dashboard \
  --dashboard-name family-hub-costs \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "metrics": [
            ["AWS/Billing", "EstimatedCharges", {"stat": "Average"}]
          ],
          "period": 86400,
          "stat": "Average",
          "region": "us-east-1",
          "title": "Estimated Monthly Charges"
        }
      }
    ]
  }'
```

---

## Reserved Instances and Savings Plans

### 1. Purchase Compute Savings Plan

Save 20-30% on ECS Fargate costs.

```bash
# Get current Fargate usage
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -d '30 days ago' +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --filter '{
    "Dimensions": {
      "Key": "PURCHASE_TYPE",
      "Values": ["On Demand"]
    }
  }' \
  --group-by Type=DIMENSION,Key=INSTANCE_FAMILY

# Purchase Compute Savings Plan
aws savingsplans purchase-savings-plan \
  --savings-plan-config '{
    "ServiceCode": "AmazonEC2",
    "UsageType": "BoxUsage",
    "Operation": "RunInstances",
    "PaymentOption": "ALL_UPFRONT",
    "Term": "ONE_YEAR"
  }'
```

### 2. Use Spot Instances for Batch Jobs

Save 70% on compute for non-critical workloads.

```bash
# Create Spot request for batch processing
aws ec2 request-spot-instances \
  --spot-price "0.05" \
  --instance-count 1 \
  --type "one-time" \
  --launch-specification '{
    "ImageId": "ami-xxxxxxxx",
    "InstanceType": "t3.medium",
    "KeyName": "my-key"
  }'
```

---

## Cost Optimization Checklist

- [ ] Cost anomaly detection enabled
- [ ] Budget alerts configured
- [ ] RDS Reserved Instances purchased
- [ ] Fargate Spot used for non-critical workloads
- [ ] S3 Intelligent-Tiering enabled
- [ ] Old snapshots deleted
- [ ] Log retention policies optimized
- [ ] VPC endpoints configured
- [ ] CloudFront compression enabled
- [ ] Right-sizing completed
- [ ] Auto-scaling policies optimized
- [ ] Unused resources identified and removed
- [ ] Cost dashboard created
- [ ] Monthly cost reviews scheduled

---

## Expected Savings

By implementing all recommendations:

| Optimization | Current | Optimized | Savings |
|--------------|---------|-----------|---------|
| ECS Fargate | $40 | $28 | 30% |
| RDS | $65 | $39 | 40% |
| Data Transfer | $15 | $9 | 40% |
| Storage | $10 | $6 | 40% |
| **Total** | **$200** | **$120** | **40%** |

---

## References

- [AWS Cost Optimization](https://aws.amazon.com/cost-optimization/)
- [AWS Pricing Calculator](https://calculator.aws/)
- [AWS Cost Explorer](https://console.aws.amazon.com/cost-management/home)
- [AWS Budgets](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/budgets-managing-costs.html)
- [AWS Savings Plans](https://aws.amazon.com/savingsplans/)
