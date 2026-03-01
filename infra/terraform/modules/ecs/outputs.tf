output "cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "cluster_id" {
  value = aws_ecs_cluster.main.id
}

output "backend_service_name" {
  value = aws_ecs_service.backend.name
}

output "ai_service_service_name" {
  value = aws_ecs_service.ai_service.name
}

output "backend_sg_id" {
  value = aws_security_group.backend.id
}

output "ai_service_sg_id" {
  value = aws_security_group.ai_service.id
}

output "migrate_task_definition_arn" {
  value = aws_ecs_task_definition.migrate.arn
}
