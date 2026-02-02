# AWS 리소스 생성 가이드

## 사전 준비사항

### 1. AWS CLI 설치 및 설정
```bash
# AWS CLI 설치 확인
aws --version

# AWS 자격 증명 설정 (아직 안했다면)
aws configure
# AWS Access Key ID: [입력]
# AWS Secret Access Key: [입력]
# Default region name: us-east-1
# Default output format: json
```

### 2. 필요한 Python 패키지 설치
```bash
pip install psycopg2-binary boto3 python-dotenv
```

## 실행 순서

### 1단계: AWS 리소스 생성
```bash
# Windows (Git Bash 또는 WSL 사용)
bash backend/scripts/create_aws_resources.sh

# 또는 PowerShell에서
sh backend/scripts/create_aws_resources.sh
```

**실행 중 입력사항:**
- 데이터베이스 마스터 비밀번호 (8자리 이상)

**생성되는 리소스:**
- PostgreSQL RDS 인스턴스 (db.t3.micro)
- RDS 보안 그룹
- DB 서브넷 그룹
- 환경 변수 파일 (.env)

### 2단계: 연결 테스트
```bash
cd backend/scripts

# 환경 변수 로드 (Windows)
# PowerShell에서:
Get-Content ../.env | ForEach-Object { 
    if($_ -match '^([^=]+)=(.*)$') { 
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') 
    } 
}

# Git Bash에서:
source ../.env

# 연결 테스트 실행
python test_connection.py
```

### 3단계: 데이터베이스 초기화
```bash
# 환경 변수가 로드된 상태에서
python init_database.py
```

### 4단계: 최종 확인
```bash
# 다시 연결 테스트
python test_connection.py
```

## 예상 소요 시간
- RDS 인스턴스 생성: 5-10분
- 데이터베이스 초기화: 1-2분
- 총 소요 시간: 약 10-15분

## 예상 비용 (버지니아 리전 us-east-1)
- **db.t3.micro**: 월 약 $12-16 (서울 대비 20% 저렴)
- **스토리지 20GB**: 월 약 $2
- **백업**: 월 약 $1
- **총 예상 비용**: 월 약 $15-19

## 문제 해결

### 1. AWS CLI 인증 오류
```bash
aws sts get-caller-identity
# 오류 발생 시 aws configure 다시 실행
```

### 2. RDS 연결 실패
- 보안 그룹에서 내 IP 허용 확인
- RDS 인스턴스 상태가 'available'인지 확인
- 환경 변수 설정 확인

### 3. 권한 오류
필요한 IAM 권한:
- RDS 생성/관리
- EC2 보안 그룹 관리
- S3 접근

## 리소스 정리 (필요시)
```bash
# 모든 생성된 AWS 리소스 삭제
bash backend/scripts/cleanup_aws_resources.sh
```

## 다음 단계
1. ✅ AWS 리소스 생성
2. ✅ 데이터베이스 초기화
3. 🔄 Lambda 백엔드 개발
4. 🔄 API Gateway 설정
5. 🔄 프론트엔드 연동

## 환경 변수 파일 (.env)
스크립트 실행 후 `backend/.env` 파일이 자동 생성됩니다:
```
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=shift_worker_wellness
DB_USER=postgres
DB_PASSWORD=your-password
AWS_REGION=us-east-1
S3_BUCKET_NAME=redhorse-s3-frontend-0126
```

## 주의사항
- 비밀번호는 안전하게 보관하세요
- .env 파일을 Git에 커밋하지 마세요
- 개발 완료 후 불필요한 리소스는 정리하세요