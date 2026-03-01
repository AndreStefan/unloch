variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnets" {
  type = list(string)
}

variable "domain_name" {
  type = string
}

variable "certificate_arn" {
  type = string
}

variable "log_bucket_id" {
  type = string
}
