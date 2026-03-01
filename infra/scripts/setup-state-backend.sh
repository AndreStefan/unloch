#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Bootstrap Terraform State Backend (run once before terraform init)
# ═══════════════════════════════════════════════════════════
set -euo pipefail

AWS_REGION="us-east-1"
STATE_BUCKET="unloch-terraform-state"
LOCK_TABLE="unloch-terraform-locks"

echo "Creating S3 bucket for Terraform state..."
aws s3api create-bucket \
  --bucket "$STATE_BUCKET" \
  --region "$AWS_REGION"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket "$STATE_BUCKET" \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket "$STATE_BUCKET" \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket "$STATE_BUCKET" \
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'

echo "Creating DynamoDB table for state locking..."
aws dynamodb create-table \
  --table-name "$LOCK_TABLE" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$AWS_REGION"

echo ""
echo "Terraform state backend created successfully!"
echo "  S3 Bucket:      $STATE_BUCKET"
echo "  DynamoDB Table:  $LOCK_TABLE"
echo ""
echo "You can now run: cd infra/terraform && terraform init"
