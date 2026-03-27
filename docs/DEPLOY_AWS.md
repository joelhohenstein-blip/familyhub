# AWS Deployment Guide for Family Hub

This guide provides step-by-step instructions for deploying the Family Hub application to AWS using EC2/ECS, RDS PostgreSQL, CloudFront CDN, and Route53 DNS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Step 1: Set Up RDS PostgreSQL](#step-1-set-up-rds-postgresql)
4. [Step 2: Create EC2/ECS Cluster](#step-2-create-ec2ecs-cluster)
5. [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
6. [Step 4: Build and Push Docker Image](#step-4-build-and-push-docker-image)
7. [Step 5: Deploy to ECS](#step-5-deploy-to-ecs)
8. [Step 6: Set Up CloudFront CDN](#step-6-set-up-cloudfront-cdn)
9. [Step 7: Configure Route53 DNS](#step-7-configure-route53-dns)
10. [Step 8: SSL/TLS with ACM](#step-8-ssltls-with-acm)
11. [Step 9: Monitoring and Logging](#step-9-monitoring-and-logging)
12. [Step 10: Backup and Disaster Recovery](#step-10-backup-and-disaster-recovery)
13. [Troubleshooting](#troubleshooting)
14. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

Before starting, ensure you have:

- **AWS Account** with appropriate permissions (IAM user with EC2, RDS, ECS, CloudFront, Route53, ACM, CloudWatch access)
- **AWS CLI** installed and configured: `aws configure`
- **Docker** installed locally for building images
- **Domain name** registered (can use Route53 or external registrar)
- **Git** for version control
- **Bun** or **Node.js** for local development
- **PostgreSQL client** (`psql`) for database management

### Install AWS CLI

```bash
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version
```

### Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter default region (e.g., us-east-1)
# Enter default output format (json)
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Route53 DNS                          │
│                   (familyhub.example.com)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    CloudFront CDN                           │
│              (Global Content Distribution)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Application Load Balancer                 │
│                    (ECS Service Port 3000)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    ECS Cluster                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ ECS Task 1   │  │ ECS Task 2   │  │ ECS Task 3   │      │
│  │ (Container)  │  │ (Container)  │  │ (Container)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌────▼──────────┐ ┌──▼──────────────┐
│  RDS PostgreSQL│ │  ElastiCache  │ │  S3 (Static)   │
│   (Primary +   │ │    (Redis)    │ │   (Assets)     │
│   Standby)     │ │               │ │                │
└────────────────┘ └───────────────┘ └────────────────┘
```

---

## Step 1: Set Up RDS PostgreSQL

### 1.1 Create RDS Instance via AWS Console

1. Go to **AWS Console** → **RDS** → **Databases** → **Create database**

2. **Engine options:**
   - Engine type: `PostgreSQL`
   - Version: `16.1` (or latest)
   - Templates: `Production` (for Multi-AZ)

3. **Settings:**
   - DB instance identifier: `family-hub-db`
   - Master username: `admin`
   - Master password: Generate strong password (save securely)

4. **Instance configuration:**
   - DB instance class: `db.t3.medium` (start here, scale as needed)
   - Storage: `100 GB` with `gp3` (General Purpose SSD)
   - Storage autoscaling: Enable (max 1000 GB)

5. **Connectivity:**
   - VPC: Default or create new
   - DB subnet group: Create new
   - Public accessibility: `No` (access via EC2 only)
   - VPC security group: Create new `family-hub-db-sg`

6. **Database options:**
   - Initial database name: `family_hub`
   - Parameter group: Default
   - Option group: Default
   - Backup retention: `30 days`
   - Backup window: `03:00-04:00 UTC`
   - Multi-AZ deployment: `Yes` (for production)

7. **Monitoring:**
   - Enable CloudWatch logs: `PostgreSQL error log`, `PostgreSQL general log`
   - Enable Performance Insights: `Yes`

8. Click **Create database** and wait 5-10 minutes for creation

### 1.2 Configure RDS Security Group

```bash
# Get RDS security group ID
RDS_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=family-hub-db-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

# Allow inbound PostgreSQL from EC2 security group
EC2_SG="sg-xxxxxxxxx"  # Replace with your EC2 security group ID

aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $EC2_SG
```

### 1.3 Get RDS Endpoint

```bash
# Get RDS endpoint
aws rds describe-db-instances \
  --db-instance-identifier family-hub-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

Save the endpoint (e.g., `family-hub-db.c9akciq32.us-east-1.rds.amazonaws.com`)

### 1.4 Create Database and Run Migrations

```bash
# From your local machine or EC2 instance
export DATABASE_URL="postgresql://admin:PASSWORD@family-hub-db.c9akciq32.us-east-1.rds.amazonaws.com:5432/family_hub"

# Test connection
psql $DATABASE_URL -c "SELECT NOW();"

# Run migrations
bun run db:push

# Seed initial data (optional)
bun run db:seed
```

---

## Step 2: Create EC2/ECS Cluster

### 2.1 Create ECS Cluster

```bash
# Create ECS cluster
aws ecs create-cluster \
  --cluster-name family-hub-cluster \
  --region us-east-1

# Verify cluster creation
aws ecs describe-clusters \
  --clusters family-hub-cluster \
  --region us-east-1
```

### 2.2 Create EC2 Instances (Optional - for EC2 launch type)

If using **EC2 launch type** instead of Fargate:

```bash
# Create security group for EC2
aws ec2 create-security-group \
  --group-name family-hub-ec2-sg \
  --description "Security group for Family Hub EC2 instances"

EC2_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=family-hub-ec2-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

# Allow inbound HTTP/HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow inbound SSH (restrict to your IP)
aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG \
  --protocol tcp \
  --port 22 \
  --cidr YOUR_IP/32
```

### 2.3 Create Application Load Balancer

```bash
# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name family-hub-alb \
  --subnets subnet-xxxxxxxx subnet-yyyyyyyy \
  --security-groups $EC2_SG \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Create target group
TG_ARN=$(aws elbv2 create-target-group \
  --name family-hub-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxxxxxxx \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN
```

---

## Step 3: Configure Environment Variables

### 3.1 Create Parameter Store Entries

Store sensitive configuration in AWS Systems Manager Parameter Store:

```bash
# Database
aws ssm put-parameter \
  --name /family-hub/db/url \
  --value "postgresql://admin:PASSWORD@family-hub-db.c9akciq32.us-east-1.rds.amazonaws.com:5432/family_hub" \
  --type SecureString \
  --overwrite

# Redis (ElastiCache)
aws ssm put-parameter \
  --name /family-hub/redis/url \
  --value "redis://family-hub-redis.xxxxx.ng.0001.use1.cache.amazonaws.com:6379" \
  --type SecureString \
  --overwrite

# Clerk Authentication
aws ssm put-parameter \
  --name /family-hub/clerk/publishable-key \
  --value "pk_live_xxxxx" \
  --type String \
  --overwrite

aws ssm put-parameter \
  --name /family-hub/clerk/secret-key \
  --value "sk_live_xxxxx" \
  --type SecureString \
  --overwrite

# Stripe
aws ssm put-parameter \
  --name /family-hub/stripe/secret-key \
  --value "sk_live_xxxxx" \
  --type SecureString \
  --overwrite

# Pusher
aws ssm put-parameter \
  --name /family-hub/pusher/app-id \
  --value "xxxxx" \
  --type String \
  --overwrite

aws ssm put-parameter \
  --name /family-hub/pusher/key \
  --value "xxxxx" \
  --type String \
  --overwrite

aws ssm put-parameter \
  --name /family-hub/pusher/secret \
  --value "xxxxx" \
  --type SecureString \
  --overwrite

aws ssm put-parameter \
  --name /family-hub/pusher/cluster \
  --value "mt1" \
  --type String \
  --overwrite

# OpenWeather API
aws ssm put-parameter \
  --name /family-hub/openweather/api-key \
  --value "xxxxx" \
  --type SecureString \
  --overwrite

# Deployment URL
aws ssm put-parameter \
  --name /family-hub/deployment-url \
  --value "https://familyhub.example.com" \
  --type String \
  --overwrite
```

### 3.2 Create IAM Role for ECS Task Execution

```bash
# Create trust policy
cat > /tmp/ecs-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file:///tmp/ecs-trust-policy.json

# Attach policy for ECR and CloudWatch
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Create policy for Parameter Store access
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

# Attach SSM policy
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name ssm-access \
  --policy-document file:///tmp/ssm-policy.json
```

---

## Step 4: Build and Push Docker Image

### 4.1 Create ECR Repository

```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name family-hub \
  --region us-east-1

# Get ECR URI
ECR_URI=$(aws ecr describe-repositories \
  --repository-names family-hub \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "ECR URI: $ECR_URI"
```

### 4.2 Build Docker Image

```bash
# Clone repository (if not already done)
git clone https://github.com/your-org/family-hub.git
cd family-hub

# Build image
docker build -t family-hub:latest .

# Tag image for ECR
docker tag family-hub:latest $ECR_URI:latest
docker tag family-hub:latest $ECR_URI:$(git rev-parse --short HEAD)
```

### 4.3 Push to ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_URI

# Push image
docker push $ECR_URI:latest
docker push $ECR_URI:$(git rev-parse --short HEAD)

# Verify push
aws ecr describe-images \
  --repository-name family-hub \
  --query 'imageDetails[*].[imageTags,imageSizeInBytes]'
```

---

## Step 5: Deploy to ECS

### 5.1 Create ECS Task Definition

```bash
# Create task definition JSON
cat > /tmp/task-definition.json << 'EOF'
{
  "family": "family-hub",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "family-hub",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/family-hub:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
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
        },
        {
          "name": "STRIPE_SECRET_KEY",
          "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/family-hub/stripe/secret-key"
        },
        {
          "name": "PUSHER_APP_ID",
          "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/family-hub/pusher/app-id"
        },
        {
          "name": "PUSHER_KEY",
          "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/family-hub/pusher/key"
        },
        {
          "name": "PUSHER_SECRET",
          "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/family-hub/pusher/secret"
        },
        {
          "name": "PUSHER_CLUSTER",
          "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/family-hub/pusher/cluster"
        },
        {
          "name": "OPENWEATHER_API_KEY",
          "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/family-hub/openweather/api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/family-hub",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ],
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskRole"
}
EOF

# Replace ACCOUNT_ID with your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
sed -i "s/ACCOUNT_ID/$ACCOUNT_ID/g" /tmp/task-definition.json

# Register task definition
aws ecs register-task-definition \
  --cli-input-json file:///tmp/task-definition.json
```

### 5.2 Create CloudWatch Log Group

```bash
# Create log group
aws logs create-log-group \
  --log-group-name /ecs/family-hub \
  --region us-east-1

# Set retention
aws logs put-retention-policy \
  --log-group-name /ecs/family-hub \
  --retention-in-days 30
```

### 5.3 Create ECS Service

```bash
# Get VPC and subnet information
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text)

SUBNETS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[*].SubnetId' \
  --output text)

# Create security group for ECS tasks
ECS_SG=$(aws ec2 create-security-group \
  --group-name family-hub-ecs-sg \
  --description "Security group for Family Hub ECS tasks" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

# Allow inbound from ALB
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG \
  --protocol tcp \
  --port 3000 \
  --source-group $ECS_SG

# Create ECS service
aws ecs create-service \
  --cluster family-hub-cluster \
  --service-name family-hub-service \
  --task-definition family-hub:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=$TG_ARN,containerName=family-hub,containerPort=3000 \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100" \
  --enable-ecs-managed-tags
```

### 5.4 Verify Deployment

```bash
# Check service status
aws ecs describe-services \
  --cluster family-hub-cluster \
  --services family-hub-service \
  --query 'services[0].[serviceName,status,desiredCount,runningCount]'

# Check task status
aws ecs list-tasks \
  --cluster family-hub-cluster \
  --service-name family-hub-service

# Get task details
TASK_ARN=$(aws ecs list-tasks \
  --cluster family-hub-cluster \
  --service-name family-hub-service \
  --query 'taskArns[0]' \
  --output text)

aws ecs describe-tasks \
  --cluster family-hub-cluster \
  --tasks $TASK_ARN \
  --query 'tasks[0].[taskArn,lastStatus,desiredStatus]'
```

---

## Step 6: Set Up CloudFront CDN

### 6.1 Create CloudFront Distribution

```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names family-hub-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Create CloudFront distribution JSON
cat > /tmp/cloudfront-config.json << 'EOF'
{
  "CallerReference": "family-hub-$(date +%s)",
  "Comment": "Family Hub CDN Distribution",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "family-hub-alb",
        "DomainName": "ALB_DNS_NAME",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "family-hub-alb",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    },
    "CachedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": {
        "Forward": "all"
      },
      "Headers": {
        "Quantity": 0
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 0,
    "MaxTTL": 0
  },
  "CacheBehaviors": [
    {
      "PathPattern": "/static/*",
      "TargetOriginId": "family-hub-alb",
      "ViewerProtocolPolicy": "https-only",
      "AllowedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      },
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      },
      "Compress": true,
      "ForwardedValues": {
        "QueryString": false,
        "Cookies": {
          "Forward": "none"
        }
      },
      "MinTTL": 0,
      "DefaultTTL": 86400,
      "MaxTTL": 31536000
    }
  ],
  "Enabled": true,
  "HttpVersion": "http2and3"
}
EOF

# Replace ALB DNS name
sed -i "s/ALB_DNS_NAME/$ALB_DNS/g" /tmp/cloudfront-config.json

# Create distribution
DISTRIBUTION_ID=$(aws cloudfront create-distribution \
  --distribution-config file:///tmp/cloudfront-config.json \
  --query 'Distribution.Id' \
  --output text)

echo "CloudFront Distribution ID: $DISTRIBUTION_ID"

# Get CloudFront domain name
CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
  --id $DISTRIBUTION_ID \
  --query 'Distribution.DomainName' \
  --output text)

echo "CloudFront Domain: $CLOUDFRONT_DOMAIN"
```

### 6.2 Configure Cache Behaviors

```bash
# Update distribution to add cache behaviors for API endpoints
# API endpoints should NOT be cached
# Static assets should be cached with long TTL

# Get current distribution config
aws cloudfront get-distribution-config \
  --id $DISTRIBUTION_ID > /tmp/dist-config.json

# Edit the JSON to add cache behaviors for:
# - /api/* → No cache (TTL: 0)
# - /health → No cache
# - /static/* → Cache 1 year
# - /assets/* → Cache 1 year

# Update distribution
aws cloudfront update-distribution \
  --id $DISTRIBUTION_ID \
  --distribution-config file:///tmp/dist-config.json
```

---

## Step 7: Configure Route53 DNS

### 7.1 Create Hosted Zone (if not exists)

```bash
# Create hosted zone
ZONE_ID=$(aws route53 create-hosted-zone \
  --name familyhub.example.com \
  --caller-reference "family-hub-$(date +%s)" \
  --query 'HostedZone.Id' \
  --output text)

echo "Hosted Zone ID: $ZONE_ID"

# Get nameservers
aws route53 get-hosted-zone \
  --id $ZONE_ID \
  --query 'DelegationSet.NameServers'
```

### 7.2 Create DNS Records

```bash
# Create A record pointing to CloudFront
cat > /tmp/route53-changes.json << 'EOF'
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "familyhub.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "CLOUDFRONT_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.familyhub.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "CLOUDFRONT_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF

# Replace CloudFront domain
sed -i "s/CLOUDFRONT_DOMAIN/$CLOUDFRONT_DOMAIN/g" /tmp/route53-changes.json

# Apply changes
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file:///tmp/route53-changes.json

# Verify DNS propagation
dig familyhub.example.com
nslookup familyhub.example.com
```

### 7.3 Update Domain Registrar (if external)

If your domain is registered with an external registrar (GoDaddy, Namecheap, etc.):

1. Go to your registrar's dashboard
2. Find DNS/Nameserver settings
3. Update nameservers to Route53 nameservers:
   - `ns-xxx.awsdns-xx.com`
   - `ns-xxx.awsdns-xx.co.uk`
   - `ns-xxx.awsdns-xx.net`
   - `ns-xxx.awsdns-xx.org`

4. Wait 24-48 hours for DNS propagation

---

## Step 8: SSL/TLS with ACM

### 8.1 Request SSL Certificate

```bash
# Request certificate for domain
CERT_ARN=$(aws acm request-certificate \
  --domain-name familyhub.example.com \
  --subject-alternative-names www.familyhub.example.com \
  --validation-method DNS \
  --region us-east-1 \
  --query 'CertificateArn' \
  --output text)

echo "Certificate ARN: $CERT_ARN"

# Get certificate details
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1
```

### 8.2 Validate Certificate with DNS

```bash
# Get validation records
VALIDATION_RECORDS=$(aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[*].[DomainName,ResourceRecord]')

# For each validation record, create Route53 entry
# This is typically automated if using Route53 for DNS

# Or use AWS CLI to create validation records automatically
aws acm add-tags-to-certificate \
  --certificate-arn $CERT_ARN \
  --tags Key=Name,Value=family-hub-cert
```

### 8.3 Update CloudFront with SSL Certificate

```bash
# Get current distribution config
aws cloudfront get-distribution-config \
  --id $DISTRIBUTION_ID > /tmp/dist-config.json

# Update the JSON to add:
# - ViewerCertificate with ACM certificate
# - MinimumProtocolVersion: TLSv1.2_2021

# Apply changes
aws cloudfront update-distribution \
  --id $DISTRIBUTION_ID \
  --distribution-config file:///tmp/dist-config.json
```

### 8.4 Update ALB with SSL Certificate

```bash
# Create HTTPS listener on ALB
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --ssl-policy ELBSecurityPolicy-TLS-1-2-2017-01

# Redirect HTTP to HTTPS
aws elbv2 modify-listener \
  --listener-arn $HTTP_LISTENER_ARN \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'
```

---

## Step 9: Monitoring and Logging

### 9.1 Set Up CloudWatch Alarms

```bash
# Create alarm for high CPU usage
aws cloudwatch put-metric-alarm \
  --alarm-name family-hub-high-cpu \
  --alarm-description "Alert when ECS CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=ServiceName,Value=family-hub-service Name=ClusterName,Value=family-hub-cluster

# Create alarm for high memory usage
aws cloudwatch put-metric-alarm \
  --alarm-name family-hub-high-memory \
  --alarm-description "Alert when ECS memory exceeds 80%" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=ServiceName,Value=family-hub-service Name=ClusterName,Value=family-hub-cluster

# Create alarm for RDS CPU
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
  --dimensions Name=DBInstanceIdentifier,Value=family-hub-db

# Create alarm for RDS storage
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
  --dimensions Name=DBInstanceIdentifier,Value=family-hub-db
```

### 9.2 Configure SNS Notifications

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

# Update alarms to send to SNS
aws cloudwatch put-metric-alarm \
  --alarm-name family-hub-high-cpu \
  --alarm-actions $SNS_TOPIC_ARN
```

### 9.3 Enable CloudWatch Logs Insights

```bash
# Query logs for errors
aws logs start-query \
  --log-group-name /ecs/family-hub \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | stats count() by @message'
```

---

## Step 10: Backup and Disaster Recovery

### 10.1 Configure RDS Automated Backups

```bash
# Already configured during RDS creation, but verify:
aws rds describe-db-instances \
  --db-instance-identifier family-hub-db \
  --query 'DBInstances[0].[BackupRetentionPeriod,PreferredBackupWindow]'

# Modify backup retention if needed
aws rds modify-db-instance \
  --db-instance-identifier family-hub-db \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately
```

### 10.2 Create Manual Snapshots

```bash
# Create manual snapshot
SNAPSHOT_ID=$(aws rds create-db-snapshot \
  --db-instance-identifier family-hub-db \
  --db-snapshot-identifier family-hub-backup-$(date +%Y%m%d-%H%M%S) \
  --query 'DBSnapshot.DBSnapshotIdentifier' \
  --output text)

echo "Snapshot ID: $SNAPSHOT_ID"

# List snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier family-hub-db \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime,Status]'
```

### 10.3 Enable RDS Enhanced Monitoring

```bash
# Create IAM role for RDS monitoring
aws iam create-role \
  --role-name rds-monitoring-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "monitoring.rds.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach policy
aws iam attach-role-policy \
  --role-name rds-monitoring-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole

# Enable enhanced monitoring
aws rds modify-db-instance \
  --db-instance-identifier family-hub-db \
  --monitoring-interval 60 \
  --monitoring-role-arn arn:aws:iam::ACCOUNT_ID:role/rds-monitoring-role \
  --apply-immediately
```

### 10.4 Set Up Disaster Recovery Plan

Create a disaster recovery runbook:

```bash
# Document recovery procedures
cat > docs/DISASTER_RECOVERY.md << 'EOF'
# Disaster Recovery Plan

## RDS Failure Recovery

1. **Detect failure**: CloudWatch alarm triggers
2. **Failover to standby**: Automatic (Multi-AZ enabled)
3. **Verify connectivity**: Test database connection
4. **Check application logs**: Review CloudWatch logs
5. **Notify team**: Send SNS alert

## ECS Task Failure Recovery

1. **Detect failure**: ECS health check fails
2. **Auto-restart**: ECS automatically restarts task
3. **Verify service**: Check service status
4. **Scale up if needed**: Increase desired count

## Complete Outage Recovery

1. **Restore from snapshot**:
   ```bash
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier family-hub-db-restored \
     --db-snapshot-identifier <snapshot-id>
   ```

2. **Update connection string** in Parameter Store

3. **Restart ECS service**:
   ```bash
   aws ecs update-service \
     --cluster family-hub-cluster \
     --service family-hub-service \
     --force-new-deployment
   ```

4. **Verify application**: Test all critical flows

## Rollback Procedure

See ROLLBACK_PROCEDURES.md
EOF
```

---

## Step 11: Auto-Scaling Configuration

### 11.1 Set Up ECS Auto-Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/family-hub-cluster/family-hub-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy for CPU
aws application-autoscaling put-scaling-policy \
  --policy-name family-hub-cpu-scaling \
  --service-namespace ecs \
  --resource-id service/family-hub-cluster/family-hub-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleOutCooldown": 60,
    "ScaleInCooldown": 300
  }'

# Create scaling policy for memory
aws application-autoscaling put-scaling-policy \
  --policy-name family-hub-memory-scaling \
  --service-namespace ecs \
  --resource-id service/family-hub-cluster/family-hub-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 80.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageMemoryUtilization"
    },
    "ScaleOutCooldown": 60,
    "ScaleInCooldown": 300
  }'
```

### 11.2 Set Up RDS Auto-Scaling

```bash
# Enable storage auto-scaling (already done during creation)
# Verify it's enabled
aws rds describe-db-instances \
  --db-instance-identifier family-hub-db \
  --query 'DBInstances[0].StorageType'
```

---

## Troubleshooting

### Issue: ECS Tasks Not Starting

```bash
# Check task logs
TASK_ARN=$(aws ecs list-tasks \
  --cluster family-hub-cluster \
  --service-name family-hub-service \
  --query 'taskArns[0]' \
  --output text)

aws ecs describe-tasks \
  --cluster family-hub-cluster \
  --tasks $TASK_ARN \
  --query 'tasks[0].containers[0].lastStatus'

# Check CloudWatch logs
aws logs tail /ecs/family-hub --follow
```

### Issue: Database Connection Errors

```bash
# Verify RDS is running
aws rds describe-db-instances \
  --db-instance-identifier family-hub-db \
  --query 'DBInstances[0].DBInstanceStatus'

# Check security group
aws ec2 describe-security-groups \
  --group-ids sg-xxxxxxxx \
  --query 'SecurityGroups[0].IpPermissions'

# Test connection from EC2
psql -h family-hub-db.c9akciq32.us-east-1.rds.amazonaws.com \
  -U admin \
  -d family_hub \
  -c "SELECT NOW();"
```

### Issue: CloudFront Not Serving Content

```bash
# Check distribution status
aws cloudfront get-distribution \
  --id $DISTRIBUTION_ID \
  --query 'Distribution.Status'

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

# Check origin health
aws cloudfront get-distribution \
  --id $DISTRIBUTION_ID \
  --query 'Distribution.DistributionConfig.Origins'
```

### Issue: DNS Not Resolving

```bash
# Check Route53 records
aws route53 list-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --query 'ResourceRecordSets[?Name==`familyhub.example.com.`]'

# Flush DNS cache (local machine)
# macOS
sudo dscacheutil -flushcache

# Linux
sudo systemctl restart systemd-resolved

# Windows
ipconfig /flushdns
```

---

## Rollback Procedures

### Rollback to Previous ECS Task Definition

```bash
# List task definitions
aws ecs list-task-definitions \
  --family-prefix family-hub \
  --sort DESCENDING \
  --max-results 5

# Update service to use previous task definition
aws ecs update-service \
  --cluster family-hub-cluster \
  --service family-hub-service \
  --task-definition family-hub:2 \
  --force-new-deployment

# Monitor rollback
aws ecs describe-services \
  --cluster family-hub-cluster \
  --services family-hub-service \
  --query 'services[0].[serviceName,status,desiredCount,runningCount]'
```

### Rollback Database to Snapshot

```bash
# List available snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier family-hub-db \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime]'

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier family-hub-db-restored \
  --db-snapshot-identifier family-hub-backup-20240101-120000

# Update connection string
aws ssm put-parameter \
  --name /family-hub/db/url \
  --value "postgresql://admin:PASSWORD@family-hub-db-restored.c9akciq32.us-east-1.rds.amazonaws.com:5432/family_hub" \
  --type SecureString \
  --overwrite

# Restart ECS service
aws ecs update-service \
  --cluster family-hub-cluster \
  --service family-hub-service \
  --force-new-deployment
```

---

## Maintenance Tasks

### Weekly Tasks

```bash
# Check CloudWatch alarms
aws cloudwatch describe-alarms \
  --alarm-names family-hub-high-cpu family-hub-high-memory family-hub-rds-high-cpu

# Review logs for errors
aws logs tail /ecs/family-hub --since 7d | grep ERROR

# Check RDS performance
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=family-hub-db \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum
```

### Monthly Tasks

```bash
# Create manual backup
aws rds create-db-snapshot \
  --db-instance-identifier family-hub-db \
  --db-snapshot-identifier family-hub-backup-$(date +%Y%m%d)

# Review and optimize costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -d '30 days ago' +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE

# Update security patches
aws rds describe-db-instances \
  --db-instance-identifier family-hub-db \
  --query 'DBInstances[0].PendingModifiedValues'
```

---

## Cost Optimization

### Recommended Settings

- **ECS**: Use Fargate Spot for non-critical workloads (70% savings)
- **RDS**: Use Reserved Instances for 1-3 year commitment (40% savings)
- **CloudFront**: Enable compression and caching
- **Data Transfer**: Use VPC endpoints to avoid NAT gateway costs

### Cost Monitoring

```bash
# Set up cost anomaly detection
aws ce put-anomaly-monitor \
  --anomaly-monitor '{
    "MonitorName": "family-hub-cost-monitor",
    "MonitorType": "DIMENSIONAL",
    "MonitorDimension": "SERVICE"
  }'

# Create cost alert
aws ce put-anomaly-subscription \
  --anomaly-subscription '{
    "SubscriptionName": "family-hub-cost-alert",
    "Threshold": 100,
    "Frequency": "DAILY",
    "MonitorArnList": ["arn:aws:ce:us-east-1:ACCOUNT_ID:anomalymonitor/family-hub-cost-monitor"],
    "SubscriptionArn": "arn:aws:sns:us-east-1:ACCOUNT_ID:family-hub-alerts"
  }'
```

---

## Security Best Practices

### 1. Enable VPC Flow Logs

```bash
# Create IAM role for VPC Flow Logs
aws iam create-role \
  --role-name vpc-flow-logs-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "vpc-flow-logs.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Create CloudWatch log group
aws logs create-log-group --log-group-name /aws/vpc/flowlogs

# Enable VPC Flow Logs
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-xxxxxxxx \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/flowlogs \
  --deliver-logs-permission-iam-role-arn arn:aws:iam::ACCOUNT_ID:role/vpc-flow-logs-role
```

### 2. Enable S3 Bucket Encryption

```bash
# Create S3 bucket for static assets
aws s3 mb s3://family-hub-assets-$(date +%s)

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket family-hub-assets-xxxxx \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket family-hub-assets-xxxxx \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### 3. Enable AWS WAF

```bash
# Create WAF Web ACL
aws wafv2 create-web-acl \
  --name family-hub-waf \
  --scope CLOUDFRONT \
  --default-action Block={} \
  --rules '[
    {
      "Name": "AWSManagedRulesCommonRuleSet",
      "Priority": 0,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "OverrideAction": {"None": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSManagedRulesCommonRuleSetMetric"
      }
    }
  ]' \
  --visibility-config \
  SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=family-hub-waf

# Associate WAF with CloudFront
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:us-east-1:ACCOUNT_ID:global/webacl/family-hub-waf/xxxxx \
  --resource-arn arn:aws:cloudfront::ACCOUNT_ID:distribution/$DISTRIBUTION_ID
```

---

## Deployment Checklist

- [ ] AWS account created and configured
- [ ] RDS PostgreSQL instance created and tested
- [ ] ECS cluster created
- [ ] Application Load Balancer configured
- [ ] Docker image built and pushed to ECR
- [ ] ECS task definition created
- [ ] ECS service deployed
- [ ] CloudFront distribution created
- [ ] Route53 hosted zone created
- [ ] DNS records configured
- [ ] SSL certificate requested and validated
- [ ] CloudFront updated with SSL certificate
- [ ] ALB updated with SSL certificate
- [ ] CloudWatch alarms configured
- [ ] SNS notifications configured
- [ ] RDS backups configured
- [ ] Auto-scaling configured
- [ ] Security groups configured
- [ ] IAM roles and policies created
- [ ] Environment variables configured in Parameter Store
- [ ] Health checks verified
- [ ] Smoke tests passed
- [ ] Monitoring and logging verified
- [ ] Disaster recovery plan documented
- [ ] Team trained on deployment procedures

---

## Support and Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **AWS Support**: https://console.aws.amazon.com/support/
- **AWS Well-Architected Framework**: https://aws.amazon.com/architecture/well-architected/
- **AWS Best Practices**: https://aws.amazon.com/architecture/best-practices/

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-03-22 | Initial deployment guide |

---

**Last Updated**: 2024-03-22
**Maintained By**: DevOps Team
**Next Review**: 2024-06-22
