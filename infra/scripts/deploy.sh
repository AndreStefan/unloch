#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Deploy script — Update ECS service with new image tag
# Usage: ./deploy.sh <environment> <service> <image-tag>
# Example: ./deploy.sh production backend abc123def
# ═══════════════════════════════════════════════════════════
set -euo pipefail

ENVIRONMENT="${1:?Usage: deploy.sh <environment> <service> <image-tag>}"
SERVICE="${2:?Usage: deploy.sh <environment> <service> <image-tag>}"
IMAGE_TAG="${3:?Usage: deploy.sh <environment> <image-tag>}"

CLUSTER="unloch-${ENVIRONMENT}-cluster"
SERVICE_NAME="unloch-${ENVIRONMENT}-${SERVICE}"
TASK_FAMILY="unloch-${ENVIRONMENT}-${SERVICE}"

echo "Deploying ${SERVICE} to ${ENVIRONMENT} with tag ${IMAGE_TAG}..."

# Get current task definition
TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition "$TASK_FAMILY" \
  --query 'taskDefinition' \
  --output json)

# Get ECR registry
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE="${ECR_REGISTRY}/unloch-${ENVIRONMENT}-${SERVICE}:${IMAGE_TAG}"

# Update image in task definition
NEW_TASK_DEF=$(echo "$TASK_DEF" | jq \
  --arg IMAGE "$IMAGE" \
  '.containerDefinitions[0].image = $IMAGE |
   del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

# Register new task definition
NEW_ARN=$(aws ecs register-task-definition \
  --cli-input-json "$NEW_TASK_DEF" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "New task definition: ${NEW_ARN}"

# Update service
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE_NAME" \
  --task-definition "$NEW_ARN" \
  --output text > /dev/null

echo "Waiting for service to stabilize..."
aws ecs wait services-stable \
  --cluster "$CLUSTER" \
  --services "$SERVICE_NAME"

echo "Deployment of ${SERVICE} to ${ENVIRONMENT} complete."
