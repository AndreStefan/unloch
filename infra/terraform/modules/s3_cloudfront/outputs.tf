# Patient App
output "patient_app_bucket_name" {
  value = aws_s3_bucket.patient_app.id
}

output "patient_app_bucket_arn" {
  value = aws_s3_bucket.patient_app.arn
}

output "patient_app_cf_domain_name" {
  value = aws_cloudfront_distribution.patient_app.domain_name
}

output "patient_app_cf_hosted_zone_id" {
  value = aws_cloudfront_distribution.patient_app.hosted_zone_id
}

output "patient_app_cf_distribution_id" {
  value = aws_cloudfront_distribution.patient_app.id
}

output "patient_app_cf_arn" {
  value = aws_cloudfront_distribution.patient_app.arn
}

# Dashboard
output "dashboard_bucket_name" {
  value = aws_s3_bucket.dashboard.id
}

output "dashboard_bucket_arn" {
  value = aws_s3_bucket.dashboard.arn
}

output "dashboard_cf_domain_name" {
  value = aws_cloudfront_distribution.dashboard.domain_name
}

output "dashboard_cf_hosted_zone_id" {
  value = aws_cloudfront_distribution.dashboard.hosted_zone_id
}

output "dashboard_cf_distribution_id" {
  value = aws_cloudfront_distribution.dashboard.id
}

output "dashboard_cf_arn" {
  value = aws_cloudfront_distribution.dashboard.arn
}

# Audit Logs
output "audit_bucket_id" {
  value = aws_s3_bucket.audit_logs.id
}

output "audit_bucket_arn" {
  value = aws_s3_bucket.audit_logs.arn
}

# ALB Logs
output "alb_log_bucket_id" {
  value = aws_s3_bucket.alb_logs.id
}
