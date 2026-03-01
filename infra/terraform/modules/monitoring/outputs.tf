output "backend_log_group_name" {
  value = aws_cloudwatch_log_group.backend.name
}

output "ai_service_log_group_name" {
  value = aws_cloudwatch_log_group.ai_service.name
}

output "log_group_arns" {
  value = [
    aws_cloudwatch_log_group.backend.arn,
    aws_cloudwatch_log_group.ai_service.arn,
  ]
}

output "sns_topic_arn" {
  value = aws_sns_topic.alerts.arn
}
