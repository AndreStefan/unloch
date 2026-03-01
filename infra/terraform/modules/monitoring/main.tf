# ═══════════════════════════════════════════════════════════
# Monitoring — CloudWatch Log Groups, Alarms, Dashboard, SNS
# ═══════════════════════════════════════════════════════════

# ── CloudWatch Log Groups (90-day retention) ────────────

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/${var.name_prefix}/backend"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = { Name = "${var.name_prefix}-backend-logs" }
}

resource "aws_cloudwatch_log_group" "ai_service" {
  name              = "/${var.name_prefix}/ai-service"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = { Name = "${var.name_prefix}-ai-service-logs" }
}

# ── SNS Topic for Alerts ────────────────────────────────

resource "aws_sns_topic" "alerts" {
  name              = "${var.name_prefix}-alerts"
  kms_master_key_id = var.kms_key_arn

  tags = { Name = "${var.name_prefix}-alerts" }
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ── CloudWatch Alarms ───────────────────────────────────

# API Error Rate > 5%
resource "aws_cloudwatch_metric_alarm" "api_error_rate" {
  alarm_name          = "${var.name_prefix}-api-error-rate-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5
  alarm_description   = "API 5XX error rate exceeds 5%"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "error_rate"
    expression  = "(errors / requests) * 100"
    label       = "Error Rate %"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "HTTPCode_Target_5XX_Count"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }

  metric_query {
    id = "requests"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }

  tags = { Name = "${var.name_prefix}-api-error-rate" }
}

# API Latency p99 > 2s
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${var.name_prefix}-api-latency-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "p99"
  threshold           = 2
  alarm_description   = "API p99 latency exceeds 2 seconds"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = { Name = "${var.name_prefix}-api-latency" }
}

# Crisis Service Error — IMMEDIATE PAGE
resource "aws_cloudwatch_log_metric_filter" "crisis_error" {
  name           = "${var.name_prefix}-crisis-service-error"
  pattern        = "{ $.level = \"error\" && $.message = \"*crisis*\" }"
  log_group_name = aws_cloudwatch_log_group.ai_service.name

  metric_transformation {
    name      = "CrisisServiceErrors"
    namespace = "Unloch"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "crisis_error" {
  alarm_name          = "${var.name_prefix}-crisis-service-error"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "CrisisServiceErrors"
  namespace           = "Unloch"
  period              = 60
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "CRITICAL: Crisis detection service error — immediate response required"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = { Name = "${var.name_prefix}-crisis-error-alarm" }
}

# ECS Backend Service Running Count
resource "aws_cloudwatch_metric_alarm" "backend_service_count" {
  alarm_name          = "${var.name_prefix}-backend-service-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 2
  alarm_description   = "Backend running task count below minimum"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.backend_service_name
  }

  tags = { Name = "${var.name_prefix}-backend-service-count" }
}

# ── CloudWatch Dashboard ────────────────────────────────

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.name_prefix}-operations"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "ALB Request Count & Errors"
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix, { stat = "Sum" }],
            [".", "HTTPCode_Target_5XX_Count", ".", ".", { stat = "Sum", color = "#d62728" }],
            [".", "HTTPCode_Target_4XX_Count", ".", ".", { stat = "Sum", color = "#ff7f0e" }]
          ]
          period = 300
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "ALB Response Time"
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix, { stat = "p99" }],
            ["...", { stat = "p50" }],
            ["...", { stat = "Average" }]
          ]
          period = 300
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "ECS CPU Utilization"
          metrics = [
            ["ECS/ContainerInsights", "CpuUtilized", "ClusterName", var.ecs_cluster_name, "ServiceName", var.backend_service_name],
            ["...", "ServiceName", "${var.name_prefix}-ai-service"]
          ]
          period = 300
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "ECS Memory Utilization"
          metrics = [
            ["ECS/ContainerInsights", "MemoryUtilized", "ClusterName", var.ecs_cluster_name, "ServiceName", var.backend_service_name],
            ["...", "ServiceName", "${var.name_prefix}-ai-service"]
          ]
          period = 300
          view   = "timeSeries"
        }
      }
    ]
  })
}
