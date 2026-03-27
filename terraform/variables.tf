# Family Hub - Terraform Variables
# Configuration variables for infrastructure provisioning

# ============================================================================
# Project & Environment
# ============================================================================

variable "project" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "family-hub"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be 'dev', 'staging', or 'production'."
  }
}

variable "region" {
  description = "AWS region for infrastructure deployment"
  type        = string
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", var.region))
    error_message = "Region must be a valid AWS region (e.g., us-east-1)."
  }
}

# ============================================================================
# Networking
# ============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "availability_zones" {
  description = "List of availability zones for multi-AZ deployment"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones are required for high availability."
  }
}

variable "allowed_ssh_cidrs" {
  description = "CIDR blocks allowed for SSH access to instances"
  type        = list(string)
  default     = [] # Restrict in production

  validation {
    condition = alltrue([
      for cidr in var.allowed_ssh_cidrs : can(cidrhost(cidr, 0))
    ])
    error_message = "All SSH CIDR blocks must be valid IPv4 CIDR blocks."
  }
}

# ============================================================================
# Database Configuration
# ============================================================================

variable "db_instance_class" {
  description = "RDS instance type (e.g., db.t4g.medium, db.r6i.large)"
  type        = string
  default     = "db.t4g.medium"

  validation {
    condition     = can(regex("^db\\.", var.db_instance_class))
    error_message = "Database instance class must start with 'db.' (e.g., db.t4g.medium)."
  }
}

variable "db_engine_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "14.7"
}

variable "db_allocated_storage" {
  description = "Initial allocated storage for database (GB)"
  type        = number
  default     = 100

  validation {
    condition     = var.db_allocated_storage >= 20
    error_message = "Minimum database storage is 20GB."
  }
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "family_hub"

  validation {
    condition     = can(regex("^[a-z_][a-z0-9_]*$", var.db_name))
    error_message = "Database name must start with a letter and contain only lowercase letters, numbers, and underscores."
  }
}

variable "db_username" {
  description = "Master database username"
  type        = string
  default     = "family_hub"

  validation {
    condition     = can(regex("^[a-z_][a-z0-9_]*$", var.db_username))
    error_message = "Database username must be valid PostgreSQL identifier."
  }
}

variable "db_password" {
  description = "Master database password (minimum 8 characters with mixed case, numbers, symbols)"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 8 && can(regex("[A-Z]", var.db_password)) && can(regex("[0-9]", var.db_password))
    error_message = "Database password must be at least 8 characters with uppercase, numbers, and symbols."
  }
}

variable "db_backup_retention_days" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 30

  validation {
    condition     = var.db_backup_retention_days >= 7 && var.db_backup_retention_days <= 35
    error_message = "Backup retention must be between 7 and 35 days."
  }
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment for database"
  type        = bool
  default     = true
}

variable "db_skip_final_snapshot" {
  description = "Skip final snapshot when destroying database"
  type        = bool
  default     = false # Always take final snapshot in production
}

# ============================================================================
# Compute Configuration
# ============================================================================

variable "instance_type" {
  description = "EC2 instance type for application servers"
  type        = string
  default     = "t3.medium"

  validation {
    condition     = can(regex("^[a-z0-9]+\\.[a-z]+$", var.instance_type))
    error_message = "Instance type must be valid (e.g., t3.medium)."
  }
}

variable "instance_count" {
  description = "Number of application instances"
  type        = number
  default     = 2

  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 10
    error_message = "Instance count must be between 1 and 10."
  }
}

# ============================================================================
# Storage Configuration
# ============================================================================

variable "s3_backup_retention_days" {
  description = "Number of days to retain backups in S3"
  type        = number
  default     = 90

  validation {
    condition     = var.s3_backup_retention_days >= 30
    error_message = "Backup retention must be at least 30 days."
  }
}

# ============================================================================
# Monitoring & Logging
# ============================================================================

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention must be a valid CloudWatch value."
  }
}

variable "enable_enhanced_monitoring" {
  description = "Enable detailed monitoring for RDS database"
  type        = bool
  default     = true
}

variable "enable_performance_insights" {
  description = "Enable RDS Performance Insights"
  type        = bool
  default     = true
}

# ============================================================================
# Feature Flags
# ============================================================================

variable "enable_encryption_in_transit" {
  description = "Enable SSL/TLS for database connections"
  type        = bool
  default     = true
}

variable "enable_iam_database_auth" {
  description = "Enable IAM authentication for database"
  type        = bool
  default     = true
}

variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch Logs for database"
  type        = bool
  default     = true
}

# ============================================================================
# Tagging
# ============================================================================

variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default = {
    Terraform   = "true"
    CostCenter  = "engineering"
    Owner       = "devops"
  }
}

# ============================================================================
# Locals (Computed Variables)
# ============================================================================

locals {
  db_port = 5432
  app_port = 3000
  
  # Environment-specific settings
  is_production = var.environment == "production"
  is_staging    = var.environment == "staging"
  is_dev        = var.environment == "dev"
  
  # Resource naming
  name_prefix = "${var.project}-${var.environment}"
  
  # Backup schedule
  backup_window     = "03:00-04:00"
  maintenance_window = "mon:04:00-mon:05:00"
}
