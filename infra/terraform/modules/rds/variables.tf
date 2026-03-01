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
  description = "Security group IDs allowed to connect to RDS"
  type        = list(string)
}

variable "instance_class" {
  type    = string
  default = "db.t3.medium"
}

variable "db_name" {
  type    = string
  default = "unloch"
}

variable "db_username" {
  type    = string
  default = "unloch"
}

variable "multi_az" {
  type    = bool
  default = true
}

variable "kms_key_arn" {
  type = string
}

variable "db_password_secret_arn" {
  type = string
}
