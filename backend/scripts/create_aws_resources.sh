#!/bin/bash

# AWS 리소스 생성 스크립트
# PostgreSQL RDS 인스턴스 및 관련 리소스 생성

set -e  # 오류 발생 시 스크립트 중단

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 설정 변수
PROJECT_NAME="shift-worker-wellness"
REGION="us-east-1"
DB_INSTANCE_ID="${PROJECT_NAME}-db"
DB_NAME="rhythm_fairy"
DB_USERNAME="postgres"
DB_PASSWORD=""  # 사용자가 입력할 예정
SECURITY_GROUP_NAME="${PROJECT_NAME}-rds-sg"
SUBNET_GROUP_NAME="${PROJECT_NAME}-subnet-group"

echo -e "${BLUE}=== AWS 리소스 생성 스크립트 ===${NC}"
echo -e "${YELLOW}프로젝트: ${PROJECT_NAME}${NC}"
echo -e "${YELLOW}리전: ${REGION}${NC}"
echo ""

# AWS CLI 설치 확인
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI가 설치되지 않았습니다.${NC}"
    echo "설치 방법: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# AWS 자격 증명 확인
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS 자격 증명이 설정되지 않았습니다.${NC}"
    echo "다음 명령어로 설정하세요:"
    echo "aws configure"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI 설정 확인 완료${NC}"

# 데이터베이스 비밀번호 입력
echo ""
echo -e "${YELLOW}데이터베이스 마스터 비밀번호를 입력하세요 (8자리 이상):${NC}"
read -s DB_PASSWORD
echo ""

if [ ${#DB_PASSWORD} -lt 8 ]; then
    echo -e "${RED}❌ 비밀번호는 8자리 이상이어야 합니다.${NC}"
    exit 1
fi

# 기본 VPC ID 가져오기
echo -e "${BLUE}1. 기본 VPC 정보 조회 중...${NC}"
DEFAULT_VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region $REGION)

if [ "$DEFAULT_VPC_ID" = "None" ] || [ -z "$DEFAULT_VPC_ID" ]; then
    echo -e "${RED}❌ 기본 VPC를 찾을 수 없습니다.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 기본 VPC ID: ${DEFAULT_VPC_ID}${NC}"

# 서브넷 ID들 가져오기
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${DEFAULT_VPC_ID}" --query 'Subnets[].SubnetId' --output text --region $REGION)
SUBNET_ARRAY=($SUBNET_IDS)

if [ ${#SUBNET_ARRAY[@]} -lt 2 ]; then
    echo -e "${RED}❌ 최소 2개의 서브넷이 필요합니다.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 서브넷 개수: ${#SUBNET_ARRAY[@]}개${NC}"

# 2. 보안 그룹 생성
echo -e "${BLUE}2. RDS 보안 그룹 생성 중...${NC}"

# 기존 보안 그룹 확인
EXISTING_SG=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=${SECURITY_GROUP_NAME}" --query 'SecurityGroups[0].GroupId' --output text --region $REGION 2>/dev/null || echo "None")

if [ "$EXISTING_SG" != "None" ] && [ -n "$EXISTING_SG" ]; then
    echo -e "${YELLOW}⚠️  보안 그룹이 이미 존재합니다: ${EXISTING_SG}${NC}"
    SECURITY_GROUP_ID=$EXISTING_SG
else
    SECURITY_GROUP_ID=$(aws ec2 create-security-group \
        --group-name $SECURITY_GROUP_NAME \
        --description "Security group for ${PROJECT_NAME} RDS instance" \
        --vpc-id $DEFAULT_VPC_ID \
        --query 'GroupId' \
        --output text \
        --region $REGION)
    
    echo -e "${GREEN}✅ 보안 그룹 생성 완료: ${SECURITY_GROUP_ID}${NC}"
    
    # PostgreSQL 포트 허용 (내 IP에서만)
    MY_IP=$(curl -s https://checkip.amazonaws.com)/32
    
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP_ID \
        --protocol tcp \
        --port 5432 \
        --cidr $MY_IP \
        --region $REGION
    
    echo -e "${GREEN}✅ 보안 그룹 규칙 추가 완료 (내 IP: ${MY_IP})${NC}"
fi

# 3. DB 서브넷 그룹 생성
echo -e "${BLUE}3. DB 서브넷 그룹 생성 중...${NC}"

# 기존 서브넷 그룹 확인
EXISTING_SUBNET_GROUP=$(aws rds describe-db-subnet-groups --db-subnet-group-name $SUBNET_GROUP_NAME --query 'DBSubnetGroups[0].DBSubnetGroupName' --output text --region $REGION 2>/dev/null || echo "None")

if [ "$EXISTING_SUBNET_GROUP" != "None" ] && [ -n "$EXISTING_SUBNET_GROUP" ]; then
    echo -e "${YELLOW}⚠️  DB 서브넷 그룹이 이미 존재합니다: ${EXISTING_SUBNET_GROUP}${NC}"
else
    aws rds create-db-subnet-group \
        --db-subnet-group-name $SUBNET_GROUP_NAME \
        --db-subnet-group-description "Subnet group for ${PROJECT_NAME} RDS" \
        --subnet-ids ${SUBNET_IDS} \
        --region $REGION
    
    echo -e "${GREEN}✅ DB 서브넷 그룹 생성 완료${NC}"
fi

# 4. RDS 인스턴스 생성
echo -e "${BLUE}4. PostgreSQL RDS 인스턴스 생성 중...${NC}"
echo -e "${YELLOW}⏳ 이 작업은 5-10분 정도 소요됩니다...${NC}"

# 기존 RDS 인스턴스 확인
EXISTING_RDS=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --query 'DBInstances[0].DBInstanceIdentifier' --output text --region $REGION 2>/dev/null || echo "None")

if [ "$EXISTING_RDS" != "None" ] && [ -n "$EXISTING_RDS" ]; then
    echo -e "${YELLOW}⚠️  RDS 인스턴스가 이미 존재합니다: ${EXISTING_RDS}${NC}"
    
    # 기존 인스턴스 상태 확인
    RDS_STATUS=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --query 'DBInstances[0].DBInstanceStatus' --output text --region $REGION)
    echo -e "${YELLOW}현재 상태: ${RDS_STATUS}${NC}"
    
    if [ "$RDS_STATUS" = "available" ]; then
        echo -e "${GREEN}✅ RDS 인스턴스가 이미 사용 가능한 상태입니다.${NC}"
    else
        echo -e "${YELLOW}⏳ RDS 인스턴스가 준비 중입니다. 잠시 기다려주세요...${NC}"
    fi
else
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
fi

# RDS 인스턴스가 사용 가능할 때까지 대기
echo -e "${BLUE}5. RDS 인스턴스 상태 확인 중...${NC}"

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

# 6. RDS 엔드포인트 정보 가져오기
echo -e "${BLUE}6. RDS 연결 정보 조회 중...${NC}"

RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --query 'DBInstances[0].Endpoint.Address' --output text --region $REGION)
RDS_PORT=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --query 'DBInstances[0].Endpoint.Port' --output text --region $REGION)

echo ""
echo -e "${GREEN}🎉 AWS 리소스 생성 완료!${NC}"
echo ""
echo -e "${BLUE}=== 연결 정보 ===${NC}"
echo -e "${YELLOW}RDS 엔드포인트:${NC} ${RDS_ENDPOINT}"
echo -e "${YELLOW}포트:${NC} ${RDS_PORT}"
echo -e "${YELLOW}데이터베이스명:${NC} ${DB_NAME}"
echo -e "${YELLOW}사용자명:${NC} ${DB_USERNAME}"
echo -e "${YELLOW}보안 그룹 ID:${NC} ${SECURITY_GROUP_ID}"
echo ""

# 7. 환경 변수 파일 생성
echo -e "${BLUE}7. 환경 변수 파일 생성 중...${NC}"

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

echo -e "${BLUE}=== 다음 단계 ===${NC}"
echo -e "${YELLOW}1. 데이터베이스 초기화:${NC}"
echo "   cd backend/scripts"
echo "   source ../.env"
echo "   python3 init_database.py"
echo ""
echo -e "${YELLOW}2. 연결 테스트:${NC}"
echo "   psql -h ${RDS_ENDPOINT} -p ${RDS_PORT} -U ${DB_USERNAME} -d ${DB_NAME}"
echo ""
echo -e "${YELLOW}3. Lambda 함수 개발 시작${NC}"
echo ""

echo -e "${GREEN}🚀 준비 완료! 데이터베이스를 초기화해주세요.${NC}"