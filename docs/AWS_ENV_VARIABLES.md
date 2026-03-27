# AWS Environment Variables Configuration Guide

This guide explains how to configure environment variables for the Family Hub application on AWS.

## Overview

Environment variables are stored in two places:

1. **AWS Systems Manager Parameter Store** - For sensitive values (encrypted)
2. **ECS Task Definition** - For non-sensitive configuration

## Parameter Store Setup

### 1. Database Configuration

```bash
# Get RDS endpoint from CloudFormation output
RDS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name family-hub-production \
  --query 'Stacks[0].Outputs[?OutputKey==`RDSEndpoint`].OutputValue' \
  --output text)

# Store database URL
aws ssm put-parameter \
  --name /family-hub/db/url \
  --value "postgresql://admin:PASSWORD@${RDS_ENDPOINT}:5432/family_hub" \
  --type SecureString \
  --overwrite
```

### 2. Redis/ElastiCache Configuration

```bash
# If using ElastiCache Redis
aws ssm put-parameter \
  --name /family-hub/redis/url \
  --value "redis://family-hub-redis.xxxxx.ng.0001.use1.cache.amazonaws.com:6379" \
  --type SecureString \
  --overwrite

# Or for local Redis (development)
aws ssm put-parameter \
  --name /family-hub/redis/url \
  --value "redis://localhost:6379" \
  --type String \
  --overwrite
```

### 3. Authentication (Clerk)

```bash
# Get from Clerk dashboard: https://dashboard.clerk.com
aws ssm put-parameter \
  --name /family-hub/clerk/publishable-key \
  --value "pk_live_xxxxxxxxxxxxx" \
  --type String \
  --overwrite

aws ssm put-parameter \
  --name /family-hub/clerk/secret-key \
  --value "sk_live_xxxxxxxxxxxxx" \
  --type SecureString \
  --overwrite
```

### 4. Payment Processing (Stripe)

```bash
# Get from Stripe dashboard: https://dashboard.stripe.com
aws ssm put-parameter \
  --name /family-hub/stripe/secret-key \
  --value "sk_live_xxxxxxxxxxxxx" \
  --type SecureString \
  --overwrite

aws ssm put-parameter \
  --name /family-hub/stripe/publishable-key \
  --value "pk_live_xxxxxxxxxxxxx" \
  --type String \
  --overwrite

aws ssm put-parameter \
  --name /family-hub/stripe/webhook-secret \
  --value "whsec_xxxxxxxxxxxxx" \
  --type SecureString \
  --overwrite
```

### 5. Real-time Communication (Pusher)

```bash
# Get from Pusher dashboard: https://dashboard.pusher.com
aws ssm put-parameter \
  --name /family-hub/pusher/app-id \
  --value "1234567" \
  --type String \
  --overwrite

aws ssm put-parameter \
  --name /family-hub/pusher/key \
  --value "xxxxxxxxxxxxx" \
  --type String \
  --overwrite

aws ssm put-parameter \
  --name /family-hub/pusher/secret \
  --value "xxxxxxxxxxxxx" \
  --type SecureString \
  --overwrite

aws ssm put-parameter \
  --name /family-hub/pusher/cluster \
  --value "mt1" \
  --type String \
  --overwrite
```

### 6. Weather API (OpenWeather)

```bash
# Get from OpenWeather: https://openweathermap.org/api
aws ssm put-parameter \
  --name /family-hub/openweather/api-key \
  --value "xxxxxxxxxxxxx" \
  --type SecureString \
  --overwrite
```

### 7. Application URLs

```bash
# Deployment URL
aws ssm put-parameter \
  --name /family-hub/deployment-url \
  --value "https://familyhub.example.com" \
  --type String \
  --overwrite

# API URL (if different from deployment URL)
aws ssm put-parameter \
  --name /family-hub/api-url \
  --value "https://api.familyhub.example.com" \
  --type String \
  --overwrite
```

### 8. AWS S3 Configuration (for file uploads)

```bash
# S3 bucket for media uploads
aws ssm put-parameter \
  --name /family-hub/s3/bucket \
  --value "family-hub-media-uploads" \
  --type String \
  --overwrite

# AWS region
aws ssm put-parameter \
  --name /family-hub/s3/region \
  --value "us-east-1" \
  --type String \
  --overwrite
```

### 9. Email Configuration (SES)

```bash
# AWS SES sender email
aws ssm put-parameter \
  --name /family-hub/email/from \
  --value "noreply@familyhub.example.com" \
  --type String \
  --overwrite

# AWS SES region
aws ssm put-parameter \
  --name /family-hub/email/region \
  --value "us-east-1" \
  --type String \
  --overwrite
```

### 10. Logging and Monitoring

```bash
# CloudWatch log group (auto-created by CloudFormation)
aws ssm put-parameter \
  --name /family-hub/logging/level \
  --value "info" \
  --type String \
  --overwrite

# Sentry error tracking (optional)
aws ssm put-parameter \
  --name /family-hub/sentry/dsn \
  --value "https://xxxxxxxxxxxxx@xxxxx.ingest.sentry.io/xxxxx" \
  --type SecureString \
  --overwrite
```

## ECS Task Definition Environment Variables

The CloudFormation template automatically configures these in the task definition:

```json
{
  "environment": [
    {
      "name": "NODE_ENV",
      "value": "production"
    }
  ],
  "secrets": [
    {
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/family-hub/db/url"
    },
    {
      "name": "REDIS_URL",
      "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/family-hub/redis/url"
    },
    {
      "name": "CLERK_PUBLISHABLE_KEY",
      "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/family-hub/clerk/publishable-key"
    },
    {
      "name": "CLERK_SECRET_KEY",
      "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/family-hub/clerk/secret-key"
    }
  ]
}
```

## Local Development (.env file)

For local development, create a `.env.local` file:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/family_hub

# Redis
REDIS_URL=redis://localhost:6379

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx

# Pusher
PUSHER_APP_ID=1234567
PUSHER_KEY=xxxxxxxxxxxxx
PUSHER_SECRET=xxxxxxxxxxxxx
PUSHER_CLUSTER=mt1

# OpenWeather
OPENWEATHER_API_KEY=xxxxxxxxxxxxx

# Application
NODE_ENV=development
DEPLOYMENT_URL=http://localhost:3000
```

## Retrieving Parameters

### Get Single Parameter

```bash
aws ssm get-parameter \
  --name /family-hub/db/url \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text
```

### Get All Parameters

```bash
aws ssm get-parameters-by-path \
  --path /family-hub \
  --recursive \
  --with-decryption \
  --query 'Parameters[*].[Name,Value]' \
  --output table
```

### Export to .env File

```bash
#!/bin/bash
# Export parameters to .env file

aws ssm get-parameters-by-path \
  --path /family-hub \
  --recursive \
  --with-decryption \
  --query 'Parameters[*].[Name,Value]' \
  --output text | while read name value; do
    # Extract parameter name (remove /family-hub/ prefix)
    key=$(echo "$name" | sed 's|/family-hub/||g' | tr '/' '_' | tr '[:lower:]' '[:upper:]')
    echo "${key}=${value}"
  done > .env.aws
```

## Parameter Naming Convention

Use the following naming convention for consistency:

```
/family-hub/{service}/{key}

Examples:
/family-hub/db/url
/family-hub/clerk/secret-key
/family-hub/stripe/secret-key
/family-hub/pusher/app-id
/family-hub/openweather/api-key
/family-hub/s3/bucket
/family-hub/email/from
/family-hub/logging/level
```

## Security Best Practices

### 1. Use SecureString for Sensitive Data

```bash
# ✓ Good - SecureString (encrypted)
aws ssm put-parameter \
  --name /family-hub/stripe/secret-key \
  --value "sk_live_xxxxx" \
  --type SecureString

# ✗ Bad - String (not encrypted)
aws ssm put-parameter \
  --name /family-hub/stripe/secret-key \
  --value "sk_live_xxxxx" \
  --type String
```

### 2. Restrict IAM Access

```bash
# Create policy for ECS task execution role
cat > /tmp/ssm-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameters",
        "ssm:GetParameter"
      ],
      "Resource": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/family-hub/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:us-east-1:ACCOUNT_ID:key/*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name ssm-access \
  --policy-document file:///tmp/ssm-policy.json
```

### 3. Enable Parameter Store Encryption

```bash
# Use AWS KMS for encryption
aws ssm put-parameter \
  --name /family-hub/stripe/secret-key \
  --value "sk_live_xxxxx" \
  --type SecureString \
  --key-id arn:aws:kms:us-east-1:ACCOUNT_ID:key/12345678-1234-1234-1234-123456789012
```

### 4. Audit Parameter Access

```bash
# Enable CloudTrail logging
aws cloudtrail create-trail \
  --name family-hub-trail \
  --s3-bucket-name family-hub-cloudtrail-logs

# Query parameter access
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=/family-hub/stripe/secret-key \
  --max-results 10
```

### 5. Rotate Secrets Regularly

```bash
# Set up automatic rotation for database password
aws secretsmanager rotate-secret \
  --secret-id family-hub-db-password \
  --rotation-rules AutomaticallyAfterDays=30

# Manually rotate a parameter
NEW_PASSWORD=$(openssl rand -base64 32)

aws ssm put-parameter \
  --name /family-hub/db/url \
  --value "postgresql://admin:${NEW_PASSWORD}@${RDS_ENDPOINT}:5432/family_hub" \
  --type SecureString \
  --overwrite
```

## Troubleshooting

### Parameter Not Found

```bash
# List all parameters
aws ssm describe-parameters \
  --filters "Key=Name,Values=/family-hub" \
  --query 'Parameters[*].Name'

# Check parameter details
aws ssm describe-parameters \
  --filters "Key=Name,Values=/family-hub/db/url"
```

### Permission Denied

```bash
# Check IAM role permissions
aws iam get-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name ssm-access

# Verify KMS key permissions
aws kms describe-key \
  --key-id arn:aws:kms:us-east-1:ACCOUNT_ID:key/xxxxx
```

### ECS Task Not Starting

```bash
# Check task logs
aws logs tail /ecs/family-hub-production --follow

# Check task definition
aws ecs describe-task-definition \
  --task-definition family-hub:1 \
  --query 'taskDefinition.containerDefinitions[0].secrets'
```

## Migration from .env to Parameter Store

```bash
#!/bin/bash
# Migrate environment variables from .env to Parameter Store

if [ ! -f ".env" ]; then
    echo "Error: .env file not found"
    exit 1
fi

while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    
    # Convert key to parameter name
    param_name="/family-hub/$(echo "$key" | tr '[:upper:]' '[:lower:]' | sed 's/_/\//g')"
    
    # Determine if sensitive
    if [[ "$key" =~ (SECRET|PASSWORD|KEY|TOKEN) ]]; then
        param_type="SecureString"
    else
        param_type="String"
    fi
    
    # Store parameter
    aws ssm put-parameter \
        --name "$param_name" \
        --value "$value" \
        --type "$param_type" \
        --overwrite
    
    echo "✓ Stored: $param_name"
done < .env

echo "Migration complete!"
```

## Verification Checklist

- [ ] All required parameters are stored in Parameter Store
- [ ] Sensitive parameters use SecureString type
- [ ] IAM role has correct permissions
- [ ] KMS key is configured for encryption
- [ ] ECS task definition references correct parameters
- [ ] CloudWatch logs show successful parameter retrieval
- [ ] Application starts without environment variable errors
- [ ] All external services are accessible
- [ ] Backup of original .env file created
- [ ] Team members trained on parameter management

## References

- [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/)
- [ECS Task Definition Secrets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#secrets)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
