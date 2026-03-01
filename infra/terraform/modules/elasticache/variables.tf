variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "allowed_sg_ids" {
  description = "Security group IDs allowed to connect to Redis"
  type        = list(string)
}

variable "node_type" {
  type    = string
  default = "cache.t3.small"
}

variable "kms_key_arn" {
  type = string
}

variable "auth_token_secret_arn" {
  type = string
}
