output "backend_repo_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "backend_repo_arn" {
  value = aws_ecr_repository.backend.arn
}

output "ai_service_repo_url" {
  value = aws_ecr_repository.ai_service.repository_url
}

output "ai_service_repo_arn" {
  value = aws_ecr_repository.ai_service.arn
}
