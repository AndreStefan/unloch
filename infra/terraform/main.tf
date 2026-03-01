# ═══════════════════════════════════════════════════════════
# Unloch — AWS Production Infrastructure (HIPAA-Eligible)
# ═══════════════════════════════════════════════════════════

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# ── VPC ──────────────────────────────────────────────────

module "vpc" {
  source = "./modules/vpc"

  name_prefix        = local.name_prefix
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  log_retention_days = var.log_retention_days
}

# ── KMS + Secrets Manager ────────────────────────────────

module "secrets" {
  source = "./modules/secrets"

  name_prefix = local.name_prefix
}

# ── ECR Repositories ────────────────────────────────────

module "ecr" {
  source = "./modules/ecr"

  name_prefix = local.name_prefix
}

# ── RDS PostgreSQL ───────────────────────────────────────

module "rds" {
  source = "./modules/rds"

  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_data_subnet_ids
  allowed_sg_ids     = [module.ecs.backend_sg_id, module.ecs.ai_service_sg_id]
  instance_class     = var.db_instance_class
  db_name            = var.db_name
  db_username        = var.db_username
  multi_az           = var.db_multi_az
  kms_key_arn        = module.secrets.kms_key_arn
  db_password_secret_arn = module.secrets.db_password_secret_arn
}

# ── ElastiCache Redis ────────────────────────────────────

module "elasticache" {
  source = "./modules/elasticache"

  name_prefix    = local.name_prefix
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_data_subnet_ids
  allowed_sg_ids = [module.ecs.backend_sg_id]
  node_type      = var.redis_node_type
  kms_key_arn    = module.secrets.kms_key_arn
  auth_token_secret_arn = module.secrets.redis_auth_token_secret_arn
}

# ── IAM Roles ────────────────────────────────────────────

module "iam" {
  source = "./modules/iam"

  name_prefix           = local.name_prefix
  ecr_backend_arn       = module.ecr.backend_repo_arn
  ecr_ai_service_arn    = module.ecr.ai_service_repo_arn
  secrets_arns          = module.secrets.all_secret_arns
  kms_key_arn           = module.secrets.kms_key_arn
  audit_bucket_arn      = module.s3_cloudfront.audit_bucket_arn
  log_group_arns        = module.monitoring.log_group_arns
  dashboard_bucket_arn  = module.s3_cloudfront.dashboard_bucket_arn
  patient_app_bucket_arn = module.s3_cloudfront.patient_app_bucket_arn
  dashboard_cf_distribution_arn  = module.s3_cloudfront.dashboard_cf_arn
  patient_app_cf_distribution_arn = module.s3_cloudfront.patient_app_cf_arn
}

# ── ALB ──────────────────────────────────────────────────

module "alb" {
  source = "./modules/alb"

  name_prefix     = local.name_prefix
  vpc_id          = module.vpc.vpc_id
  public_subnets  = module.vpc.public_subnet_ids
  domain_name     = var.domain_name
  certificate_arn = module.dns.api_certificate_arn
  log_bucket_id   = module.s3_cloudfront.alb_log_bucket_id
}

# ── ECS Fargate ──────────────────────────────────────────

module "ecs" {
  source = "./modules/ecs"

  name_prefix          = local.name_prefix
  vpc_id               = module.vpc.vpc_id
  private_subnets      = module.vpc.private_app_subnet_ids
  alb_sg_id            = module.alb.alb_sg_id
  backend_target_group_arn = module.alb.backend_target_group_arn

  # Backend config
  backend_image         = "${module.ecr.backend_repo_url}:latest"
  backend_cpu           = var.backend_cpu
  backend_memory        = var.backend_memory
  backend_desired_count = var.backend_desired_count

  # AI service config
  ai_service_image         = "${module.ecr.ai_service_repo_url}:latest"
  ai_service_cpu           = var.ai_service_cpu
  ai_service_memory        = var.ai_service_memory
  ai_service_desired_count = var.ai_service_desired_count

  # IAM
  execution_role_arn       = module.iam.ecs_execution_role_arn
  backend_task_role_arn    = module.iam.backend_task_role_arn
  ai_service_task_role_arn = module.iam.ai_service_task_role_arn

  # Secrets
  database_url_secret_arn    = module.secrets.database_url_secret_arn
  redis_url_secret_arn       = module.secrets.redis_url_secret_arn
  jwt_secret_secret_arn      = module.secrets.jwt_secret_secret_arn
  anthropic_key_secret_arn   = module.secrets.anthropic_key_secret_arn
  openai_key_secret_arn      = module.secrets.openai_key_secret_arn

  # Logging
  backend_log_group    = module.monitoring.backend_log_group_name
  ai_service_log_group = module.monitoring.ai_service_log_group_name

  # Domain
  domain_name = var.domain_name
}

# ── S3 + CloudFront ──────────────────────────────────────

module "s3_cloudfront" {
  source = "./modules/s3_cloudfront"

  name_prefix = local.name_prefix
  domain_name = var.domain_name
  kms_key_arn = module.secrets.kms_key_arn

  patient_app_certificate_arn = module.dns.patient_app_certificate_arn
  dashboard_certificate_arn   = module.dns.dashboard_certificate_arn
}

# ── DNS (Route 53) ───────────────────────────────────────

module "dns" {
  source = "./modules/dns"

  domain_name                      = var.domain_name
  alb_dns_name                     = module.alb.alb_dns_name
  alb_zone_id                      = module.alb.alb_zone_id
  patient_app_cf_domain_name       = module.s3_cloudfront.patient_app_cf_domain_name
  patient_app_cf_hosted_zone_id    = module.s3_cloudfront.patient_app_cf_hosted_zone_id
  dashboard_cf_domain_name         = module.s3_cloudfront.dashboard_cf_domain_name
  dashboard_cf_hosted_zone_id      = module.s3_cloudfront.dashboard_cf_hosted_zone_id
}

# ── Monitoring ───────────────────────────────────────────

module "monitoring" {
  source = "./modules/monitoring"

  name_prefix        = local.name_prefix
  alert_email        = var.alert_email
  log_retention_days = var.log_retention_days
  kms_key_arn        = module.secrets.kms_key_arn
  alb_arn_suffix     = module.alb.alb_arn_suffix
  backend_tg_arn_suffix = module.alb.backend_tg_arn_suffix
  backend_service_name  = module.ecs.backend_service_name
  ecs_cluster_name      = module.ecs.cluster_name
}

# ── Compliance (CloudTrail, VPC Flow Logs) ───────────────

module "compliance" {
  source = "./modules/compliance"

  name_prefix        = local.name_prefix
  kms_key_arn        = module.secrets.kms_key_arn
  audit_bucket_id    = module.s3_cloudfront.audit_bucket_id
  log_retention_days = var.log_retention_days
}
