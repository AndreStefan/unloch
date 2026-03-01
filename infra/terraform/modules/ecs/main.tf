# ═══════════════════════════════════════════════════════════
# ECS Fargate — Backend + AI Service + Service Discovery
# ═══════════════════════════════════════════════════════════

data "aws_region" "current" {}

# ── ECS Cluster ─────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = "${var.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = "${var.name_prefix}-cluster" }
}

# ── CloudMap Service Discovery ──────────────────────────

resource "aws_service_discovery_private_dns_namespace" "main" {
  name = "unloch.local"
  vpc  = var.vpc_id

  tags = { Name = "${var.name_prefix}-service-discovery" }
}

resource "aws_service_discovery_service" "backend" {
  name = "backend"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "ai_service" {
  name = "ai-service"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# ── Security Groups ─────────────────────────────────────

resource "aws_security_group" "backend" {
  name_prefix = "${var.name_prefix}-backend-"
  vpc_id      = var.vpc_id
  description = "Backend ECS tasks"

  # Allow inbound from ALB
  ingress {
    from_port       = 4000
    to_port         = 4000
    protocol        = "tcp"
    security_groups = [var.alb_sg_id]
    description     = "HTTP from ALB"
  }

  # Allow all outbound (for RDS, Redis, AI service, AWS APIs)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = { Name = "${var.name_prefix}-backend-sg" }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "ai_service" {
  name_prefix = "${var.name_prefix}-ai-service-"
  vpc_id      = var.vpc_id
  description = "AI service ECS tasks"

  # Allow inbound from backend only
  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
    description     = "HTTP from backend"
  }

  # Allow all outbound (for RDS, Anthropic/OpenAI APIs)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = { Name = "${var.name_prefix}-ai-service-sg" }

  lifecycle {
    create_before_destroy = true
  }
}

# ── Backend Task Definition ─────────────────────────────

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.name_prefix}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.backend_task_role_arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = var.backend_image

    portMappings = [{
      containerPort = 4000
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "4000" },
      { name = "CORS_ORIGIN", value = "https://${var.domain_name},https://app.${var.domain_name}" },
      { name = "AI_SERVICE_URL", value = "http://ai-service.unloch.local:8000" },
    ]

    secrets = [
      { name = "DATABASE_URL", valueFrom = var.database_url_secret_arn },
      { name = "REDIS_URL", valueFrom = var.redis_url_secret_arn },
      { name = "JWT_SECRET", valueFrom = var.jwt_secret_secret_arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = var.backend_log_group
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "backend"
      }
    }

    essential = true
  }])

  tags = { Name = "${var.name_prefix}-backend-task" }
}

# ── Backend Service ─────────────────────────────────────

resource "aws_ecs_service" "backend" {
  name            = "${var.name_prefix}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.backend_desired_count
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = var.private_subnets
    security_groups  = [aws_security_group.backend.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.backend_target_group_arn
    container_name   = "backend"
    container_port   = 4000
  }

  service_registries {
    registry_arn = aws_service_discovery_service.backend.arn
  }

  enable_execute_command = true

  tags = { Name = "${var.name_prefix}-backend-service" }

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}

# ── AI Service Task Definition ──────────────────────────

resource "aws_ecs_task_definition" "ai_service" {
  family                   = "${var.name_prefix}-ai-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.ai_service_cpu
  memory                   = var.ai_service_memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.ai_service_task_role_arn

  container_definitions = jsonencode([{
    name  = "ai-service"
    image = var.ai_service_image

    portMappings = [{
      containerPort = 8000
      protocol      = "tcp"
    }]

    environment = [
      { name = "ENVIRONMENT", value = "production" },
    ]

    secrets = [
      { name = "ANTHROPIC_API_KEY", valueFrom = var.anthropic_key_secret_arn },
      { name = "OPENAI_API_KEY", valueFrom = var.openai_key_secret_arn },
      { name = "DATABASE_URL", valueFrom = var.database_url_secret_arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = var.ai_service_log_group
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "ai-service"
      }
    }

    essential = true
  }])

  tags = { Name = "${var.name_prefix}-ai-service-task" }
}

# ── AI Service ──────────────────────────────────────────

resource "aws_ecs_service" "ai_service" {
  name            = "${var.name_prefix}-ai-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.ai_service.arn
  desired_count   = var.ai_service_desired_count
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = var.private_subnets
    security_groups  = [aws_security_group.ai_service.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.ai_service.arn
  }

  enable_execute_command = true

  tags = { Name = "${var.name_prefix}-ai-service" }

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}

# ── Migration Task Definition ───────────────────────────

resource "aws_ecs_task_definition" "migrate" {
  family                   = "${var.name_prefix}-migrate"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.backend_task_role_arn

  container_definitions = jsonencode([{
    name    = "migrate"
    image   = var.backend_image
    command = ["npx", "prisma", "migrate", "deploy"]

    environment = [
      { name = "NODE_ENV", value = "production" },
    ]

    secrets = [
      { name = "DATABASE_URL", valueFrom = var.database_url_secret_arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = var.backend_log_group
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "migrate"
      }
    }

    essential = true
  }])

  tags = { Name = "${var.name_prefix}-migrate-task" }
}

# ── Auto Scaling ────────────────────────────────────────

resource "aws_appautoscaling_target" "backend" {
  max_capacity       = 6
  min_capacity       = var.backend_desired_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu" {
  name               = "${var.name_prefix}-backend-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_target" "ai_service" {
  max_capacity       = 4
  min_capacity       = var.ai_service_desired_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.ai_service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ai_service_cpu" {
  name               = "${var.name_prefix}-ai-service-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ai_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ai_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ai_service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
