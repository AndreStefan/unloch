# ═══════════════════════════════════════════════════════════
# KMS Key + AWS Secrets Manager
# ═══════════════════════════════════════════════════════════

# ── KMS Key (encrypts RDS, ElastiCache, S3 audit, Secrets) ──

resource "aws_kms_key" "main" {
  description             = "${var.name_prefix} master encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = { Name = "${var.name_prefix}-master-key" }
}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.name_prefix}-master-key"
  target_key_id = aws_kms_key.main.key_id
}

# ── Secrets ─────────────────────────────────────────────

resource "aws_secretsmanager_secret" "database_url" {
  name       = "${var.name_prefix}/database-url"
  kms_key_id = aws_kms_key.main.arn

  tags = { Name = "${var.name_prefix}-database-url" }
}

resource "aws_secretsmanager_secret" "db_password" {
  name       = "${var.name_prefix}/db-password"
  kms_key_id = aws_kms_key.main.arn

  tags = { Name = "${var.name_prefix}-db-password" }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    password = random_password.db_password.result
  })
}

resource "random_password" "db_password" {
  length  = 32
  special = true
  # RDS doesn't allow certain characters in passwords
  override_special = "!#$%^&*()-_=+[]{}|:,.<>?"
}

resource "aws_secretsmanager_secret" "redis_url" {
  name       = "${var.name_prefix}/redis-url"
  kms_key_id = aws_kms_key.main.arn

  tags = { Name = "${var.name_prefix}-redis-url" }
}

resource "aws_secretsmanager_secret" "redis_auth_token" {
  name       = "${var.name_prefix}/redis-auth-token"
  kms_key_id = aws_kms_key.main.arn

  tags = { Name = "${var.name_prefix}-redis-auth-token" }
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  secret_id     = aws_secretsmanager_secret.redis_auth_token.id
  secret_string = random_password.redis_auth_token.result
}

resource "random_password" "redis_auth_token" {
  length  = 64
  special = false # ElastiCache auth tokens don't support special chars
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name       = "${var.name_prefix}/jwt-secret"
  kms_key_id = aws_kms_key.main.arn

  tags = { Name = "${var.name_prefix}-jwt-secret" }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret" "anthropic_key" {
  name       = "${var.name_prefix}/anthropic-api-key"
  kms_key_id = aws_kms_key.main.arn

  tags = { Name = "${var.name_prefix}-anthropic-key" }
}

resource "aws_secretsmanager_secret" "openai_key" {
  name       = "${var.name_prefix}/openai-api-key"
  kms_key_id = aws_kms_key.main.arn

  tags = { Name = "${var.name_prefix}-openai-key" }
}
