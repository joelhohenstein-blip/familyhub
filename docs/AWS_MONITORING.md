# AWS Monitoring and Troubleshooting Guide

This guide covers monitoring, logging, alerting, and troubleshooting for Family Hub on AWS.

## Table of Contents

1. [CloudWatch Monitoring](#cloudwatch-monitoring)
2. [Logging](#logging)
3. [Alarms and Notifications](#alarms-and-notifications)
4. [Performance Insights](#performance-insights)
5. [Troubleshooting](#troubleshooting)
6. [Common Issues](#common-issues)

---

## CloudWatch Monitoring

### 1. View ECS Metrics

```bash
# Get ECS cluster and service names
CLUSTER="family-hub-cluster"
SERVICE="family-hub-service"

# View CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=$SERVICE Name=ClusterName,Value=$CLUSTER \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# View memory utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=$SERVICE Name=ClusterName,Value=$CLUSTER \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

### 2. View RDS Metrics

```bash
# Get RDS instance name
DB_INSTANCE="family-hub-db"

# View CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=$DB_INSTANCE \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# View database connections
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=$DB_INSTANCE \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# View free storage space
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name FreeStorageSpace \
  --dimensions Name=DBInstanceIdentifier,Value=$DB_INSTANCE \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Minimum
```

### 3. View ALB Metrics

```bash
# Get ALB name
ALB_NAME="family-hub-alb"

# View request count
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name RequestCount \
  --dimensions Name=LoadBalancer,Value=app/$ALB_NAME/xxxxx \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# View target response time
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=LoadBalancer,Value=app/$ALB_NAME/xxxxx \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# View HTTP 5XX errors
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --dimensions Name=LoadBalancer,Value=app/$ALB_NAME/xxxxx \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### 4. Create CloudWatch Dashboard

```bash
# Create dashboard JSON
cat > /tmp/dashboard.json << 'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", {"stat": "Average"}],
          [".", "MemoryUtilization", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "ECS Service Metrics"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/RDS", "CPUUtilization", {"stat": "Average"}],
          [".", "DatabaseConnections", {"stat": "Average"}],
          [".", "FreeStorageSpace", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "RDS Metrics"
      }
    },
    {
      "type": "log",
      "properties": {
        "query": "fields @timestamp, @message | filter @message like /ERROR/ | stats count() by @message",
        "region": "us-east-1",
        "title": "Error Logs"
      }
    }
  ]
}
EOF

# Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name family-hub-dashboard \
  --dashboard-body file:///tmp/dashboard.json
```

---

## Logging

### 1. View ECS Logs

```bash
# View recent logs
aws logs tail /ecs/family-hub-production --follow

# View logs from last hour
aws logs tail /ecs/family-hub-production --since 1h

# View logs with filter
aws logs tail /ecs/family-hub-production --follow --filter-pattern "ERROR"

# View logs from specific time range
aws logs filter-log-events \
  --log-group-name /ecs/family-hub-production \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --end-time $(date +%s)000 \
  --filter-pattern "ERROR"
```

### 2. CloudWatch Logs Insights Queries

```bash
# Query errors
aws logs start-query \
  --log-group-name /ecs/family-hub-production \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | stats count() by @message'

# Query by log level
aws logs start-query \
  --log-group-name /ecs/family-hub-production \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message, @logStream | filter @message like /WARN|ERROR/ | stats count() by @logStream'

# Query response times
aws logs start-query \
  --log-group-name /ecs/family-hub-production \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @duration | stats avg(@duration), max(@duration), pct(@duration, 99)'

# Query by endpoint
aws logs start-query \
  --log-group-name /ecs/family-hub-production \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /\/api\// | stats count() by @message'
```

### 3. RDS Logs

```bash
# View RDS error logs
aws logs tail /aws/rds/instance/family-hub-db/error --follow

# View RDS general logs
aws logs tail /aws/rds/instance/family-hub-db/general --follow

# Query slow queries
aws logs filter-log-events \
  --log-group-name /aws/rds/instance/family-hub-db/error \
  --filter-pattern "slow query"
```

### 4. Export Logs

```bash
# Export logs to S3
aws logs create-export-task \
  --log-group-name /ecs/family-hub-production \
  --from $(date -d '7 days ago' +%s)000 \
  --to $(date +%s)000 \
  --destination family-hub-logs \
  --destination-prefix logs/ecs

# Check export status
aws logs describe-export-tasks \
  --query 'exportTasks[0].[status,logGroupName,fromTime,to]'
```

---

## Alarms and Notifications

### 1. Create SNS Topic for Alerts

```bash
# Create SNS topic
SNS_TOPIC_ARN=$(aws sns create-topic \
  --name family-hub-alerts \
  --query 'TopicArn' \
  --output text)

# Subscribe email
aws sns subscribe \
  --topic-arn $SNS_TOPIC_ARN \
  --protocol email \
  --notification-endpoint your-email@example.com

# Subscribe Slack (requires Lambda)
aws sns subscribe \
  --topic-arn $SNS_TOPIC_ARN \
  --protocol https \
  --notification-endpoint https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 2. Create Alarms

```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name family-hub-ecs-high-cpu \
  --alarm-description "Alert when ECS CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=ServiceName,Value=family-hub-service Name=ClusterName,Value=family-hub-cluster \
  --alarm-actions $SNS_TOPIC_ARN

# High memory alarm
aws cloudwatch put-metric-alarm \
  --alarm-name family-hub-ecs-high-memory \
  --alarm-description "Alert when ECS memory exceeds 80%" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=ServiceName,Value=family-hub-service Name=ClusterName,Value=family-hub-cluster \
  --alarm-actions $SNS_TOPIC_ARN

# RDS high CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name family-hub-rds-high-cpu \
  --alarm-description "Alert when RDS CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=DBInstanceIdentifier,Value=family-hub-db \
  --alarm-actions $SNS_TOPIC_ARN

# RDS low storage alarm
aws cloudwatch put-metric-alarm \
  --alarm-name family-hub-rds-low-storage \
  --alarm-description "Alert when RDS free storage < 10GB" \
  --metric-name FreeStorageSpace \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 10737418240 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=DBInstanceIdentifier,Value=family-hub-db \
  --alarm-actions $SNS_TOPIC_ARN

# ALB unhealthy targets alarm
aws cloudwatch put-metric-alarm \
  --alarm-name family-hub-alb-unhealthy-targets \
  --alarm-description "Alert when ALB has unhealthy targets" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 2 \
  --alarm-actions $SNS_TOPIC_ARN

# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name family-hub-alb-high-errors \
  --alarm-description "Alert when ALB 5XX errors exceed 10" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions $SNS_TOPIC_ARN
```

### 3. List and Manage Alarms

```bash
# List all alarms
aws cloudwatch describe-alarms \
  --query 'MetricAlarms[*].[AlarmName,StateValue,MetricName]'

# List alarms in ALARM state
aws cloudwatch describe-alarms \
  --state-value ALARM \
  --query 'MetricAlarms[*].[AlarmName,StateValue,StateReason]'

# Disable alarm
aws cloudwatch disable-alarm-actions \
  --alarm-names family-hub-ecs-high-cpu

# Enable alarm
aws cloudwatch enable-alarm-actions \
  --alarm-names family-hub-ecs-high-cpu

# Delete alarm
aws cloudwatch delete-alarms \
  --alarm-names family-hub-ecs-high-cpu
```

---

## Performance Insights

### 1. Enable Performance Insights (RDS)

```bash
# Already enabled in CloudFormation template for production
# Verify it's enabled
aws rds describe-db-instances \
  --db-instance-identifier family-hub-db \
  --query 'DBInstances[0].PerformanceInsightsEnabled'
```

### 2. Query Performance Insights

```bash
# Get performance insights data
aws pi get-resource-metrics \
  --service-type RDS \
  --identifier $(aws rds describe-db-instances \
    --db-instance-identifier family-hub-db \
    --query 'DBInstances[0].DbiResourceId' \
    --output text) \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period-in-seconds 60 \
  --metric-queries '[{"Metric":"db.load.avg"}]'
```

---

## Troubleshooting

### 1. ECS Task Troubleshooting

```bash
# Get task details
TASK_ARN=$(aws ecs list-tasks \
  --cluster family-hub-cluster \
  --service-name family-hub-service \
  --query 'taskArns[0]' \
  --output text)

aws ecs describe-tasks \
  --cluster family-hub-cluster \
  --tasks $TASK_ARN \
  --query 'tasks[0].[taskArn,lastStatus,desiredStatus,stoppedReason,stoppedCode]'

# Check container logs
aws logs tail /ecs/family-hub-production --follow

# Check task events
aws ecs describe-services \
  --cluster family-hub-cluster \
  --services family-hub-service \
  --query 'services[0].events[0:5]'
```

### 2. Database Troubleshooting

```bash
# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier family-hub-db \
  --query 'DBInstances[0].[DBInstanceStatus,PendingModifiedValues]'

# Check database connections
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=family-hub-db \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# Test connection
psql -h $(aws rds describe-db-instances \
  --db-instance-identifier family-hub-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text) \
  -U admin \
  -d family_hub \
  -c "SELECT NOW();"
```

### 3. Network Troubleshooting

```bash
# Check security group rules
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=*family-hub*" \
  --query 'SecurityGroups[*].[GroupName,IpPermissions]'

# Check VPC flow logs
aws logs tail /aws/vpc/flowlogs --follow

# Test ALB connectivity
curl -I http://$(aws elbv2 describe-load-balancers \
  --names family-hub-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)
```

### 4. DNS Troubleshooting

```bash
# Check Route53 records
aws route53 list-resource-record-sets \
  --hosted-zone-id $(aws route53 list-hosted-zones-by-name \
    --dns-name familyhub.example.com \
    --query 'HostedZones[0].Id' \
    --output text) \
  --query 'ResourceRecordSets[?Name==`familyhub.example.com.`]'

# Test DNS resolution
nslookup familyhub.example.com
dig familyhub.example.com
```

---

## Common Issues

### Issue: ECS Tasks Keep Restarting

**Symptoms**: Tasks show `lastStatus: STOPPED` repeatedly

**Solutions**:
```bash
# 1. Check logs for errors
aws logs tail /ecs/family-hub-production --follow

# 2. Check environment variables
aws ecs describe-task-definition \
  --task-definition family-hub:1 \
  --query 'taskDefinition.containerDefinitions[0].secrets'

# 3. Verify Parameter Store access
aws ssm get-parameter \
  --name /family-hub/db/url \
  --with-decryption

# 4. Check IAM role permissions
aws iam get-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name ssm-access
```

### Issue: Database Connection Timeout

**Symptoms**: Application logs show "connection timeout" or "ECONNREFUSED"

**Solutions**:
```bash
# 1. Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier family-hub-db \
  --query 'DBInstances[0].DBInstanceStatus'

# 2. Check security group
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=*rds*" \
  --query 'SecurityGroups[0].IpPermissions'

# 3. Test connection from EC2
psql -h <RDS_ENDPOINT> -U admin -d family_hub -c "SELECT NOW();"

# 4. Check RDS parameter group
aws rds describe-db-parameters \
  --db-instance-identifier family-hub-db \
  --query 'Parameters[?ParameterName==`max_connections`]'
```

### Issue: High Memory Usage

**Symptoms**: ECS memory utilization > 80%

**Solutions**:
```bash
# 1. Check memory metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=family-hub-service \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# 2. Increase task memory
aws ecs register-task-definition \
  --family family-hub \
  --memory 2048 \
  # ... other parameters

# 3. Scale up service
aws ecs update-service \
  --cluster family-hub-cluster \
  --service family-hub-service \
  --desired-count 4
```

### Issue: Slow Application Response

**Symptoms**: Response times > 5 seconds

**Solutions**:
```bash
# 1. Check ALB response time
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# 2. Check RDS performance
aws pi get-resource-metrics \
  --service-type RDS \
  --identifier <DBI_RESOURCE_ID> \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period-in-seconds 60 \
  --metric-queries '[{"Metric":"db.load.avg"}]'

# 3. Check application logs
aws logs start-query \
  --log-group-name /ecs/family-hub-production \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @duration | stats avg(@duration), max(@duration), pct(@duration, 99)'

# 4. Scale up resources
aws ecs update-service \
  --cluster family-hub-cluster \
  --service family-hub-service \
  --desired-count 4
```

---

## Monitoring Checklist

- [ ] CloudWatch dashboard created and monitored
- [ ] Alarms configured for critical metrics
- [ ] SNS topic created for notifications
- [ ] Email/Slack notifications tested
- [ ] Log retention policies configured
- [ ] Performance Insights enabled (RDS)
- [ ] VPC Flow Logs enabled
- [ ] CloudTrail enabled for audit logging
- [ ] Regular log reviews scheduled
- [ ] Runbooks created for common issues

---

## References

- [AWS CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [AWS CloudWatch Logs Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html)
- [AWS RDS Performance Insights](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.html)
- [AWS ECS Monitoring](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cloudwatch-metrics.html)
