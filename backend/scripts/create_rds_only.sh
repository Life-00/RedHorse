#!/bin/bash

# RDS 인스턴스만 생성하는 스크립트
# 보안 그룹과 서브넷 그룹이 이미 생성된 상태에서 사용

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 설정 변수
PROJECT_NAME="shift-worker-wellness"
REGION="us-east-1"
DB_INSTANCE_ID="${PROJECT_NAME}-db"
DB_NAME="rhythm_fairy"
DB_USERNAME="postgres"
SECURITY_GROUP_NAME="${PROJECT_NAME}-rds-sg"
SUBNET_GROUP_NAME="${PROJECT_NAME}-subnet-group"

echo -e "${BLUE}=== RDS 인스턴스 생성 스크립트 ===${NC}"
echo -e "${YELLOW}리전: ${REGION}${NC}"
echo ""

# 데이터베이스 비밀번호 입력
echo -e "${YELLOW}데이터베이스 마스터 비밀번호를 입력하세요 (8자리 이상):${NC}"
read -s DB_PASSWORD
echo ""

if [ ${#DB_PASSWORD} -lt 8 ]; then
    echo -e "${RED}❌ 비밀번호는 8자리 이상이어야 합니다.${NC}"
    exit 1
fi

# 보안 그룹 ID 가져오기
SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=${SECURITY_GROUP_NAME}" --query 'SecurityGroups[0].GroupId' --output text --region $REGION)

if [ "$SECURITY_GROUP_ID" = "None" ] || [ -z "$SECURITY_GROUP_ID" ]; then
    echo -e "${RED}❌ 보안 그룹을 찾을 수 없습니다: ${SECURITY_GROUP_NAME}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 보안 그룹 ID: ${SECURITY_GROUP_ID}${NC}"

# RDS 인스턴스 생성
echo -e "${BLUE}RDS 인스턴스 생성 중...${NC}"
echo -e "${YELLOW}⏳ 이 작업은 5-10분 정도 소요됩니다...${NC}"

aws rds create-db-instance \
    --db-instance-identifier $DB_INSTANCE_ID \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.15 \
    --master-username $DB_USERNAME \
    --master-user-password $DB_PASSWORD \
    --allocated-storage 20 \
    --storage-type gp2 \
    --db-name $DB_NAME \
    --vpc-security-group-ids $SECURITY_GROUP_ID \
    --db-subnet-group-name $SUBNET_GROUP_NAME \
    --backup-retention-period 7 \
    --storage-encrypted \
    --publicly-accessible \
    --auto-minor-version-upgrade \
    --region $REGION

echo -e "${GREEN}✅ RDS 인스턴스 생성 요청 완료${NC}"
echo -e "${YELLOW}⏳ 인스턴스가 준비될 때까지 기다리는 중...${NC}"

# RDS 인스턴스가 사용 가능할 때까지 대기
while true; do
    RDS_STATUS=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --query 'DBInstances[0].DBInstanceStatus' --output text --region $REGION 2>/dev/null || echo "creating")
    
    if [ "$RDS_STATUS" = "available" ]; then
        echo -e "${GREEN}✅ RDS 인스턴스가 사용 가능한 상태입니다!${NC}"
        break
    elif [ "$RDS_STATUS" = "failed" ]; then
        echo -e "${RED}❌ RDS 인스턴스 생성에 실패했습니다.${NC}"
        exit 1
    else
        echo -e "${YELLOW}⏳ 현재 상태: ${RDS_STATUS} (30초 후 재확인)${NC}"
        sleep 30
    fi
done

# RDS 엔드포인트 정보 가져오기
RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --query 'DBInstances[0].Endpoint.Address' --output text --region $REGION)
RDS_PORT=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --query 'DBInstances[0].Endpoint.Port' --output text --region $REGION)

echo ""
echo -e "${GREEN}🎉 RDS 인스턴스 생성 완료!${NC}"
echo ""
echo -e "${BLUE}=== 연결 정보 ===${NC}"
echo -e "${YELLOW}RDS 엔드포인트:${NC} ${RDS_ENDPOINT}"
echo -e "${YELLOW}포트:${NC} ${RDS_PORT}"
echo -e "${YELLOW}데이터베이스명:${NC} ${DB_NAME}"
echo -e "${YELLOW}사용자명:${NC} ${DB_USERNAME}"

# 환경 변수 파일 생성
cat > ../.env << EOF
# 데이터베이스 설정 (PostgreSQL RDS)
DB_HOST=${RDS_ENDPOINT}
DB_PORT=${RDS_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD}

# AWS 설정
AWS_REGION=${REGION}
S3_BUCKET_NAME=redhorse-s3-frontend-0126

# Cognito 설정 (기존 값 사용)
COGNITO_USER_POOL_ID=your-user-pool-id
COGNITO_CLIENT_ID=your-client-id

# API 설정
API_STAGE=dev
CORS_ORIGINS=http://localhost:5173

# 보안 그룹 ID (Lambda 배포 시 사용)
RDS_SECURITY_GROUP_ID=${SECURITY_GROUP_ID}
EOF

echo -e "${GREEN}✅ 환경 변수 파일 생성 완료: backend/.env${NC}"
echo ""
echo -e "${GREEN}🚀 다음 단계: 데이터베이스 초기화를 진행하세요!${NC}"