# ═══════════════════════════════════════════════════════════
# ALB — TLS Termination, WebSocket Support, Access Logging
# ═══════════════════════════════════════════════════════════

# ── Security Group ──────────────────────────────────────

resource "aws_security_group" "alb" {
  name_prefix = "${var.name_prefix}-alb-"
  vpc_id      = var.vpc_id
  description = "ALB - allow HTTP/HTTPS from internet"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP (redirect to HTTPS)"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = { Name = "${var.name_prefix}-alb-sg" }

  lifecycle {
    create_before_destroy = true
  }
}

# ── Application Load Balancer ───────────────────────────

resource "aws_lb" "main" {
  name               = "${var.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnets

  # WebSocket support: extended idle timeout
  idle_timeout = 3600

  # Access logging (HIPAA)
  access_logs {
    bucket  = var.log_bucket_id
    prefix  = "alb-logs"
    enabled = true
  }

  tags = { Name = "${var.name_prefix}-alb" }
}

# ── Backend Target Group ────────────────────────────────

resource "aws_lb_target_group" "backend" {
  name        = "${var.name_prefix}-backend-tg"
  port        = 4000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }

  # Sticky sessions for Socket.IO
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  tags = { Name = "${var.name_prefix}-backend-tg" }
}

# ── HTTPS Listener ──────────────────────────────────────

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  tags = { Name = "${var.name_prefix}-https-listener" }
}

# ── HTTP Listener (redirect to HTTPS) ──────────────────

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = { Name = "${var.name_prefix}-http-redirect" }
}
