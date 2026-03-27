# AWS Security Hardening Guide for Family Hub

Comprehensive security hardening guide for production deployment on AWS.

## Network Security

### VPC Configuration

```bash
# Enable VPC Flow Logs
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-xxxxx \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/flowlogs
```

### Security Groups

```bash
# ALB Security Group - Allow HTTPS only
aws ec2 authorize-security-group-ingress \
  --group-id sg-alb \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# ECS Security Group - Allow from ALB only
aws ec2 authorize-security-group-ingress \
  --group-id sg-ecs \
  --protocol tcp \
  --port 3000 \
  --source-group sg-alb
```

## Data Security

### RDS Encryption

```bash
# Enable encryption at rest
aws rds describe-db-instances \
  --db-instance-identifier family-hub-db \
  --query 'DBInstances[0].StorageEncrypted'

# Enable encryption in transit
export DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

### Secrets Management

```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name family-hub/db/password \
  --secret-string "$(openssl rand -base64 32)"

# Rotate secrets automatically
aws secretsmanager rotate-secret \
  --secret-id family-hub/db/password \
  --rotation-rules AutomaticallyAfterDays=30
```

## Access Control

### IAM Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECSTaskExecution",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    }
  ]
}
```

## Application Security

### HTTPS/TLS

```bash
# Request SSL certificate
aws acm request-certificate \
  --domain-name familyhub.example.com \
  --subject-alternative-names www.familyhub.example.com \
  --validation-method DNS
```

## Monitoring & Logging

### CloudWatch Logs

```bash
# Create log group with encryption
aws logs create-log-group \
  --log-group-name /ecs/family-hub-production \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/xxxxx

# Set retention
aws logs put-retention-policy \
  --log-group-name /ecs/family-hub-production \
  --retention-in-days 30
```

## Compliance

### GDPR Compliance

- ✅ Data encryption at rest and in transit
- ✅ Access controls and authentication
- ✅ Audit logging with CloudTrail
- ✅ Data retention policies

### SOC 2 Compliance

- ✅ Security: Encryption, access controls, monitoring
- ✅ Availability: Multi-AZ, auto-scaling, backups

---

**Last Updated**: 2024-03-22