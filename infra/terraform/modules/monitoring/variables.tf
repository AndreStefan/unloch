variable "name_prefix" {
  type = string
}

variable "alert_email" {
  type = string
}

variable "log_retention_days" {
  type    = number
  default = 90
}

variable "kms_key_arn" {
  type = string
}

variable "alb_arn_suffix" {
  type = string
}

variable "backend_tg_arn_suffix" {
  type = string
}

variable "backend_service_name" {
  type = string
}

variable "ecs_cluster_name" {
  type = string
}
