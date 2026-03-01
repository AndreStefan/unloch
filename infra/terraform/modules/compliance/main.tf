# ═══════════════════════════════════════════════════════════
# Compliance — CloudTrail, AWS Config (HIPAA)
# ═══════════════════════════════════════════════════════════

data "aws_caller_identity" "current" {}

# ── CloudTrail ──────────────────────────────────────────

resource "aws_cloudwatch_log_group" "cloudtrail" {
  name              = "/${var.name_prefix}/cloudtrail"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = { Name = "${var.name_prefix}-cloudtrail-logs" }
}

resource "aws_iam_role" "cloudtrail" {
  name = "${var.name_prefix}-cloudtrail-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "cloudtrail.amazonaws.com" }
    }]
  })

  tags = { Name = "${var.name_prefix}-cloudtrail-role" }
}

resource "aws_iam_role_policy" "cloudtrail_logs" {
  name = "${var.name_prefix}-cloudtrail-logs"
  role = aws_iam_role.cloudtrail.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Effect   = "Allow"
      Resource = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
    }]
  })
}

# S3 bucket policy for CloudTrail
resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = var.audit_bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudTrailAclCheck"
        Effect = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = "s3:GetBucketAcl"
        Resource = "arn:aws:s3:::${var.audit_bucket_id}"
      },
      {
        Sid    = "CloudTrailWrite"
        Effect = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = "s3:PutObject"
        Resource = "arn:aws:s3:::${var.audit_bucket_id}/cloudtrail/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

resource "aws_cloudtrail" "main" {
  name                          = "${var.name_prefix}-trail"
  s3_bucket_name                = var.audit_bucket_id
  s3_key_prefix                 = "cloudtrail"
  is_multi_region_trail         = true
  include_global_service_events = true
  enable_logging                = true
  kms_key_id                    = var.kms_key_arn

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail.arn

  # Log management events
  event_selector {
    read_write_type           = "All"
    include_management_events = true

    # S3 data events for audit bucket
    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::${var.audit_bucket_id}/"]
    }
  }

  tags = { Name = "${var.name_prefix}-cloudtrail" }

  depends_on = [aws_s3_bucket_policy.cloudtrail]
}
