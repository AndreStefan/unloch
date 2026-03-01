# ── Networking ───────────────────────────────────────────

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

# ── Database ─────────────────────────────────────────────

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

# ── Cache ────────────────────────────────────────────────

output "redis_endpoint" {
  description = "ElastiCache primary endpoint"
  value       = module.elasticache.primary_endpoint
  sensitive   = true
}

# ── ECR ──────────────────────────────────────────────────

output "ecr_backend_url" {
  description = "ECR repository URL for backend"
  value       = module.ecr.backend_repo_url
}

output "ecr_ai_service_url" {
  description = "ECR repository URL for AI service"
  value       = module.ecr.ai_service_repo_url
}

# ── ECS ──────────────────────────────────────────────────

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "backend_service_name" {
  description = "Backend ECS service name"
  value       = module.ecs.backend_service_name
}

output "ai_service_service_name" {
  description = "AI service ECS service name"
  value       = module.ecs.ai_service_service_name
}

# ── DNS ──────────────────────────────────────────────────

output "api_url" {
  description = "API URL"
  value       = "https://api.${var.domain_name}"
}

output "dashboard_url" {
  description = "Dashboard URL"
  value       = "https://app.${var.domain_name}"
}

output "patient_app_url" {
  description = "Patient app URL"
  value       = "https://${var.domain_name}"
}

# ── CloudFront ───────────────────────────────────────────

output "dashboard_cf_distribution_id" {
  description = "Dashboard CloudFront distribution ID"
  value       = module.s3_cloudfront.dashboard_cf_distribution_id
}

output "patient_app_cf_distribution_id" {
  description = "Patient app CloudFront distribution ID"
  value       = module.s3_cloudfront.patient_app_cf_distribution_id
}

# ── S3 ───────────────────────────────────────────────────

output "dashboard_bucket_name" {
  description = "Dashboard S3 bucket name"
  value       = module.s3_cloudfront.dashboard_bucket_name
}

output "patient_app_bucket_name" {
  description = "Patient app S3 bucket name"
  value       = module.s3_cloudfront.patient_app_bucket_name
}
