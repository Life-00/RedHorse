#!/bin/bash

# AWS 리소스 정리 스크립트
# 생성된 RDS 인스턴스 및 관련 리소스 삭제

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
SECURITY_GROUP_NAME="${PROJECT_NAME}-rds-sg"
SUBNET_GROUP_NAME="${PROJECT_NAME}-subnet-group"

echo -e "${RED}=== AWS 리소스 정리 스크립트 ===${NC}"
echo -e "${YELLOW}⚠️  이 스크립트는 다음 리소스들을 삭제합니다:${NC}"
echo "   - RDS 인스턴스: ${DB_INSTANCE_ID}"
echo "   - 보안 그룹: ${SECURITY_GROUP_NAME}"
echo "   - DB 서브넷 그룹: ${SUBNET_GROUP_NAME}"
echo ""

read -p "정말로 삭제하시겠습니까? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}작업이 취소되었습니다.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}1. RDS 인스턴스 삭제 중...${NC}"

# RDS 인스턴스 존재 확인
EXISTING_RDS=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --query 'DBInstances[0].DBInstanceIdentifier' --output text --region $REGION 2>/dev/null || echo "None")

if [ "$EXISTING_RDS" != "None" ] && [ -n "$EXISTING_RDS" ]; then
    echo -e "${YELLOW}⏳ RDS 인스턴스 삭제 중... (5-10분 소요)${NC}"
    
    aws rds delete-db-instance \
        --db-instance-identifier $DB_INSTANCE_ID \
        --skip-final-snapshot \
        --delete-automated-backups \
        --region $REGION
    
    # 삭제 완료까지 대기
    while true; do
        RDS_STATUS=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --query 'DBInstances[0].DBInstanceStatus' --output text --region $REGION 2>/dev/null || echo "deleted")
        
        if [ "$RDS_STATUS" = "deleted" ]; then
            echo -e "${GREEN}✅ RDS 인스턴스 삭제 완료${NC}"
            break
        else
            echo -e "${YELLOW}⏳ 현재 상태: ${RDS_STATUS} (30초 후 재확인)${NC}"
            sleep 30
        fi
    done
else
    echo -e "${YELLOW}⚠️  RDS 인스턴스가 존재하지 않습니다.${NC}"
fi

echo -e "${BLUE}2. DB 서브넷 그룹 삭제 중...${NC}"

# DB 서브넷 그룹 존재 확인 및 삭제
EXISTING_SUBNET_GROUP=$(aws rds describe-db-subnet-groups --db-subnet-group-name $SUBNET_GROUP_NAME --query 'DBSubnetGroups[0].DBSubnetGroupName' --output text --region $REGION 2>/dev/null || echo "None")

if [ "$EXISTING_SUBNET_GROUP" != "None" ] && [ -n "$EXISTING_SUBNET_GROUP" ]; then
    aws rds delete-db-subnet-group \
        --db-subnet-group-name $SUBNET_GROUP_NAME \
        --region $REGION
    
    echo -e "${GREEN}✅ DB 서브넷 그룹 삭제 완료${NC}"
else
    echo -e "${YELLOW}⚠️  DB 서브넷 그룹이 존재하지 않습니다.${NC}"
fi

echo -e "${BLUE}3. 보안 그룹 삭제 중...${NC}"

# 보안 그룹 존재 확인 및 삭제
EXISTING_SG=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=${SECURITY_GROUP_NAME}" --query 'SecurityGroups[0].GroupId' --output text --region $REGION 2>/dev/null || echo "None")

if [ "$EXISTING_SG" != "None" ] && [ -n "$EXISTING_SG" ]; then
    aws ec2 delete-security-group \
        --group-id $EXISTING_SG \
        --region $REGION
    
    echo -e "${GREEN}✅ 보안 그룹 삭제 완료${NC}"
else
    echo -e "${YELLOW}⚠️  보안 그룹이 존재하지 않습니다.${NC}"
fi

echo ""
echo -e "${GREEN}🎉 AWS 리소스 정리 완료!${NC}"
echo ""
echo -e "${YELLOW}참고: S3 버킷은 삭제되지 않았습니다.${NC}"
echo -e "${YELLOW}필요시 수동으로 정리해주세요.${NC}"