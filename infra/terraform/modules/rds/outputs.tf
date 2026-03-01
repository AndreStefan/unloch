output "endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = true
}

output "address" {
  value     = aws_db_instance.main.address
  sensitive = true
}

output "port" {
  value = aws_db_instance.main.port
}

output "security_group_id" {
  value = aws_security_group.rds.id
}
