variable "name_prefix" {
  type = string
}

variable "ecr_backend_arn" {
  type = string
}

variable "ecr_ai_service_arn" {
  type = string
}

variable "secrets_arns" {
  type = list(string)
}

variable "kms_key_arn" {
  type = string
}

variable "audit_bucket_arn" {
  type = string
}

variable "log_group_arns" {
  type = list(string)
}

variable "dashboard_bucket_arn" {
  type = string
}

variable "patient_app_bucket_arn" {
  type = string
}

variable "dashboard_cf_distribution_arn" {
  type = string
}

variable "patient_app_cf_distribution_arn" {
  type = string
}
