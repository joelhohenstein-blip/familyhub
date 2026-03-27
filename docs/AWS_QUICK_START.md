# AWS Deployment Quick Start Guide

This guide provides a fast path to deploy Family Hub to AWS in under 30 minutes.

## Prerequisites (5 minutes)

```bash
# 1. Install AWS CLI
brew install awscli  # macOS
# or download from https://aws.amazon.com/cli/

# 2. Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)

# 3. Verify configuration
aws sts get-caller-identity
# Should show your AWS account ID

# 4. Set environment variables
export AWS_REGION=us-east-1
export ENVIRONMENT=production
export DOMAIN_NAME=familyhub.example.com
```

## Step 1: Create SSL Certificate (5 minutes)

```bash
# Request SSL certificate in ACM
CERT_ARN=$(aws acm request-certificate \
  --domain-name $DOMAIN_NAME \
  --subject-alternative-names www.$DOMAIN_NAME \
  --validation-method DNS \
  --region $AWS_REGION \
  --query 'CertificateArn' \
  --output text)

echo "Certificate ARN: $CERT_ARN"

# Save for later
echo "export CERT_ARN=$CERT_ARN" >> ~/.bashrc
source ~/.bashrc
```

**Note:** You'll need to validate the certificate via DNS. AWS will provide CNAME records to add to your domain.

## Step 2: Deploy Infrastructure with CloudFormation (10 minutes)

```bash
# Create CloudFormation stack
aws cloudformation create-stack \
  --stack-name family-hub-$ENVIRONMENT \
  --template-body file://infrastructure/cloudformation-template.yaml \
  --parameters \
    ParameterKey=EnvironmentName,ParameterValue=$ENVIRONMENT \
    ParameterKey=DomainName,ParameterValue=$DOMAIN_NAME \
    ParameterKey=CertificateArn,ParameterValue=$CERT_ARN \
  --capabilities CAPABILITY_NAMED_IAM \
  --region $AWS_REGION

# Wait for stack creation
aws cloudformation wait stack-create-complete \
  --stack-name family-hub-$ENVIRONMENT \
  --region $AWS_REGION

echo "✓ Infrastructure created!"

# Get outputs
aws cloudformation describe-stacks \
  --stack-name family-hub-$ENVIRONMENT \
  --region $AWS_REGION \
  --query 'Stacks[0].Outputs' \
  --output table
```

## Step 3: Configure Environment Variables (5 minutes)

```bash
# Get RDS endpoint
RDS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name family-hub-$ENVIRONMENT \
  --query 'Stacks[0].Outputs[?OutputKey==`RDSEndpoint`].OutputValue' \
  --output text \
  --region $AWS_REGION)

# Get RDS password from Secrets Manager
DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id family-hub-$ENVIRONMENT-db-secret \
  --query 'SecretString' \
  --output text \
  --region $AWS_REGION | jq -r '.password')

# Store database URL in Parameter Store
aws ssm put-parameter \
  --name /family-hub/db/url \
  --value "postgresql://admin:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/family_hub" \
  --type SecureString \
  --overwrite \
  --region $AWS_REGION

# Store other parameters (see AWS_ENV_VARIABLES.md for complete list)
aws ssm put-parameter \
  --name /family-hub/clerk/publishable-key \
  --value "pk_live_YOUR_KEY_HERE" \
  --type String \
  --overwrite \
  --region $AWS_REGION

aws ssm put-parameter \
  --name /family-hub/clerk/secret-key \
  --value "sk_live_YOUR_KEY_HERE" \
  --type SecureString \
  --overwrite \
  --region $AWS_REGION

# Add other parameters as needed...
echo "✓ Environment variables configured!"
```

## Step 4: Build and Push Docker Image (5 minutes)

```bash
# Get ECR repository URI
ECR_URI=$(aws cloudformation describe-stacks \
  --stack-name family-hub-$ENVIRONMENT \
  --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryUri`].OutputValue' \
  --output text \
  --region $AWS_REGION)

echo "ECR URI: $ECR_URI"

# Build Docker image
docker build -t family-hub:latest .

# Tag for ECR
docker tag family-hub:latest $ECR_URI:latest
docker tag family-hub:latest $ECR_URI:$(git rev-parse --short HEAD)

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_URI

# Push image
docker push $ECR_URI:latest
docker push $ECR_URI:$(git rev-parse --short HEAD)

echo "✓ Docker image pushed to ECR!"
```

## Step 5: Deploy to ECS (5 minutes)

```bash
# Get ECS cluster and service names
ECS_CLUSTER=$(aws cloudformation describe-stacks \
  --stack-name family-hub-$ENVIRONMENT \
  --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
  --output text \
  --region $AWS_REGION)

ECS_SERVICE=$(aws cloudformation describe-stacks \
  --stack-name family-hub-$ENVIRONMENT \
  --query 'Stacks[0].Outputs[?OutputKey==`ECSServiceName`].OutputValue' \
  --output text \
  --region $AWS_REGION)

# Force new deployment
aws ecs update-service \
  --cluster $ECS_CLUSTER \
  --service $ECS_SERVICE \
  --force-new-deployment \
  --region $AWS_REGION

# Wait for service to stabilize
aws ecs wait services-stable \
  --cluster $ECS_CLUSTER \
  --services $ECS_SERVICE \
  --region $AWS_REGION

echo "✓ ECS service deployed!"

# Check service status
aws ecs describe-services \
  --cluster $ECS_CLUSTER \
  --services $ECS_SERVICE \
  --region $AWS_REGION \
  --query 'services[0].[serviceName,status,desiredCount,runningCount]'
```

## Step 6: Configure DNS (5 minutes)

```bash
# Get ALB DNS name
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name family-hub-$ENVIRONMENT \
  --query 'Stacks[0].Outputs[?OutputKey==`ALBDNSName`].OutputValue' \
  --output text \
  --region $AWS_REGION)

echo "ALB DNS: $ALB_DNS"

# Option A: Using Route53 (if domain registered with AWS)
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name $DOMAIN_NAME \
  --query 'HostedZones[0].Id' \
  --output text)

# Create A record pointing to ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "'$DOMAIN_NAME'",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "'$ALB_DNS'",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'

# Option B: Using external registrar
# Log in to your registrar (GoDaddy, Namecheap, etc.)
# Create CNAME record: $DOMAIN_NAME -> $ALB_DNS

echo "✓ DNS configured!"
echo "Note: DNS propagation may take 24-48 hours"
```

## Step 7: Verify Deployment (5 minutes)

```bash
# Wait for DNS propagation (may take a few minutes)
sleep 30

# Test application
curl -I https://$DOMAIN_NAME/health

# Check CloudWatch logs
aws logs tail /ecs/family-hub-$ENVIRONMENT --follow --since 5m

# Verify ECS tasks are running
aws ecs list-tasks \
  --cluster $ECS_CLUSTER \
  --service-name $ECS_SERVICE \
  --region $AWS_REGION

# Check ALB target health
ALB_ARN=$(aws cloudformation describe-stacks \
  --stack-name family-hub-$ENVIRONMENT \
  --query 'Stacks[0].Outputs[?OutputKey==`ALBDNSName`].OutputValue' \
  --output text \
  --region $AWS_REGION)

# Get target group ARN
TG_ARN=$(aws elbv2 describe-target-groups \
  --load-balancer-arn $ALB_ARN \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Check target health
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --region $AWS_REGION \
  --query 'TargetHealthDescriptions[*].[Target.Id,TargetHealth.State,TargetHealth.Description]'

echo "✓ Deployment verified!"
```

## Automated Deployment Script

For faster deployments, use the provided automation script:

```bash
# Make script executable
chmod +x scripts/deploy-aws.sh

# Run deployment
./scripts/deploy-aws.sh --environment production

# Or with dry-run to preview changes
./scripts/deploy-aws.sh --environment production --dry-run
```

## Troubleshooting

### ECS Tasks Not Starting

```bash
# Check task logs
aws logs tail /ecs/family-hub-$ENVIRONMENT --follow

# Check task status
TASK_ARN=$(aws ecs list-tasks \
  --cluster $ECS_CLUSTER \
  --service-name $ECS_SERVICE \
  --region $AWS_REGION \
  --query 'taskArns[0]' \
  --output text)

aws ecs describe-tasks \
  --cluster $ECS_CLUSTER \
  --tasks $TASK_ARN \
  --region $AWS_REGION \
  --query 'tasks[0].[lastStatus,desiredStatus,stoppedReason]'
```

### Database Connection Errors

```bash
# Test RDS connectivity
psql -h $RDS_ENDPOINT -U admin -d family_hub -c "SELECT NOW();"

# Check security group
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=*rds*" \
  --region $AWS_REGION \
  --query 'SecurityGroups[0].IpPermissions'
```

### DNS Not Resolving

```bash
# Check Route53 records
aws route53 list-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --query 'ResourceRecordSets[?Name==`'$DOMAIN_NAME'.`]'

# Flush local DNS cache
sudo dscacheutil -flushcache  # macOS
sudo systemctl restart systemd-resolved  # Linux
ipconfig /flushdns  # Windows
```

### SSL Certificate Not Valid

```bash
# Check certificate status
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region $AWS_REGION \
  --query 'Certificate.[Status,DomainValidationOptions]'

# Validate certificate via DNS
# Add CNAME records provided by AWS to your domain
```

## Post-Deployment Checklist

- [ ] Application is accessible at https://$DOMAIN_NAME
- [ ] Health check endpoint returns 200: /health
- [ ] CloudWatch logs show no errors
- [ ] ECS tasks are running and healthy
- [ ] RDS database is accessible
- [ ] SSL certificate is valid
- [ ] DNS is resolving correctly
- [ ] All environment variables are configured
- [ ] Backups are enabled
- [ ] Monitoring and alarms are configured

## Next Steps

1. **Set up monitoring**: See [AWS_MONITORING.md](AWS_MONITORING.md)
2. **Configure backups**: See [DEPLOY_AWS.md](DEPLOY_AWS.md#step-10-backup-and-disaster-recovery)
3. **Enable auto-scaling**: See [DEPLOY_AWS.md](DEPLOY_AWS.md#step-11-auto-scaling-configuration)
4. **Set up CI/CD**: Create GitHub Actions workflow for automated deployments
5. **Configure CDN**: Set up CloudFront for static assets

## Cost Estimation

Typical monthly costs for production deployment:

| Service | Size | Cost |
|---------|------|------|
| ECS Fargate | 2 tasks × 512 CPU, 1GB RAM | $30-50 |
| RDS PostgreSQL | db.t3.medium, 100GB | $50-80 |
| ALB | 1 ALB | $15-20 |
| NAT Gateway | 1 NAT | $30-45 |
| Data Transfer | ~100GB | $10-20 |
| **Total** | | **$135-215** |

*Costs vary by region and usage. Use AWS Cost Calculator for accurate estimates.*

## Support

- **AWS Documentation**: https://docs.aws.amazon.com/
- **AWS Support**: https://console.aws.amazon.com/support/
- **Community**: https://forums.aws.amazon.com/

---

**Estimated Total Time**: 30-45 minutes (including DNS propagation)
