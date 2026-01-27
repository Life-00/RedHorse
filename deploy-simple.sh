#!/bin/bash

# ShiftHealth 간단 배포 스크립트
set -e

echo "🚀 ShiftHealth 배포 시작..."

# .env 파일에서 환경변수 로드
if [ ! -f .env ]; then
    echo "❌ .env 파일이 없습니다."
    echo ".env.example을 복사하여 .env 파일을 만들고 AWS 자격 증명을 입력하세요."
    exit 1
fi

echo "📋 환경변수 로드 중..."
export $(grep -v '^#' .env | xargs)

# 필수 환경변수 확인
if [ -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "❌ AWS_ACCESS_KEY_ID가 설정되지 않았습니다."
    echo ".env 파일에서 AWS 자격 증명을 확인하세요."
    exit 1
fi

if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ AWS_SECRET_ACCESS_KEY가 설정되지 않았습니다."
    echo ".env 파일에서 AWS 자격 증명을 확인하세요."
    exit 1
fi

echo "✅ AWS 자격 증명 로드 완료"

# 기본값 설정
AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}
S3_BUCKET_PREFIX=${S3_BUCKET_PREFIX:-shifthealth-app}

# S3 버킷 이름 (생성할 버킷)
BUCKET_NAME="$S3_BUCKET_PREFIX-$(date +%s)"

echo "버킷 이름: $BUCKET_NAME"

# AWS CLI 설치 확인
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI가 설치되지 않았습니다."
    echo "다음 링크에서 AWS CLI를 설치하세요: https://aws.amazon.com/cli/"
    exit 1
fi

# 1. S3 버킷 생성
echo "📦 S3 버킷 생성 중..."
aws s3 mb s3://$BUCKET_NAME --region $AWS_DEFAULT_REGION

# 2. 정적 웹사이트 호스팅 설정
echo "🌐 정적 웹사이트 호스팅 설정 중..."
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html

# 3. 퍼블릭 액세스 허용
echo "🔓 퍼블릭 액세스 설정 중..."
aws s3api put-public-access-block \
    --bucket $BUCKET_NAME \
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# 4. 버킷 정책 설정
echo "📋 버킷 정책 설정 중..."
cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json
rm bucket-policy.json

# 5. 파일 업로드
echo "📤 파일 업로드 중..."
aws s3 sync build/ s3://$BUCKET_NAME --delete

# 6. 웹사이트 URL 출력
WEBSITE_URL="http://$BUCKET_NAME.s3-website-$AWS_DEFAULT_REGION.amazonaws.com"

echo "✅ 배포 완료!"
echo "🌐 웹사이트 URL: $WEBSITE_URL"
echo "📊 S3 콘솔: https://s3.console.aws.amazon.com/s3/buckets/$BUCKET_NAME"

# 브라우저에서 열기 (macOS/Linux)
echo "🔗 브라우저에서 열기..."
if command -v open &> /dev/null; then
    open $WEBSITE_URL
elif command -v xdg-open &> /dev/null; then
    xdg-open $WEBSITE_URL
else
    echo "브라우저를 수동으로 열어 다음 URL에 접속하세요: $WEBSITE_URL"
fi