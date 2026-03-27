# Terraform Infrastructure as Code for AWS Deployment

Complete Terraform configuration for deploying Family Hub to AWS as an alternative to CloudFormation.

## Overview

Terraform provides:
- **Infrastructure as Code**: Version-controlled infrastructure
- **Modularity**: Reusable components for different environments
- **State Management**: Track infrastructure changes
- **Plan & Apply**: Preview changes before applying
- **Multi-environment**: Easy staging/production setup

---

## Project Structure

```
infrastructure/
├── terraform/
│   ├── main.tf                 # Main configuration
│   ├── variables.tf            # Input variables
│   ├── outputs.tf              # Output values
│   ├── terraform.tfvars        # Variable values
│   ├── backend.tf              # State backend config
│   ├── providers.tf            # Provider configuration
│   │
│   ├── modules/
│   │   ├── vpc/                # VPC and networking
│   │   ├── rds/                # RDS database
│   │   ├── ecs/                # ECS cluster and service
│   │   ├── alb/                # Application Load Balancer
│   │   ├── cloudfront/         # CloudFront CDN
│   │   └── monitoring/         # CloudWatch monitoring
│   │
│   ├── environments/
│   │   ├── staging/
│   │   │   ├── terraform.tfvars
│   │   │   └── backend.tf
│   │   │
│   │   └── production/
│   │       ├── terraform.tfvars
│   │       └── backend.tf
│   │
│   └── scripts/
│       ├── init.sh             # Initialize Terraform
│       ├── plan.sh             # Plan changes
│       ├── apply.sh            # Apply changes
│       └── destroy.sh          # Destroy infrastructure
```

---

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "family-hub"
      ManagedBy   = "Terraform"
    }
  }
}
```

---

## Backend Configuration

```hcl
# Local state (development)
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}

# Or S3 remote state (production)
terraform {
  backend "s3" {
    bucket         = "family-hub-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

---

## Variables

```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "ecs_task_cpu" {
  description = "ECS task CPU units"
  type        = number
  default     = 512
}

variable "ecs_task_memory" {
  description = "ECS task memory in MB"
  type        = number
  default     = 1024
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN"
  type        = string
}

variable "docker_image_uri" {
  description = "Docker image URI"
  type        = string
}
```

---

## Terraform Variables File

```hcl
aws_region         = "us-east-1"
environment        = "production"
vpc_cidr           = "10.0.0.0/16"
db_instance_class  = "db.t3.medium"
ecs_task_cpu       = 512
ecs_task_memory    = 1024
ecs_desired_count  = 2
domain_name        = "familyhub.example.com"
certificate_arn    = "arn:aws:acm:us-east-1:123456789012:certificate/xxxxx"
docker_image_uri   = "123456789012.dkr.ecr.us-east-1.amazonaws.com/family-hub:latest"
```

---

## Main Configuration

```hcl
# VPC Module
module "vpc" {
  source = "./modules/vpc"

  environment = var.environment
  vpc_cidr    = var.vpc_cidr
}

# RDS Module
module "rds" {
  source = "./modules/rds"

  environment           = var.environment
  db_instance_class    = var.db_instance_class
  db_allocated_storage = 100
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
}

# ECS Module
module "ecs" {
  source = "./modules/ecs"

  environment         = var.environment
  ecs_task_cpu       = var.ecs_task_cpu
  ecs_task_memory    = var.ecs_task_memory
  ecs_desired_count  = var.ecs_desired_count
  docker_image_uri   = var.docker_image_uri
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  
  database_url = module.rds.database_url
}

# ALB Module
module "alb" {
  source = "./modules/alb"

  environment        = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  ecs_security_group_id = module.ecs.security_group_id
}

# CloudFront Module
module "cloudfront" {
  source = "./modules/cloudfront"

  environment      = var.environment
  alb_dns_name    = module.alb.dns_name
  domain_name     = var.domain_name
  certificate_arn = var.certificate_arn
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"

  environment = var.environment
  ecs_cluster_name = module.ecs.cluster_name
  ecs_service_name = module.ecs.service_name
  rds_instance_id  = module.rds.instance_id
}
```

---

## Deployment

### Initialize Terraform

```bash
# Initialize working directory
terraform init

# Verify initialization
terraform validate

# Format configuration
terraform fmt -recursive
```

### Plan Changes

```bash
# Create execution plan
terraform plan -out=tfplan

# Save plan to file
terraform plan -out=tfplan -var-file="environments/production/terraform.tfvars"

# Show plan details
terraform show tfplan
```

### Apply Changes

```bash
# Apply changes
terraform apply tfplan

# Or apply with auto-approval (use with caution)
terraform apply -auto-approve

# Apply specific resource
terraform apply -target=module.ecs.aws_ecs_service.main
```

### Destroy Infrastructure

```bash
# Destroy all resources
terraform destroy

# Destroy with auto-approval
terraform destroy -auto-approve

# Destroy specific resource
terraform destroy -target=module.ecs.aws_ecs_service.main
```

---

## State Management

### Local State (Development)

```bash
# State file stored locally
terraform state list
terraform state show module.rds.aws_db_instance.main
terraform state rm module.ecs.aws_ecs_service.main
```

### Remote State (Production)

```bash
# Create S3 bucket for state
aws s3 mb s3://family-hub-terraform-state

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket family-hub-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket family-hub-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

---

## Best Practices

1. **Use modules** - Organize code into reusable modules
2. **Separate environments** - Use different tfvars for staging/production
3. **Remote state** - Use S3 + DynamoDB for production
4. **State locking** - Prevent concurrent modifications
5. **Plan before apply** - Always review changes
6. **Version control** - Commit terraform files to Git
7. **Sensitive data** - Use terraform.tfvars.example for templates
8. **Naming conventions** - Use consistent naming across resources
9. **Tagging strategy** - Tag all resources for cost tracking
10. **Documentation** - Document variables and outputs

---

**Last Updated**: 2024-03-22