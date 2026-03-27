# Infrastructure as Code (Terraform) Guide

Family Hub - Production Infrastructure Provisioning with Terraform

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [State Management](#state-management)
5. [Provisioning Steps](#provisioning-steps)
6. [Configuration](#configuration)
7. [Scaling & Maintenance](#scaling--maintenance)
8. [Security Groups](#security-groups)
9. [Monitoring Setup](#monitoring-setup)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers the Terraform Infrastructure as Code (IaC) setup for Family Hub production environment provisioning. Terraform defines all cloud resources declaratively, enabling version control, reproducible deployments, and drift detection.

### What Terraform Provisions

- **Networking**: VPC, subnets, internet gateway, NAT gateway, route tables
- **Compute**: EC2 instances, security groups, elastic IPs
- **Database**: RDS PostgreSQL instance with automated backups
- **Storage**: S3 buckets for backups and media assets
- **Container Registry**: ECR repository for Docker images
- **Load Balancing**: Application Load Balancer (ALB) with health checks
- **IAM**: Roles, policies, and service accounts

### Key Benefits

✅ **Version Control**: Infrastructure changes tracked in Git
✅ **Reproducibility**: Consistent environment provisioning
✅ **Automation**: Fast, reliable infrastructure deployment
✅ **Disaster Recovery**: Infrastructure as code enables rapid recovery
✅ **Cost Tracking**: Resource tagging for cost allocation
✅ **Drift Detection**: Identify manual changes to infrastructure

---

## Prerequisites

### Software Requirements

```bash
# Terraform >= 1.4
terraform --version

# AWS CLI v2
aws --version

# jq for JSON processing
jq --version
```

### AWS Account Setup

1. **Create AWS Account** (if new)
2. **Create IAM User** with programmatic access
   - Attach policy: `Administrator Access` (for testing) or custom least-privilege policy
   - Generate access key and secret

3. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter: AWS Access Key ID
   # Enter: AWS Secret Access Key
   # Enter: Default region (e.g., us-east-1)
   # Enter: Default output format (json)
   ```

4. **Verify Access**
   ```bash
   aws sts get-caller-identity
   ```

### Environment Variables

```bash
# Set AWS region (optional, overrides ~/.aws/config)
export AWS_REGION=us-east-1

# Set workspace (for multi-environment)
export TF_WORKSPACE=production
```

---

## Project Structure

```
terraform/
├── main.tf              # Primary infrastructure configuration
├── variables.tf         # Input variables and their defaults
├── outputs.tf           # Exported values for reference
├── terraform.tfvars     # Environment-specific variable values (DO NOT COMMIT SECRETS)
├── terraform.tfstate    # Current state (managed by remote backend)
├── .terraform.lock.hcl  # Provider version lock
├── .gitignore           # Git exclusions for sensitive files
└── README.md            # Infrastructure documentation

Key directories:
- terraform/environments/: Environment-specific tfvars
- terraform/modules/: Reusable Terraform modules (optional, for advanced setups)
```

### Sample File: .gitignore

```
# Terraform files
*.tfstate
*.tfstate.*
.terraform/
.terraform.lock.hcl
.env
.env.*
!.env.example
terraform.tfvars
```

---

## State Management

### Local State (Development Only)

⚠️ **NOT RECOMMENDED FOR PRODUCTION** - Risk of losing state, no concurrency control

```bash
# Initialize with local state
terraform init
```

### Remote State (Recommended for Production)

Store state in AWS S3 with DynamoDB lock table for concurrent safety.

#### Setup Remote Backend

1. **Create S3 bucket and DynamoDB table** (run once per AWS account):

   ```bash
   # Create S3 bucket for state
   aws s3 mb s3://family-hub-terraform-state-$(date +%s) \
     --region us-east-1
   
   # Enable versioning
   aws s3api put-bucket-versioning \
     --bucket family-hub-terraform-state-XXX \
     --versioning-configuration Status=Enabled \
     --region us-east-1
   
   # Block public access
   aws s3api put-public-access-block \
     --bucket family-hub-terraform-state-XXX \
     --public-access-block-configuration \
     "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
     --region us-east-1
   
   # Create DynamoDB table for state locking
   aws dynamodb create-table \
     --table-name family-hub-terraform-locks \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST \
     --region us-east-1
   ```

2. **Configure Backend** in terraform/main.tf:

   ```hcl
   terraform {
     backend "s3" {
       bucket         = "family-hub-terraform-state-XXX"
       key            = "prod/terraform.tfstate"
       region         = "us-east-1"
       encrypt        = true
       dynamodb_table = "family-hub-terraform-locks"
     }
   }
   ```

3. **Initialize with Remote Backend**:

   ```bash
   cd terraform
   terraform init
   ```

### Workspace Isolation

Use workspaces for environment separation (dev/staging/prod):

```bash
# Create workspace
terraform workspace new staging

# List workspaces
terraform workspace list

# Switch workspace
terraform workspace select staging

# Current workspace
terraform workspace show
```

Each workspace maintains separate state files: `terraform.tfstate.d/{workspace}/`

---

## Provisioning Steps

### 1. Prepare Configuration

```bash
cd terraform

# Copy variables template
cp terraform.tfvars.example terraform.tfvars

# Edit for your environment
editor terraform.tfvars
```

**Example terraform.tfvars**:
```hcl
environment = "production"
region      = "us-east-1"
project     = "family-hub"

# Database
db_instance_class   = "db.t4g.medium"
db_allocated_storage = 100

# Compute
instance_type = "t3.medium"
instance_count = 2

# Networking
vpc_cidr = "10.0.0.0/16"
```

### 2. Plan Infrastructure

```bash
# Format and validate
terraform fmt -recursive
terraform validate

# Generate plan
terraform plan -out=tfplan

# Review plan output carefully
# Check for unexpected deletions or changes
```

### 3. Apply Configuration

```bash
# Apply plan
terraform apply tfplan

# Or apply directly (will prompt for confirmation)
terraform apply

# Confirm with 'yes'
```

### 4. Verify Provisioning

```bash
# Get outputs
terraform output

# Verify in AWS Console or CLI
aws ec2 describe-instances --filters "Name=tag:Project,Values=family-hub"
aws rds describe-db-instances --filters "Name=db-instance-identifier,Values=family-hub-db"
```

---

## Configuration

### Input Variables (variables.tf)

Key variables for customization:

```hcl
variable "environment" {
  description = "Environment name (dev/staging/prod)"
  type        = string
  default     = "dev"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "db_instance_class" {
  description = "RDS instance type"
  type        = string
  default     = "db.t4g.medium"
}

variable "instance_count" {
  description = "Number of EC2 instances"
  type        = number
  default     = 2
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}
```

### Outputs (outputs.tf)

Important exported values:

```hcl
output "alb_dns_name" {
  description = "DNS name of load balancer"
  value       = aws_lb.main.dns_name
}

output "rds_endpoint" {
  description = "RDS database endpoint"
  value       = aws_db_instance.main.endpoint
}

output "ecr_repository_url" {
  description = "ECR repository URL for Docker images"
  value       = aws_ecr_repository.main.repository_url
}

output "security_group_ids" {
  description = "Security group IDs"
  value = {
    alb    = aws_security_group.alb.id
    app    = aws_security_group.app.id
    database = aws_security_group.database.id
  }
}
```

---

## Scaling & Maintenance

### Horizontal Scaling

Scale EC2 instances:

```bash
# Update terraform.tfvars
instance_count = 4

# Apply changes
terraform plan
terraform apply
```

### Database Scaling

Scale RDS instance:

```hcl
# terraform.tfvars
db_instance_class = "db.t4g.large"
```

### Storage Expansion

```bash
# Update allocated storage
terraform apply -var="db_allocated_storage=200"
```

### Updating Infrastructure

```bash
# Update variable
terraform apply -var="instance_type=t3.large"

# Or in tfvars file
editor terraform.tfvars
terraform apply
```

### Destroying Infrastructure

⚠️ **WARNING**: Permanently deletes all resources

```bash
# Review what will be destroyed
terraform plan -destroy

# Destroy
terraform destroy

# Confirm with 'yes'
```

---

## Security Groups

### Configured Security Groups

1. **ALB Security Group** (application-load-balancer)
   - Inbound: HTTP (80), HTTPS (443) from 0.0.0.0/0
   - Outbound: All traffic to app security group

2. **App Security Group** (application instances)
   - Inbound: 3000 from ALB security group
   - Outbound: All traffic (for external APIs)

3. **Database Security Group** (RDS PostgreSQL)
   - Inbound: 5432 from app security group only
   - Outbound: None

### Custom Rules

Modify security groups in main.tf:

```hcl
resource "aws_security_group_rule" "custom_rule" {
  type              = "ingress"
  from_port         = 8080
  to_port           = 8080
  protocol          = "tcp"
  cidr_blocks       = ["YOUR_IP/32"]
  security_group_id = aws_security_group.app.id
}
```

---

## Monitoring Setup

### CloudWatch Integration

Terraform configures CloudWatch for:
- RDS metrics (CPU, storage, connections)
- EC2 metrics (CPU, network I/O)
- Application logs (streamed from containers)

### Accessing Metrics

```bash
# List available metrics
aws cloudwatch list-metrics --namespace "AWS/RDS" \
  --dimensions Name=DBInstanceIdentifier,Value=family-hub-db

# Get metric statistics
aws cloudwatch get-metric-statistics \
  --namespace "AWS/RDS" \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=family-hub-db \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### Setting Alerts

Add to main.tf:

```hcl
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "family-hub-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
```

---

## Troubleshooting

### State Lock Issues

```bash
# View lock
terraform force-unlock LOCK_ID

# Or manually remove from DynamoDB
aws dynamodb scan --table-name family-hub-terraform-locks
aws dynamodb delete-item --table-name family-hub-terraform-locks \
  --key '{"LockID":{"S":"LOCK_ID"}}'
```

### Plan Shows Unexpected Changes

```bash
# Refresh state from AWS
terraform refresh

# Verify no drift
terraform plan

# If drift exists, decide to update terraform.tfstate or modify resource
```

### Resource Creation Fails

```bash
# Check AWS CloudTrail for errors
aws cloudtrail lookup-events --max-results 10

# Verify IAM permissions
aws iam simulate-custom-policy --policy-input-list file://policy.json \
  --action-names ec2:RunInstances
```

### Destroy Fails

```bash
# Retry with more verbose output
terraform destroy -var-file=terraform.tfvars

# If specific resources fail, destroy manually in AWS Console
# Then remove from state
terraform state rm aws_instance.main
```

---

## Best Practices

✅ **Use Remote State**: Always use S3 backend in production
✅ **Version Providers**: Lock provider versions with .terraform.lock.hcl
✅ **Plan Before Apply**: Always review `terraform plan` output
✅ **Separate State**: Use workspaces or separate backends per environment
✅ **Document Changes**: Write meaningful git commit messages for IaC changes
✅ **Tag Resources**: Apply consistent tags for cost allocation and organization
✅ **Monitor State**: Enable S3 versioning and CloudTrail logging
✅ **Backup State**: Regularly backup remote state files

---

## Support

For issues or questions:
1. Check Terraform AWS provider documentation
2. Review AWS service documentation
3. Check CloudTrail for API errors
4. Consult team documentation
