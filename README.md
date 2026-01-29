# 🌙 ShiftSync - 교대근무자 웰니스 AI 플랫폼

<div align="center">

![AWS Healthcare AI Jumpstart](https://img.shields.io/badge/AWS-Healthcare_AI_Jumpstart-FF9900?style=for-the-badge&logo=amazon-aws)
![AWS Prompthon](https://img.shields.io/badge/AWS-Prompthon_2026-232F3E?style=for-the-badge&logo=amazon-aws)
![Kangwon LRS University](https://img.shields.io/badge/강원LRS공유대학-협력-0066CC?style=for-the-badge)

**교대근무자를 위한 AI 기반 수면·피로 관리 솔루션**

[🎯 주요 기능](#-주요-기능) • [🏗️ 아키텍처](#️-아키텍처) • [🚀 시작하기](#-시작하기) • [📖 문서](#-문서)

</div>

---

## 📋 목차

- [프로젝트 소개](#-프로젝트-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [아키텍처](#️-아키텍처)
- [시작하기](#-시작하기)
- [배포](#-배포)
- [프로젝트 구조](#-프로젝트-구조)
- [API 문서](#-api-문서)
- [기여하기](#-기여하기)
- [라이선스](#-라이선스)

---

## 🎯 프로젝트 소개

**ShiftSync**는 교대근무자의 건강한 생활 리듬을 지원하는 AI 기반 웰니스 플랫폼입니다. AWS Bedrock Agent와 생체리듬 분석 알고리즘을 활용하여 개인 맞춤형 수면·카페인·피로 관리 솔루션을 제공합니다.

### 🎓 프로젝트 배경

- **AWS Healthcare AI Jumpstart Prompthon** 출품작
- **강원LRS공유대학** 협력 프로젝트
- **교대근무자 건강 문제 해결**을 위한 실용적 솔루션

### 🌟 핵심 가치

- 🧠 **AI 기반 개인화**: AWS Bedrock Agent를 활용한 맞춤형 추천
- 📊 **생체리듬 분석**: 과학적 근거 기반 BioPathway 알고리즘
- 📱 **직관적 UX**: 모바일 최적화 인터페이스
- 🔒 **안전한 데이터**: AWS 보안 인프라 활용

---

## ✨ 주요 기능

### 1. 🤖 AI 챗봇 상담 (RAG Agent)
- AWS Bedrock Agent 기반 대화형 AI
- 교대근무 관련 건강 상담 및 조언
- 실시간 질의응답 지원

### 2. 🛏️ 맞춤형 수면 계획 (Bio-Coach Agent)
- 근무 스케줄 기반 최적 수면 시간 추천
- 주간/야간/저녁 근무별 차별화된 전략
- 낮잠 시간 및 수면 윈도우 제안

### 3. ☕ 카페인 섭취 관리
- 수면 시간 고려한 카페인 마감 시간 계산
- 근무 유형별 최적 섭취 타이밍
- 대체 각성 방법 제안

### 4. 📊 피로 위험도 평가
- 수면 시간, 연속 야간 근무, 출퇴근 시간 종합 분석
- Low/Medium/High 3단계 위험도 분류
- 안전 권장사항 제공

### 5. 📅 스케줄 관리
- **OCR 기반 자동 등록**: 스케줄표 사진 업로드로 자동 파싱
- 수동 입력 지원
- 월간/주간 근무 일정 시각화

### 6. 🎯 Daily Jumpstart
- 하루 시작을 위한 3단계 블록 시스템
  - **Now Block**: 즉시 실행 작업
  - **Must-do Block**: 필수 작업
  - **Recovery Block**: 회복 활동
- 작업별 예상 소요 시간 및 진행률 추적

### 7. 🧘 이완 & 휴식 허브
- 명상 가이드 오디오
- 백색소음 (빗소리, 파도소리 등)
- S3 기반 스트리밍 재생

---

## 🛠️ 기술 스택

### Frontend
![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.29-0055FF?style=flat-square&logo=framer&logoColor=white)

- **React 19.2** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Vite** - 빌드 도구
- **Tailwind CSS** - 유틸리티 기반 스타일링
- **Framer Motion** - 애니메이션
- **Lucide React** - 아이콘

### Backend
![AWS Lambda](https://img.shields.io/badge/AWS_Lambda-Python_3.x-FF9900?style=flat-square&logo=aws-lambda&logoColor=white)
![AWS Bedrock](https://img.shields.io/badge/AWS_Bedrock-Agents-FF9900?style=flat-square&logo=amazon-aws&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-RDS-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![API Gateway](https://img.shields.io/badge/API_Gateway-REST-FF4F8B?style=flat-square&logo=amazon-api-gateway&logoColor=white)

- **AWS Lambda** - 서버리스 컴퓨팅 (Python 3.x)
- **AWS Bedrock Agents** - AI 추론 엔진
  - RAG Chatbot Agent
  - OCR Agent
  - Bio-Coach Agent
- **AWS RDS (PostgreSQL)** - 관계형 데이터베이스
- **AWS API Gateway** - REST API 엔드포인트
- **AWS S3** - 파일 스토리지
- **AWS Cognito** - 사용자 인증

### Infrastructure
![AWS](https://img.shields.io/badge/AWS-Cloud-232F3E?style=flat-square&logo=amazon-aws&logoColor=white)
![CloudFront](https://img.shields.io/badge/CloudFront-CDN-8C4FFF?style=flat-square&logo=amazon-cloudfront&logoColor=white)
![VPC](https://img.shields.io/badge/VPC-Network-FF9900?style=flat-square&logo=amazon-aws&logoColor=white)

- **AWS VPC** - 네트워크 격리
- **AWS CloudFront** - CDN 및 HTTPS
- **AWS CloudWatch** - 로깅 및 모니터링

---

## 🏗️ 아키텍처

### 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│                    CloudFront + S3 Hosting                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (REST)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
┌───────────────────────┐   ┌───────────────────────┐
│   Lambda Functions    │   │   Bedrock Agents      │
│   (VPC)               │   │                       │
│                       │   │  • RAG Chatbot        │
│  • user_management    │◄──┤  • OCR Agent          │
│  • schedule_mgmt      │   │  • Bio-Coach Agent    │
│  • ai_services        │   │                       │
│  • fatigue_assess     │   └───────────────────────┘
│  • jumpstart          │
│  • wellness           │
│  • biopathway_calc    │
│  • ocr_vision         │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│   RDS PostgreSQL      │
│   (VPC)               │
└───────────────────────┘
```

### Lambda 함수 구조

#### API Gateway 연결 Lambda (6개)
1. **user_management** - 사용자 프로필 관리
2. **schedule_management** - 근무 스케줄 CRUD
3. **ai_services** - AI 추천 및 챗봇
4. **fatigue_assessment** - 피로 위험도 계산
5. **jumpstart** - Daily Jumpstart 생성
6. **wellness** - 웰니스 추천

#### Bedrock Agent Action Group Lambda (2개)
7. **biopathway_calculator** - 생체리듬 분석 (Bio-Coach Agent용)
8. **ocr_vision** - 스케줄 이미지 OCR (OCR Agent용)

### 데이터베이스 스키마

```sql
users                    -- 사용자 정보
schedules                -- 근무 스케줄
schedule_images          -- OCR 업로드 이미지
sleep_plans              -- AI 생성 수면 계획
caffeine_plans           -- AI 생성 카페인 계획
fatigue_assessments      -- 피로 위험도 평가
jumpstart_blocks         -- Jumpstart 블록
jumpstart_tasks          -- Jumpstart 작업
daily_checklists         -- 일일 체크리스트
chat_history             -- AI 상담 내역
audio_files              -- 이완 오디오 파일
```

---

## 🚀 시작하기

### 사전 요구사항

- **Node.js** 18 이상
- **Python** 3.11 이상
- **AWS CLI** 설정 완료
- **AWS 계정** (Bedrock, Lambda, RDS 권한)

### 로컬 개발 환경 설정

#### 1. 저장소 클론

```bash
git clone https://github.com/your-username/shiftsync.git
cd shiftsync
```

#### 2. 프론트엔드 설정

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
```

`.env.local` 파일 편집:
```env
VITE_COGNITO_USER_POOL_ID=your-user-pool-id
VITE_COGNITO_USER_POOL_CLIENT_ID=your-client-id
VITE_API_BASE_URL=your-api-gateway-url
VITE_DEV_MODE=true
```

```bash
# 개발 서버 실행
npm run dev
```

#### 3. 백엔드 설정

```bash
cd backend

# Python 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
```

`backend/.env` 파일 편집:
```env
# Database
DB_HOST=your-rds-endpoint
DB_PORT=5432
DB_NAME=rhythm_fairy
DB_USER=postgres
DB_PASSWORD=your-password

# AWS
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket

# Bedrock Agents
BEDROCK_AGENT_ID=your-rag-agent-id
BEDROCK_AGENT_ALIAS_ID=your-rag-alias-id
BEDROCK_OCR_AGENT_ID=your-ocr-agent-id
BEDROCK_OCR_AGENT_ALIAS_ID=your-ocr-alias-id
BEDROCK_BIO_AGENT_ID=your-bio-agent-id
BEDROCK_BIO_AGENT_ALIAS_ID=your-bio-alias-id
BEDROCK_REGION=us-east-1

# Cognito
COGNITO_USER_POOL_ID=your-user-pool-id
COGNITO_CLIENT_ID=your-client-id
```

#### 4. 데이터베이스 초기화

```bash
cd backend/scripts
python init_database.py
```

---

## 📦 배포

### 전체 자동 배포 (권장)

```bash
python scripts/deploy_all.py
```

이 스크립트는 다음을 자동으로 수행합니다:
1. ✅ Lambda 함수 배포 (8개)
2. ✅ API Gateway 설정
3. ✅ 프론트엔드 빌드 및 S3 업로드
4. ✅ CloudFront 배포

### 개별 배포

#### 백엔드만 배포

```bash
# 일반 Lambda 함수 (6개)
python backend/scripts/deploy_lambda.py

# Bedrock Agent Action Group Lambda (2개)
python backend/scripts/deploy_biopathway.py
python backend/scripts/deploy_ocr_lambda.py

# AI Services 환경변수 복원
python backend/scripts/deploy_ai_services_only.py

# API Gateway 설정
python backend/scripts/setup_api_gateway.py
```

#### 프론트엔드만 배포

```bash
python scripts/deploy_frontend.py
```

### 배포 후 확인

```bash
# CloudWatch 로그 확인
python backend/scripts/check_cloudwatch_logs.py

# 데이터베이스 상태 확인
python backend/scripts/check_database.py
```

자세한 배포 가이드는 [DEPLOYMENT.md](DEPLOYMENT.md)를 참조하세요.

---

## 📁 프로젝트 구조

```
shiftsync/
├── src/                          # 프론트엔드 소스
│   ├── components/               # React 컴포넌트
│   │   ├── layout/              # 레이아웃 컴포넌트
│   │   ├── schedule/            # 스케줄 관련
│   │   └── shared/              # 공유 컴포넌트
│   ├── pages/                   # 페이지 컴포넌트
│   │   ├── auth/                # 인증 화면
│   │   ├── home/                # 홈 대시보드
│   │   ├── onboarding/          # 온보딩
│   │   ├── plan/                # 계획 관리
│   │   ├── profile/             # 프로필
│   │   ├── schedule/            # 스케줄
│   │   └── wellness/            # 웰니스
│   ├── lib/                     # 라이브러리 통합
│   ├── types/                   # TypeScript 타입
│   └── utils/                   # 유틸리티 함수
│
├── backend/                      # 백엔드 소스
│   ├── lambda/                  # Lambda 함수들
│   │   ├── ai_services/         # AI 추천 및 챗봇
│   │   ├── biopathway_calculator/ # 생체리듬 분석
│   │   ├── fatigue_assessment/  # 피로 평가
│   │   ├── jumpstart/           # Jumpstart 생성
│   │   ├── ocr_vision/          # OCR 처리
│   │   ├── schedule_management/ # 스케줄 관리
│   │   ├── user_management/     # 사용자 관리
│   │   └── wellness/            # 웰니스 추천
│   ├── infrastructure/          # 인프라 코드
│   │   ├── complete_schema.sql  # DB 스키마
│   │   ├── sample_data.sql      # 샘플 데이터
│   │   └── rds_setup.sql        # RDS 설정
│   ├── scripts/                 # 배포 및 관리 스크립트
│   │   ├── deploy_lambda.py     # Lambda 배포
│   │   ├── deploy_biopathway.py # BioPathway 배포
│   │   ├── deploy_ocr_lambda.py # OCR Lambda 배포
│   │   ├── init_database.py     # DB 초기화
│   │   └── check_cloudwatch_logs.py # 로그 확인
│   └── utils/                   # 유틸리티
│       ├── database.py          # DB 헬퍼
│       └── s3_manager.py        # S3 헬퍼
│
├── scripts/                      # 전체 배포 스크립트
│   ├── deploy_all.py            # 전체 배포
│   └── deploy_frontend.py       # 프론트엔드 배포
│
├── .kiro/                       # Kiro AI 스펙
│   └── specs/                   # 기능 스펙 문서
│
├── DEPLOYMENT.md                # 배포 가이드
├── README.md                    # 이 파일
└── package.json                 # 프론트엔드 의존성
```

---

## 📖 API 문서

### 주요 엔드포인트

#### 사용자 관리
```
POST   /users                    # 사용자 생성
GET    /users/{user_id}          # 사용자 조회
PUT    /users/{user_id}          # 사용자 업데이트
```

#### 스케줄 관리
```
POST   /users/{user_id}/schedules           # 스케줄 생성
GET    /users/{user_id}/schedules           # 스케줄 목록
POST   /users/{user_id}/schedules/ocr       # OCR 업로드
```

#### AI 서비스
```
POST   /users/{user_id}/chat                # AI 챗봇
POST   /users/{user_id}/sleep-plan          # 수면 계획 생성
GET    /users/{user_id}/sleep-plan          # 수면 계획 조회
POST   /users/{user_id}/caffeine-plan       # 카페인 계획 생성
GET    /users/{user_id}/caffeine-plan       # 카페인 계획 조회
```

#### 피로 평가
```
POST   /users/{user_id}/fatigue             # 피로도 평가
GET    /users/{user_id}/fatigue             # 피로도 조회
```

#### Jumpstart
```
POST   /users/{user_id}/jumpstart           # Jumpstart 생성
GET    /users/{user_id}/jumpstart           # Jumpstart 조회
PUT    /users/{user_id}/jumpstart/tasks/{task_id} # 작업 완료
```

자세한 API 문서는 각 Lambda 함수의 `handler.py` 파일을 참조하세요.

---

## 🧪 테스트

### 프론트엔드 테스트

```bash
npm run lint
```

### 백엔드 테스트

```bash
# 데이터베이스 연결 테스트
python backend/scripts/test_connection.py

# Bedrock Agent 테스트
python backend/scripts/test_bedrock_agent.py

# Bio-Coach Agent 통합 테스트
python backend/scripts/test_bio_coach_integration.py
```

---

## 🤝 기여하기

기여를 환영합니다! 다음 단계를 따라주세요:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 코딩 컨벤션

- **Frontend**: ESLint 규칙 준수
- **Backend**: PEP 8 스타일 가이드
- **Commit**: Conventional Commits 형식

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 👥 팀

**AWS Healthcare AI Jumpstart Prompthon 2026**

- 강원LRS공유대학 협력
- 교대근무자 건강 증진을 위한 AI 솔루션

---

## 📞 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 Issue를 생성해주세요.

---

## 🙏 감사의 말

- **AWS** - Bedrock Agent 및 클라우드 인프라 제공
- **강원LRS공유대학** - 프로젝트 협력 및 지원
- **교대근무자 커뮤니티** - 피드백 및 테스트 참여

---

<div align="center">

**Made with ❤️ for Shift Workers**

[![AWS](https://img.shields.io/badge/Powered_by-AWS-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![Bedrock](https://img.shields.io/badge/AI-Bedrock_Agents-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/bedrock/)

</div>
