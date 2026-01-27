#!/bin/bash

# ShiftHealth Frontend 배포 ?�크립트
set -e

# ?�경 변???�정
DOMAIN_NAME=${DOMAIN_NAME:-"your-app.com"}
AWS_REGION=${AWS_REGION:-"us-east-1"}
STACK_NAME="shifthealth-frontend"

echo "?? ShiftHealth Frontend 배포 ?�작..."
echo "Domain: $DOMAIN_NAME"
echo "Region: $AWS_REGION"

# 1. CloudFormation ?�택 배포
echo "?�� CloudFormation ?�택 배포 �?.."
aws cloudformation deploy \
  --template-file aws/cloudformation-frontend.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
    DomainName=$DOMAIN_NAME \
  --capabilities CAPABILITY_IAM \
  --region $AWS_REGION

# 2. ?�택 출력�?가?�오�?echo "?�� ?�택 ?�보 가?�오??�?.."
S3_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
  --output text \
  --region $AWS_REGION)

CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text \
  --region $AWS_REGION)

echo "S3 Bucket: $S3_BUCKET"
echo "CloudFront ID: $CLOUDFRONT_ID"

# 3. ?�론?�엔??빌드
echo "?�� ?�론?�엔??빌드 �?.."
export REACT_APP_API_BASE_URL="https://api.$DOMAIN_NAME"
export REACT_APP_ENVIRONMENT="production"
npm run build

# 4. S3???�로??echo "?�� S3???�일 ?�로??�?.."
aws s3 sync build/ s3://$S3_BUCKET --delete --region $AWS_REGION

# 5. CloudFront 캐시 무효??echo "?�� CloudFront 캐시 무효??�?.."
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_ID \
  --paths "/*" \
  --region $AWS_REGION

echo "??배포 ?�료!"
echo "?�� ?�사?�트: https://$DOMAIN_NAME"
echo "?�� CloudFront: https://console.aws.amazon.com/cloudfront/home?region=$AWS_REGION#distribution-settings:$CLOUDFRONT_ID"