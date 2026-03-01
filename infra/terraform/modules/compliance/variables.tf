variable "name_prefix" {
  type = string
}

variable "kms_key_arn" {
  type = string
}

variable "audit_bucket_id" {
  type = string
}

variable "log_retention_days" {
  type    = number
  default = 90
}
