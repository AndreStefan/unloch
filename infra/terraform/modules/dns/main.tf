# ═══════════════════════════════════════════════════════════
# Route 53 — DNS Records + ACM Certificates
# ═══════════════════════════════════════════════════════════

# ── Hosted Zone ─────────────────────────────────────────

resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = { Name = var.domain_name }
}

# ── ACM Certificates ────────────────────────────────────

# API certificate (for ALB)
resource "aws_acm_certificate" "api" {
  domain_name       = "api.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "api.${var.domain_name}" }
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
}

# Patient app certificate (for CloudFront — must be in us-east-1)
resource "aws_acm_certificate" "patient_app" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = var.domain_name }
}

resource "aws_route53_record" "patient_app_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.patient_app.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "patient_app" {
  certificate_arn         = aws_acm_certificate.patient_app.arn
  validation_record_fqdns = [for record in aws_route53_record.patient_app_cert_validation : record.fqdn]
}

# Dashboard certificate (for CloudFront)
resource "aws_acm_certificate" "dashboard" {
  domain_name       = "app.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "app.${var.domain_name}" }
}

resource "aws_route53_record" "dashboard_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.dashboard.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "dashboard" {
  certificate_arn         = aws_acm_certificate.dashboard.arn
  validation_record_fqdns = [for record in aws_route53_record.dashboard_cert_validation : record.fqdn]
}

# ── DNS Records ─────────────────────────────────────────

# unloch.me → CloudFront (patient app)
resource "aws_route53_record" "patient_app" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.patient_app_cf_domain_name
    zone_id                = var.patient_app_cf_hosted_zone_id
    evaluate_target_health = false
  }
}

# app.unloch.me → CloudFront (dashboard)
resource "aws_route53_record" "dashboard" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.dashboard_cf_domain_name
    zone_id                = var.dashboard_cf_hosted_zone_id
    evaluate_target_health = false
  }
}

# api.unloch.me → ALB (backend)
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
