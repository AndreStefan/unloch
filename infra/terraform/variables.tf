# ── General ──────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region (HIPAA-eligible)"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (production, staging)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "unloch"
}

# ── Networking ───────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# ── Database ─────────────────────────────────────────────

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "unloch"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "unloch"
}

variable "db_multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = bool
  default     = true
}

# ── Cache ────────────────────────────────────────────────

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.small"
}

# ── ECS ──────────────────────────────────────────────────

variable "backend_cpu" {
  description = "Backend task CPU units"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Backend task memory (MiB)"
  type        = number
  default     = 1024
}

variable "backend_desired_count" {
  description = "Backend desired task count"
  type        = number
  default     = 2
}

variable "ai_service_cpu" {
  description = "AI service task CPU units"
  type        = number
  default     = 512
}

variable "ai_service_memory" {
  description = "AI service task memory (MiB)"
  type        = number
  default     = 1024
}

variable "ai_service_desired_count" {
  description = "AI service desired task count"
  type        = number
  default     = 2
}

# ── DNS ──────────────────────────────────────────────────

variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "unloch.me"
}

# ── Monitoring ───────────────────────────────────────────

variable "alert_email" {
  description = "Email for CloudWatch alarm notifications"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 90
}
