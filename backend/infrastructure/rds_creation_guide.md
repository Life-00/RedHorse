# PostgreSQL RDS 인스턴스 생성 가이드

## 1. AWS 콘솔에서 RDS 생성

### 기본 설정 (비용 최적화)
- **엔진**: PostgreSQL 15.x
- **템플릿**: 프리 티어 (가능한 경우) 또는 개발/테스트
- **DB 인스턴스 클래스**: db.t3.micro (1 vCPU, 1GB RAM)
- **스토리지**: 
  - 스토리지 타입: 범용 SSD (gp2)
  - 할당된 스토리지: 20GB
  - 스토리지 자동 조정: 비활성화

### 연결 설정
- **DB 인스턴스 식별자**: shift-worker-wellness-db
- **마스터 사용자 이름**: postgres
- **마스터 암호**: 강력한 암호 설정 (최소 8자리)

### 네트워크 및 보안
- **VPC**: 기본 VPC 사용
- **서브넷 그룹**: 기본값
- **퍼블릭 액세스**: 예 (개발 환경용, 운영 환경에서는 아니요)
- **VPC 보안 그룹**: 새로 생성
  - 인바운드 규칙: PostgreSQL (5432) - 내 IP 또는 Lambda 보안 그룹

### 추가 구성
- **초기 데이터베이스 이름**: shift_worker_wellness
- **백업**: 
  - 자동 백업: 활성화
  - 백업 보존 기간: 7일
- **모니터링**: 기본 모니터링
- **로그 내보내기**: postgresql 로그 활성화

## 2. 보안 그룹 설정

### Lambda용 보안 그룹 생성
1. EC2 콘솔 → 보안 그룹 → 보안 그룹 생성
2. 이름: lambda-rds-access
3. 설명: Lambda functions access to RDS
4. VPC: RDS와 동일한 VPC 선택

### RDS 보안 그룹 인바운드 규칙
- 유형: PostgreSQL
- 포트: 5432
- 소스: Lambda 보안 그룹 ID

## 3. 연결 테스트

### psql 클라이언트로 연결 테스트
```bash
psql -h your-rds-endpoint.amazonaws.com -p 5432 -U postgres -d shift_worker_wellness
```

### Python으로 연결 테스트
```python
import psycopg2

try:
    conn = psycopg2.connect(
        host="your-rds-endpoint.amazonaws.com",
        port="5432",
        database="shift_worker_wellness",
        user="postgres",
        password="your-password"
    )
    print("연결 성공!")
    conn.close()
except Exception as e:
    print(f"연결 실패: {e}")
```

## 4. 스키마 및 데이터 설정

1. `rds_setup.sql` 파일 실행하여 테이블 생성
2. `sample_data.sql` 파일 실행하여 기본 데이터 삽입

```bash
psql -h your-rds-endpoint.amazonaws.com -p 5432 -U postgres -d shift_worker_wellness -f rds_setup.sql
psql -h your-rds-endpoint.amazonaws.com -p 5432 -U postgres -d shift_worker_wellness -f sample_data.sql
```

## 5. 비용 최적화 팁

### 개발 환경
- **인스턴스 중지**: 사용하지 않을 때 RDS 인스턴스 중지 (최대 7일)
- **스케줄링**: CloudWatch Events로 자동 시작/중지 설정

### 모니터링
- **CloudWatch**: CPU, 연결 수, 스토리지 사용량 모니터링
- **성능 인사이트**: 필요시에만 활성화

### 예상 비용 (서울 리전 기준)
- **db.t3.micro**: 월 약 $15-20
- **스토리지 20GB**: 월 약 $2-3
- **백업**: 월 약 $1-2
- **총 예상 비용**: 월 약 $18-25

## 6. 환경 변수 설정

RDS 생성 완료 후 `.env` 파일에 다음 정보 입력:
```
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=shift_worker_wellness
DB_USER=postgres
DB_PASSWORD=your-secure-password
```