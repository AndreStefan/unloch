output "alb_sg_id" {
  value = aws_security_group.alb.id
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "alb_zone_id" {
  value = aws_lb.main.zone_id
}

output "alb_arn_suffix" {
  value = aws_lb.main.arn_suffix
}

output "backend_target_group_arn" {
  value = aws_lb_target_group.backend.arn
}

output "backend_tg_arn_suffix" {
  value = aws_lb_target_group.backend.arn_suffix
}
