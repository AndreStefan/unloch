# ═══════════════════════════════════════════════════════════
# RDS PostgreSQL 16 — HIPAA-Compliant Configuration
# ═══════════════════════════════════════════════════════════

# ── Security Group ──────────────────────────────────────

resource "aws_security_group" "rds" {
  name_prefix = "${var.name_prefix}-rds-"
  vpc_id      = var.vpc_id
  description = "RDS PostgreSQL - allow access from ECS services only"

  tags = { Name = "${var.name_prefix}-rds-sg" }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "rds_ingress" {
  count                    = length(var.allowed_sg_ids)
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = var.allowed_sg_ids[count.index]
  security_group_id        = aws_security_group.rds.id
  description              = "PostgreSQL from ECS"
}

# ── Subnet Group ────────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name       = "${var.name_prefix}-db-subnet"
  subnet_ids = var.subnet_ids

  tags = { Name = "${var.name_prefix}-db-subnet-group" }
}

# ── Parameter Group (pgvector + SSL) ───────────────────

resource "aws_db_parameter_group" "main" {
  name   = "${var.name_prefix}-pg16-params"
  family = "postgres16"

  # Enable pgvector extension loading
  parameter {
    name  = "shared_preload_libraries"
    value = "pgvector"
  }

  # Force SSL connections (HIPAA)
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  # Audit logging
  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  tags = { Name = "${var.name_prefix}-pg16-params" }
}

# ── RDS Instance ────────────────────────────────────────

data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = var.db_password_secret_arn
}

resource "aws_db_instance" "main" {
  identifier = "${var.name_prefix}-postgres"

  engine         = "postgres"
  engine_version = "16"
  instance_class = var.instance_class

  db_name  = var.db_name
  username = var.db_username
  password = jsondecode(data.aws_secretsmanager_secret_version.db_password.secret_string)["password"]

  # Storage
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true # HIPAA
  kms_key_id            = var.kms_key_arn

  # High availability
  multi_az = var.multi_az

  # Networking
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false # HIPAA — no public access
  parameter_group_name   = aws_db_parameter_group.main.name

  # Backups (HIPAA: minimum 7 days, using 30)
  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  # Protection
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.name_prefix}-final-snapshot"

  # Monitoring
  performance_insights_enabled          = true
  performance_insights_kms_key_id       = var.kms_key_arn
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports       = ["postgresql", "upgrade"]

  # Auto minor version upgrades
  auto_minor_version_upgrade = true

  tags = { Name = "${var.name_prefix}-postgres" }
}
