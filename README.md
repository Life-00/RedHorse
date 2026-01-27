# 교대근무자 수면 최적화 백엔드 시스템

AWS 하이브리드 아키텍처 기반의 교대근무자를 위한 수면 최적화 및 피로 관리 백엔드 시스템입니다.

## 아키텍처 개요

- **리전**: us-east-1 (버지니아 북부)
- **하이브리드 구조**: Lambda (CRUD) + EC2 FastAPI (AI/엔진) + ElastiCache (캐시)
- **데이터베이스**: RDS PostgreSQL (트랜잭션 및 관계형 데이터)
- **캐시**: ElastiCache Serverless (성능 최적화)
- **인증**: AWS Cognito User Pool (JWT 기반)
- **파일 저장**: S3 (Presigned URL 방식)

## 주요 기능

### MVP 기능
- 사용자 온보딩 및 프로필 관리
- 근무표 CRUD (커서 기반 페이지네이션)
- 3대 핵심 엔진 (Shift-to-Sleep, Caffeine Cutoff, Fatigue Risk Score)
- 홈 대시보드 데이터 제공
- 점프스타트 체크리스트
- 파일 업로드/다운로드 (S3 Presigned URL)
- 매일 수면 권장사항 사전 계산 캐시

### V2 확장 기능
- 웨어러블 데이터 분석
- B2B 통계 대시보드
- AI 상담봇 (Amazon Bedrock)
- 고급 배치 작업

## 기술 스택

- **언어**: TypeScript (Node.js 18.x)
- **인프라**: AWS CDK
- **데이터베이스**: PostgreSQL 14+
- **캐시**: Redis (ElastiCache Serverless)
- **테스팅**: Jest + fast-check (속성 기반 테스트)
- **코드 품질**: ESLint + Prettier

## 프로젝트 구조

```
├── bin/                    # CDK 앱 진입점
├── lib/                    # CDK 스택 정의
├── src/
│   ├── database/          # 데이터베이스 스키마
│   ├── lambda/            # Lambda 함수 핸들러
│   ├── services/          # 비즈니스 로직 서비스
│   ├── types/             # TypeScript 타입 정의
│   ├── utils/             # 유틸리티 함수
│   └── scripts/           # 마이그레이션 스크립트
├── test/                  # 테스트 파일
└── docs/                  # 문서
```

## 설치 및 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
# AWS 자격 증명 설정
aws configure

# 또는 환경 변수로 설정
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
```

### 3. CDK 부트스트랩 (최초 1회)

```bash
npx cdk bootstrap aws://ACCOUNT-NUMBER/us-east-1
```

## 개발 워크플로우

### 1. 코드 빌드

```bash
npm run build
```

### 2. 린팅 및 포맷팅

```bash
npm run lint          # 린팅 검사
npm run lint:fix      # 자동 수정
npm run format        # 코드 포맷팅
```

### 3. 테스트 실행

```bash
npm test              # 단위 테스트
npm run test:watch    # 감시 모드
npm run test:coverage # 커버리지 리포트
npm run test:integration # 통합 테스트
```

### 4. CDK 배포

```bash
# 변경사항 확인
npm run cdk:diff

# 개발 환경 배포
npm run cdk:deploy ShiftSleepDev

# 프로덕션 환경 배포
npm run cdk:deploy ShiftSleepProd
```

## API 엔드포인트

### 사용자 관리
- `POST /api/v1/users/onboarding` - 사용자 온보딩
- `GET /api/v1/users/profile` - 프로필 조회
- `PUT /api/v1/users/profile` - 프로필 수정
- `DELETE /api/v1/users/profile` - 계정 삭제

### 근무표 관리
- `GET /api/v1/schedules` - 근무표 목록 조회 (페이지네이션)
- `POST /api/v1/schedules` - 근무표 생성
- `PUT /api/v1/schedules/{date}` - 근무표 수정
- `DELETE /api/v1/schedules/{date}` - 근무표 삭제
- `POST /api/v1/schedules/bulk-import` - 대량 가져오기

### 엔진 API (EC2 FastAPI)
- `GET /api/v1/engines/shift-to-sleep` - 수면 권장사항
- `GET /api/v1/engines/caffeine-cutoff` - 카페인 마감시간
- `GET /api/v1/engines/fatigue-risk` - 피로도 평가

### 대시보드
- `GET /api/v1/dashboard/home` - 홈 대시보드
- `GET /api/v1/dashboard/jumpstart` - 점프스타트 체크리스트

### 파일 관리
- `POST /api/v1/files/upload-url` - 업로드 URL 생성
- `GET /api/v1/files/{fileId}/download-url` - 다운로드 URL 생성

## 데이터베이스 관리

### 마이그레이션 실행

```bash
npm run db:migrate
```

### 테스트 데이터 생성

```bash
npm run db:seed
```

## 모니터링 및 로깅

### CloudWatch 대시보드
- API 성능 메트릭
- 엔진 계산 시간
- 캐시 히트율
- 에러율 및 알람

### 로그 구조
```json
{
  "timestamp": "2024-01-26T15:30:00+09:00",
  "level": "INFO",
  "correlationId": "req-12345-abcde",
  "service": "shift-sleep-user-handler",
  "message": "User onboarding completed",
  "userId": "12345678***",
  "metadata": {
    "shiftType": "TWO_SHIFT"
  }
}
```

## 보안 고려사항

### 인증 및 권한
- Cognito JWT 토큰 기반 인증
- Cross-user access 완전 차단
- 리소스 소유권 검증

### 데이터 보호
- RDS 저장 시 암호화
- S3 파일 암호화 (SSE-S3)
- PII 데이터 마스킹

### 의료 진단 면책
- 모든 엔진 응답에 면책 메시지 포함
- `X-Disclaimer` 헤더 제공

## 성능 최적화

### 캐시 전략
- 3층 캐시: 메모리 (5분) → Redis (5분) → RDS (48시간)
- 근무표 변경 시 자동 캐시 무효화
- 배치 작업을 통한 사전 계산

### 페이지네이션
- 커서 기반 페이지네이션 (성능 최적화)
- 복합 인덱스 활용: `(date, schedule_id)`

## 배치 작업

### 일일 캐시 갱신
- 실행 시간: 매일 새벽 3시 (KST)
- 대상: 활성 사용자 (7일 이내 활동)
- 캐시 TTL: 48시간

### EventBridge 스케줄
```typescript
{
  "schedule": "cron(0 18 * * ? *)", // UTC 18:00 = KST 03:00
  "timezone": "Asia/Seoul",
  "target": "shift-sleep-batch-handler"
}
```

## 트러블슈팅

### 일반적인 문제

1. **RDS 연결 실패**
   - RDS Proxy 엔드포인트 확인
   - 보안 그룹 설정 확인
   - Secrets Manager 자격 증명 확인

2. **ElastiCache 연결 실패**
   - VPC 서브넷 설정 확인
   - 보안 그룹 인바운드 규칙 확인

3. **Lambda 콜드 스타트**
   - 연결 풀 재사용 확인
   - 메모리 설정 최적화

### 로그 분석

```bash
# CloudWatch Insights 쿼리 예시
fields @timestamp, level, message, correlationId
| filter level = "ERROR"
| sort @timestamp desc
| limit 100
```

## 기여 가이드라인

### 코딩 규칙
- camelCase 네이밍 (snake_case 금지)
- TypeScript strict 모드 사용
- ESLint 규칙 준수
- 단위 테스트 및 속성 기반 테스트 작성

### 커밋 메시지
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드 설정 등
```

## 라이선스

MIT License

## 연락처

- 개발팀: dev@shiftsleep.com
- 이슈 리포트: GitHub Issues
- 문서: [API 문서](https://docs.shiftsleep.com)