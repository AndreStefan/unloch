# ═══════════════════════════════════════════════════════════
# ElastiCache Redis 7 — HIPAA-Compliant Configuration
# ═══════════════════════════════════════════════════════════

# ── Security Group ──────────────────────────────────────

resource "aws_security_group" "redis" {
  name_prefix = "${var.name_prefix}-redis-"
  vpc_id      = var.vpc_id
  description = "ElastiCache Redis - allow access from backend only"

  tags = { Name = "${var.name_prefix}-redis-sg" }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "redis_ingress" {
  count                    = length(var.allowed_sg_ids)
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = var.allowed_sg_ids[count.index]
  security_group_id        = aws_security_group.redis.id
  description              = "Redis from backend"
}

# ── Subnet Group ────────────────────────────────────────

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.name_prefix}-redis-subnet"
  subnet_ids = var.subnet_ids

  tags = { Name = "${var.name_prefix}-redis-subnet-group" }
}

# ── Redis Replication Group ────────────────────────────

data "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id = var.auth_token_secret_arn
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.name_prefix}-redis"
  description          = "${var.name_prefix} Redis cluster"

  engine         = "redis"
  engine_version = "7.0"
  node_type      = var.node_type
  num_cache_clusters = 2

  # Networking
  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Encryption (HIPAA)
  at_rest_encryption_enabled = true
  kms_key_id                 = var.kms_key_arn
  transit_encryption_enabled = true
  auth_token                 = data.aws_secretsmanager_secret_version.redis_auth.secret_string

  # High availability
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Maintenance
  maintenance_window       = "sun:05:00-sun:06:00"
  snapshot_window          = "04:00-05:00"
  snapshot_retention_limit = 7

  # Auto minor version upgrades
  auto_minor_version_upgrade = true

  tags = { Name = "${var.name_prefix}-redis" }
}
