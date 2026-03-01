output "hosted_zone_id" {
  value = aws_route53_zone.main.zone_id
}

output "name_servers" {
  value = aws_route53_zone.main.name_servers
}

output "api_certificate_arn" {
  value = aws_acm_certificate_validation.api.certificate_arn
}

output "patient_app_certificate_arn" {
  value = aws_acm_certificate_validation.patient_app.certificate_arn
}

output "dashboard_certificate_arn" {
  value = aws_acm_certificate_validation.dashboard.certificate_arn
}
