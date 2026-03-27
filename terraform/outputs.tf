# Family Hub - Terraform Outputs
# Exported values for reference and integration with other systems

# ============================================================================
# Network Outputs
# ============================================================================

output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "nat_gateway_ips" {
  description = "Public IP addresses of NAT gateways"
  value       = aws_eip.nat[*].public_ip
}

# ============================================================================
# Load Balancer Outputs
# ============================================================================

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name

  depends_on = [aws_lb.main]
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "target_group_arn" {
  description = "ARN of the target group"
  value       = aws_lb_target_group.main.arn
}

# ============================================================================
# Database Outputs
# ============================================================================

output "rds_endpoint" {
  description = "RDS database endpoint (host:port)"
  value       = aws_db_instance.main.endpoint
  sensitive   = false
}

output "rds_database_name" {
  description = "Name of the RDS database"
  value       = aws_db_instance.main.db_name
}

output "rds_master_username" {
  description = "Master username for RDS database"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "rds_port" {
  description = "Database port"
  value       = aws_db_instance.main.port
}

output "rds_instance_id" {
  description = "RDS instance identifier"
  value       = aws_db_instance.main.identifier
}

output "rds_resource_id" {
  description = "RDS instance resource ID"
  value       = aws_db_instance.main.resource_id
}

output "rds_engine" {
  description = "Database engine"
  value       = aws_db_instance.main.engine
}

output "rds_engine_version" {
  description = "Database engine version"
  value       = aws_db_instance.main.engine_version
}

output "rds_allocated_storage" {
  description = "Allocated storage in GB"
  value       = aws_db_instance.main.allocated_storage
}

output "rds_storage_encrypted" {
  description = "Whether storage is encrypted"
  value       = aws_db_instance.main.storage_encrypted
}

output "rds_backup_retention_period" {
  description = "Backup retention period in days"
  value       = aws_db_instance.main.backup_retention_period
}

output "database_url" {
  description = "PostgreSQL connection string (without password)"
  value       = "postgresql://${aws_db_instance.main.username}:****@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
  sensitive   = false
}

output "database_url_full" {
  description = "PostgreSQL connection string with credentials (sensitive)"
  value       = "postgresql://${aws_db_instance.main.username}:${var.db_password}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}?sslmode=require"
  sensitive   = true
}

# ============================================================================
# Container Registry Outputs
# ============================================================================

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.main.repository_url
}

output "ecr_repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.main.arn
}

output "ecr_registry_id" {
  description = "AWS account ID (ECR registry ID)"
  value       = aws_ecr_repository.main.registry_id
}

output "ecr_repository_name" {
  description = "Name of the ECR repository"
  value       = aws_ecr_repository.main.name
}

# ============================================================================
# Security Group Outputs
# ============================================================================

output "alb_security_group_id" {
  description = "Security group ID for ALB"
  value       = aws_security_group.alb.id
}

output "app_security_group_id" {
  description = "Security group ID for application instances"
  value       = aws_security_group.app.id
}

output "database_security_group_id" {
  description = "Security group ID for database"
  value       = aws_security_group.database.id
}

output "security_groups" {
  description = "All security group IDs"
  value = {
    alb      = aws_security_group.alb.id
    app      = aws_security_group.app.id
    database = aws_security_group.database.id
  }
}

# ============================================================================
# Storage Outputs
# ============================================================================

output "s3_backup_bucket_name" {
  description = "Name of the S3 bucket for backups"
  value       = aws_s3_bucket.backups.id
}

output "s3_backup_bucket_arn" {
  description = "ARN of the S3 bucket for backups"
  value       = aws_s3_bucket.backups.arn
}

output "s3_backup_bucket_region" {
  description = "Region of the S3 bucket"
  value       = aws_s3_bucket.backups.region
}

# ============================================================================
# IAM Outputs
# ============================================================================

output "app_role_arn" {
  description = "ARN of the application IAM role"
  value       = aws_iam_role.app_role.arn
}

output "app_role_name" {
  description = "Name of the application IAM role"
  value       = aws_iam_role.app_role.name
}

# ============================================================================
# Monitoring Outputs
# ============================================================================

output "app_log_group_name" {
  description = "CloudWatch log group for application"
  value       = aws_cloudwatch_log_group.app.name
}

output "database_log_group_name" {
  description = "CloudWatch log group for database"
  value       = aws_cloudwatch_log_group.database.name
}

output "db_cpu_alarm_name" {
  description = "Name of the database CPU alarm"
  value       = aws_cloudwatch_metric_alarm.db_cpu.alarm_name
}

output "db_storage_alarm_name" {
  description = "Name of the database storage alarm"
  value       = aws_cloudwatch_metric_alarm.db_storage.alarm_name
}

output "alb_unhealthy_hosts_alarm_name" {
  description = "Name of the ALB unhealthy hosts alarm"
  value       = aws_cloudwatch_metric_alarm.alb_unhealthy_hosts.alarm_name
}

# ============================================================================
# Summary Outputs
# ============================================================================

output "environment_summary" {
  description = "Summary of the deployed environment"
  value = {
    project             = var.project
    environment         = var.environment
    region              = var.region
    vpc_id              = aws_vpc.main.id
    alb_dns_name        = aws_lb.main.dns_name
    database_endpoint   = aws_db_instance.main.endpoint
    ecr_repository_url  = aws_ecr_repository.main.repository_url
    s3_backup_bucket    = aws_s3_bucket.backups.id
  }
}

output "deployment_instructions" {
  description = "Instructions for deploying the application"
  value = <<-EOT
    1. Push Docker image to ECR:
       aws ecr get-login-password --region ${var.region} | docker login --username AWS --password-stdin ${aws_ecr_repository.main.repository_url}
       docker tag my-app:latest ${aws_ecr_repository.main.repository_url}:latest
       docker push ${aws_ecr_repository.main.repository_url}:latest

    2. Configure database connection:
       DATABASE_URL=postgresql://${aws_db_instance.main.username}:PASSWORD@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}?sslmode=require

    3. Configure S3 backup bucket:
       S3_BUCKET=${aws_s3_bucket.backups.id}

    4. Access application via ALB:
       http://${aws_lb.main.dns_name}

    5. Monitor logs:
       aws logs tail ${aws_cloudwatch_log_group.app.name} --follow

    6. Monitor database:
       aws rds describe-db-instances --db-instance-identifier ${aws_db_instance.main.identifier} --region ${var.region}
  EOT
}

# ============================================================================
# Cost Analysis Outputs
# ============================================================================

output "estimated_monthly_costs" {
  description = "Estimated monthly AWS costs (rough estimate)"
  value = {
    database        = "~$50-150 (RDS PostgreSQL ${var.db_instance_class})"
    load_balancer   = "~$15 (ALB)"
    data_transfer   = "~$20-50 (variable)"
    storage_backup  = "~$3-10 (S3 backups)"
    monitoring      = "~$10 (CloudWatch)"
    total_estimate  = "~$100-250/month"
  }
}
