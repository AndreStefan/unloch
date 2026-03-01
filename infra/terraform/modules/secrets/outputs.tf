output "kms_key_arn" {
  value = aws_kms_key.main.arn
}

output "kms_key_id" {
  value = aws_kms_key.main.key_id
}

output "database_url_secret_arn" {
  value = aws_secretsmanager_secret.database_url.arn
}

output "db_password_secret_arn" {
  value = aws_secretsmanager_secret.db_password.arn
}

output "db_password" {
  value     = random_password.db_password.result
  sensitive = true
}

output "redis_url_secret_arn" {
  value = aws_secretsmanager_secret.redis_url.arn
}

output "redis_auth_token_secret_arn" {
  value = aws_secretsmanager_secret.redis_auth_token.arn
}

output "redis_auth_token" {
  value     = random_password.redis_auth_token.result
  sensitive = true
}

output "jwt_secret_secret_arn" {
  value = aws_secretsmanager_secret.jwt_secret.arn
}

output "anthropic_key_secret_arn" {
  value = aws_secretsmanager_secret.anthropic_key.arn
}

output "openai_key_secret_arn" {
  value = aws_secretsmanager_secret.openai_key.arn
}

output "all_secret_arns" {
  value = [
    aws_secretsmanager_secret.database_url.arn,
    aws_secretsmanager_secret.db_password.arn,
    aws_secretsmanager_secret.redis_url.arn,
    aws_secretsmanager_secret.redis_auth_token.arn,
    aws_secretsmanager_secret.jwt_secret.arn,
    aws_secretsmanager_secret.anthropic_key.arn,
    aws_secretsmanager_secret.openai_key.arn,
  ]
}
