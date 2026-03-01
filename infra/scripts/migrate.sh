#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Run Prisma migrations via ECS RunTask
# Usage: ./migrate.sh <environment>
# Example: ./migrate.sh production
# ═══════════════════════════════════════════════════════════
set -euo pipefail

ENVIRONMENT="${1:?Usage: migrate.sh <environment>}"

CLUSTER="unloch-${ENVIRONMENT}-cluster"
TASK_FAMILY="unloch-${ENVIRONMENT}-migrate"

echo "Running Prisma migrations for ${ENVIRONMENT}..."

# Get network configuration from the backend service
NETWORK_CONFIG=$(aws ecs describe-services \
  --cluster "$CLUSTER" \
  --services "unloch-${ENVIRONMENT}-backend" \
  --query 'services[0].networkConfiguration' \
  --output json)

# Run migration task
TASK_ARN=$(aws ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition "$TASK_FAMILY" \
  --launch-type FARGATE \
  --network-configuration "$NETWORK_CONFIG" \
  --query 'tasks[0].taskArn' \
  --output text)

echo "Migration task started: ${TASK_ARN}"
echo "Waiting for migration to complete..."

aws ecs wait tasks-stopped \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ARN"

# Check exit code
EXIT_CODE=$(aws ecs describe-tasks \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[0].exitCode' \
  --output text)

if [ "$EXIT_CODE" != "0" ]; then
  echo "ERROR: Migration failed with exit code ${EXIT_CODE}"
  echo "Check CloudWatch logs for details."
  exit 1
fi

echo "Migrations completed successfully for ${ENVIRONMENT}."
