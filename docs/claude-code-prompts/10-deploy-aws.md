# Prompt 10: Deploy to AWS

```
Continue building Unloch. Everything is working locally.

## What to build:

Production deployment on AWS with HIPAA-eligible configuration.

1. In infra/terraform/:
   - VPC with public + private subnets
   - RDS PostgreSQL (Multi-AZ, encrypted, private subnet)
   - ElastiCache Redis (encrypted, private subnet)
   - ECS Fargate cluster with services:
     - backend (2 tasks, autoscaling)
     - ai-service (2 tasks, autoscaling)
     - dashboard (static build → S3 + CloudFront)
     - patient-app (static build → S3 + CloudFront)
   - ALB with TLS termination (ACM cert for unloch.me)
   - S3 bucket for audit log exports (SSE-KMS)
   - CloudWatch log groups with 90-day retention
   - IAM roles with least-privilege
   - Security groups: only necessary ports open

2. In infra/docker/:
   - Production Dockerfiles for each service (multi-stage builds, non-root user)

3. In .github/workflows/:
   - CI pipeline: lint → test → build → push to ECR
   - CD pipeline: deploy to ECS (manual approval for production)

4. Environment configuration:
   - AWS Secrets Manager for: DB password, JWT secret, API keys, Redis password
   - Environment variables via ECS task definitions
   - No secrets in code, no .env files in production

5. DNS:
   - unloch.me → CloudFront (patient app)
   - app.unloch.me → CloudFront (therapist dashboard)
   - api.unloch.me → ALB → backend
   - Point A record for unloch.me to CloudFront distribution

6. Monitoring:
   - CloudWatch alarms: API error rate > 5%, latency p99 > 2s, crisis service error = immediate page
   - Datadog integration (if available) for APM

HIPAA REQUIREMENTS:
- All resources in HIPAA-eligible region (us-east-1)
- Encryption at rest on ALL storage (RDS, ElastiCache, S3, EBS)
- Encryption in transit (TLS everywhere)
- VPC flow logs enabled
- CloudTrail enabled for AWS API audit
- Access logging on ALB and S3
- No public access to database or cache
```
