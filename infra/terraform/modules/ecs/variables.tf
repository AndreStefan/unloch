variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnets" {
  type = list(string)
}

variable "alb_sg_id" {
  type = string
}

variable "backend_target_group_arn" {
  type = string
}

# Backend
variable "backend_image" {
  type = string
}

variable "backend_cpu" {
  type    = number
  default = 512
}

variable "backend_memory" {
  type    = number
  default = 1024
}

variable "backend_desired_count" {
  type    = number
  default = 2
}

# AI Service
variable "ai_service_image" {
  type = string
}

variable "ai_service_cpu" {
  type    = number
  default = 512
}

variable "ai_service_memory" {
  type    = number
  default = 1024
}

variable "ai_service_desired_count" {
  type    = number
  default = 2
}

# IAM
variable "execution_role_arn" {
  type = string
}

variable "backend_task_role_arn" {
  type = string
}

variable "ai_service_task_role_arn" {
  type = string
}

# Secrets
variable "database_url_secret_arn" {
  type = string
}

variable "redis_url_secret_arn" {
  type = string
}

variable "jwt_secret_secret_arn" {
  type = string
}

variable "anthropic_key_secret_arn" {
  type = string
}

variable "openai_key_secret_arn" {
  type = string
}

# Logging
variable "backend_log_group" {
  type = string
}

variable "ai_service_log_group" {
  type = string
}

# Domain
variable "domain_name" {
  type = string
}
