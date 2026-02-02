# 배포 가이드

이 문서는 Shift Worker Wellness App을 AWS에 배포하는 방법을 설명합니다.

## 사전 요구사항

1. **AWS CLI 설치 및 설정**
   ```bash
   aws configure
   ```
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region: us-east-1

2. **Python 3.11 이상**

3. **Node.js 18 이상**

4. **필요한 Python 패키지**
   ```bash
   pip install boto3
   ```

## 배포 구조

### 백엔드
- **Lambda 함수**: 8개의 마이크로서비스
  - **API Gateway 연결 (6개)**:
    - user_management
    - schedule_management
    - ai_services
    - fatigue_assessment
    - jumpstart
    - wellness
  - **Bedrock Agent Action Group (2개)**:
    - biopathway_calculator (Bio-Coach Agent용)
    - ocr_vision (OCR Agent용)
- **API Gateway**: HTTP API (REST API)
- **RDS**: PostgreSQL 데이터베이스
- **VPC**: Lambda와 RDS 연결
- **Bedrock Agents**: 3개
  - RAG Chatbot Agent (9NPCFXV4WV)
  - OCR Agent (BTSIJ4YCPQ)
  - Bio-Coach Agent (1XOE4OAMLR)

### 프론트엔드
- **S3**: 정적 파일 호스팅
  - `frontend/` - React 앱 빌드 파일
  - `audio/` - 명상 및 백색소음 오디오 파일
  - `ocr/` - OCR 처리된 스케줄 이미지
- **CloudFront**: CDN 및 HTTPS

## 배포 단계

### 1. 전체 자동 배포 (권장)

```bash
python scripts/deploy_all.py
```

이 스크립트는 다음을 자동으로 수행합니다:
1. Lambda 함수 배포
2. API Gateway 설정
3. 프론트엔드 빌드 및 S3 업로드
4. CloudFront 배포

### 2. 개별 배포

#### 2.1 백엔드만 배포

```bash
# 1. 일반 Lambda 함수 배포 (6개)
python backend/scripts/deploy_lambda.py

# 2. Bedrock Agent Action Group Lambda 배포 (2개)
python backend/scripts/deploy_biopathway.py
python backend/scripts/deploy_ocr_lambda.py

# 3. AI Services Lambda 환경변수 복원 (중요!)
python backend/scripts/deploy_ai_services_only.py

# 4. API Gateway 설정
python backend/scripts/setup_api_gateway.py
```

#### 2.2 프론트엔드만 배포

```bash
# 프론트엔드 배포
python scripts/deploy_frontend.py
```

## 배포 후 설정

### 1. 오디오 파일 업로드

S3 버킷의 `audio/` 폴더에 오디오 파일을 업로드합니다:

```bash
aws s3 cp audio/meditation/ s3://redhorse-s3-frontend-0126/audio/meditation/ --recursive
aws s3 cp audio/whitenoise/ s3://redhorse-s3-frontend-0126/audio/whitenoise/ --recursive
```

또는 AWS Console에서 직접 업로드:
1. S3 콘솔 접속
2. `redhorse-s3-frontend-0126` 버킷 선택
3. `audio/` 폴더로 이동
4. 파일 업로드

### 2. 데이터베이스 초기화 (최초 1회)

```bash
cd backend/scripts
python init_database.py
```

### 3. CloudFront 배포 확인

CloudFront 배포가 완전히 활성화되기까지 15-20분 소요됩니다.

배포 상태 확인:
```bash
aws cloudfront list-distributions
```

## 환경 변수

### 백엔드 (.env)

```env
# 데이터베이스
DB_HOST=shift-worker-wellness-db.cgxwi686s6fw.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=rhythm_fairy
DB_USER=postgres
DB_PASSWORD=your-password

# AWS
AWS_REGION=us-east-1
S3_BUCKET_NAME=redhorse-s3-frontend-0126
RDS_SECURITY_GROUP_ID=sg-xxxxx

# Cognito
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxx

# API Gateway (자동 생성됨)
API_GATEWAY_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/prod
API_GATEWAY_ID=xxxxx
```

### 프론트엔드 (.env.local)

```env
# Cognito
VITE_COGNITO_USER_POOL_ID=us-east-1_qkE8dIan5
VITE_COGNITO_USER_POOL_CLIENT_ID=5khcbjlr9o4ptgiimv597s7gg3

# API Gateway (배포 후 자동 업데이트됨)
VITE_API_BASE_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/prod

# 개발 모드
VITE_DEV_MODE=false
```

## 문제 해결

### Lambda 배포 실패

1. IAM 권한 확인
   - Lambda 생성 권한
   - IAM 역할 생성 권한
   - VPC 접근 권한

2. VPC 설정 확인
   - 서브넷이 2개 이상 있는지 확인
   - 보안 그룹 ID가 올바른지 확인

### API Gateway 연결 실패

1. Lambda 권한 확인
   ```bash
   aws lambda get-policy --function-name shift-worker-wellness-user-management
   ```

2. API Gateway 로그 확인
   ```bash
   aws logs tail /aws/apigateway/shift-worker-wellness-api --follow
   ```

### 프론트엔드 빌드 실패

1. Node.js 버전 확인
   ```bash
   node --version  # v18 이상
   ```

2. 의존성 재설치
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### CloudFront 접속 안 됨

1. 배포 상태 확인 (15-20분 소요)
2. S3 버킷 정책 확인
3. CloudFront 오류 페이지 설정 확인

## 비용 예상

### 월간 예상 비용 (소규모 사용 기준)

- **Lambda**: $0-5 (프리티어 포함)
- **API Gateway**: $0-10
- **RDS (db.t3.micro)**: $15-20
- **S3**: $1-3
- **CloudFront**: $1-5
- **총 예상**: $20-40/월

### 비용 절감 팁

1. RDS 인스턴스를 사용하지 않을 때 중지
2. CloudFront 캐싱 최적화
3. Lambda 메모리 및 타임아웃 최적화
4. S3 수명 주기 정책 설정

## 모니터링

### CloudWatch 로그

```bash
# Lambda 로그
aws logs tail /aws/lambda/shift-worker-wellness-user-management --follow

# API Gateway 로그
aws logs tail /aws/apigateway/shift-worker-wellness-api --follow
```

### 메트릭 확인

AWS Console > CloudWatch > Dashboards에서 확인:
- Lambda 호출 횟수 및 오류율
- API Gateway 요청 수 및 지연 시간
- RDS CPU 및 연결 수

## 업데이트

### 백엔드 업데이트

```bash
python backend/scripts/deploy_lambda.py
```

### 프론트엔드 업데이트

```bash
python scripts/deploy_frontend.py
```

## 롤백

### Lambda 함수 롤백

```bash
# 이전 버전으로 롤백
aws lambda update-alias \
  --function-name shift-worker-wellness-user-management \
  --name prod \
  --function-version <previous-version>
```

### 프론트엔드 롤백

S3에서 이전 버전 복원 또는 CloudFront 캐시 무효화

## 지원

문제가 발생하면 다음을 확인하세요:
1. CloudWatch 로그
2. AWS Console의 서비스 상태
3. 환경 변수 설정
4. IAM 권한

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.
