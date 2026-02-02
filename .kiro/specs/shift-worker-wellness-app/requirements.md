# 교대근무자 웰니스 앱 요구사항 명세서

## 1. 프로젝트 개요

### 1.1 목적
교대근무자들의 피로 관리와 웰니스 향상을 위한 모바일 웹 애플리케이션 개발

### 1.2 대상 사용자
- 2교대, 3교대, 고정 야간, 불규칙 근무를 하는 교대근무자
- 수면 패턴 최적화와 피로 관리가 필요한 사용자
- AI 기반 맞춤형 건강 관리 서비스를 원하는 사용자

### 1.3 핵심 가치 제안
- AI 기반 개인 맞춤형 수면창 계획 제공
- 근무표 기반 피로 위험도 실시간 모니터링
- 스마트 카페인 섭취 최적화 가이드
- OCR 기반 간편한 교대근무 스케줄 관리
- AI 챗봇을 통한 24시간 건강 상담

### 1.4 현재 구현 상태
- **프론트엔드**: React 기반 모바일 웹 UI 완료
- **백엔드**: Lambda Python + RDS 구축 예정
- **AI 서비스**: 외부 AI 개발팀에서 별도 구현 (API 호출만 연동)
- **배포**: CloudFront + S3 (프론트엔드), Lambda (백엔드)

## 2. 기능 요구사항

### 2.1 사용자 온보딩 (기존 구현 완료)
**2.1.1 1단계 - 근무 형태 설정**
- 사용자는 4가지 근무 형태 중 선택할 수 있어야 함
  - 2교대 (주간/야간 순환)
  - 3교대 (주간/중간/야간)
  - 고정 야간 (밤 근무 고정)
  - 불규칙 (변동 스케줄)
- 출퇴근 시간을 분 단위로 입력할 수 있어야 함
- 근무 형태 선택 전까지 다음 단계 진행이 불가해야 함

**2.1.2 2단계 - 웨어러블 기기 연동 (현재 미구현)**
- 사용자는 4가지 기기 옵션 중 선택할 수 있어야 함 (UI만 존재)
  - Apple Health (향후 구현 예정)
  - Google Fit (향후 구현 예정)
  - Galaxy Watch (향후 구현 예정)
  - 연결할 기기 없음 (현재 기본값)
- 건너뛰기 옵션이 제공되어야 함
- 온보딩 완료 후 메인 화면으로 이동해야 함

### 2.2 사용자 인증 (기존 구현 완료)
**2.2.1 회원가입**
- 이메일, 비밀번호, 이름을 입력받아야 함
- AWS Cognito를 통한 사용자 계정 생성
- 이메일 중복 검증 및 비밀번호 강도 검증
- 회원가입 완료 후 이메일 인증 화면으로 이동

**2.2.2 이메일 인증**
- 이메일로 전송된 6자리 인증 코드 입력
- 인증 코드 재전송 기능
- 인증 완료 후 로그인 화면으로 이동

**2.2.3 로그인**
- 이메일과 비밀번호로 로그인
- 로그인 상태 유지 (세션 관리)
- 로그인 실패 시 오류 메시지 표시

**2.2.4 로그아웃**
- 안전한 로그아웃 처리
- 세션 정보 완전 삭제
- 로그아웃 후 비로그인 홈 화면으로 이동

### 2.3 홈 대시보드 (백엔드 연동 필요)
**2.3.1 로그인 상태 홈**
- 현재 날짜와 요일 표시
- 개인화된 인사말 (Cognito에서 사용자 이름 가져오기)
- 오늘의 근무 일정 카드 (DB에서 스케줄 조회)
- AI 생성 수면창 최적화 카드 (권장 수면 시간)
- AI 생성 카페인 컷오프 시간 표시
- 실시간 피로 위험도 레벨 표시
- 일일 체크리스트 (DB 저장/조회)

**2.3.2 비로그인 상태 홈**
- 동일한 레이아웃에 로그인/회원가입 유도 메시지
- 플레이스홀더 콘텐츠 표시

### 2.4 웰니스 관리 (백엔드 연동 필요)
**2.4.1 웰니스 메인 페이지**
- AI 생성 카페인 컷오프 카드 (개인 맞춤형 권장 시간)
- AI 생성 수면창 계획 카드 (메인 수면 + 파워냅 시간)
- 릴랙세이션 허브 카드 (S3 오디오 연동)

**2.4.2 카페인 컷오프 페이지 (AI 연동)**
- 원형 시계 시각화 (안전/위험 구역 표시)
- 카페인 섭취 로깅 버튼들 (DB 저장)
- AI 기반 대체 각성 방법 제안
  - 밝은 빛 노출
  - 신체 활동
  - 파워냅
- 근무표 기반 개인 맞춤형 컷오프 시간 계산 (AI 호출)

**2.4.3 릴랙세이션 허브 페이지 (S3 연동)**
- 탭 전환: 명상 vs 백색소음
- 실제 오디오 재생/일시정지 컨트롤 (S3에서 스트리밍)
- 볼륨 조절
- 타이머 옵션 (15-120분)
- 4가지 명상 프로그램 (S3 오디오 파일)
- 5가지 백색소음 옵션 (S3 오디오 파일)
- 팁과 추천 조합 제공

### 2.5 근무 스케줄 관리 (백엔드 연동 필요)
**2.5.1 스케줄 메인 페이지**
- 월간 달력 뷰 (일~토 레이아웃) - DB에서 스케줄 조회
- 주간 상세 뷰 (월~일) - DB에서 스케줄 조회
- 근무 유형별 색상 구분
  - 주간 근무: 08:00-17:00 (황색)
  - 초저녁 근무: 17:00-01:00 (보라색)
  - 야간 근무: 22:00-07:00 (남색)
  - 휴무: - (회색)
- 직접 편집 기능 (근무 유형 순환 선택) - DB 업데이트
- 범례 표시

**2.5.2 스케줄 등록 모달 (OCR AI 연동)**
- 2개 탭 구조:
  - **직접 입력**: 날짜 범위 + 근무 유형 선택 (DB 저장)
  - **이미지 업로드**: 
    - 채팅 형식으로 사진 업로드
    - OCR AI 호출하여 근무표 JSON 파싱
    - 파싱된 결과를 DB에 저장
    - 더미 데이터로 우선 구현 (AI 개발 완료 전까지)
- 등록 완료 후 달력에 반영

**2.5.3 스케줄 확인**
- 등록된 근무표 조회 및 표시
- 월별/주별 뷰 전환
- 근무 패턴 분석 정보 제공

### 2.6 수면창 계획 (AI 연동)
**2.6.1 플랜 메인 페이지**
- AI 생성 7개 시간 블록 타임라인 시각화
- 색상별 구분 (수면/낮잠/기타)
- AI 기반 메인 수면 상세 카드 (개인 맞춤형 시간)
- AI 기반 파워냅 상세 카드 (개인 맞춤형 시간)
- AI 생성 타이밍 근거 설명 섹션
- 수면 알람 설정 버튼 (향후 푸시 알림 연동)

**2.6.2 피로 위험도 페이지 (AI 연동)**
- AI 계산 위험도 레벨 표시 (낮음/보통/높음)
- 그라데이션 미터 시각화
- 입력 요소들 (DB 저장):
  - 수면 시간
  - 연속 야간 근무 일수 (근무표 기반 자동 계산)
  - 출퇴근 시간
- AI 기반 안전 모드 권장사항
  - 운전 피하기
  - 파워냅
  - 대중교통 이용
- 위험도 감소 액션 버튼

**2.6.3 데일리 점프스타트 페이지**
- AI 생성 3개 구조화된 블록:
  - 지금 (15분)
  - 필수 작업 (90분)
  - 회복 (10분)
- 작업별 체크리스트 (DB 저장/조회)
- 블록별 진행률 표시
- 각 작업의 예상 소요 시간
- 완료 상태 DB 저장

### 2.7 AI 챗봇 상담 (신규 기능)
**2.7.1 챗봇 인터페이스**
- 채팅 형식의 대화 인터페이스
- 교대근무 관련 건강 상담 AI 호출
- 더미 응답으로 우선 구현 (AI 개발 완료 전까지)
- 대화 내역 DB 저장
- 24시간 이용 가능

**2.7.2 상담 주제**
- 수면 관련 문의
- 피로 관리 방법
- 카페인 섭취 조언
- 근무 스케줄 최적화
- 건강 관리 팁

### 2.8 프로필 관리 (백엔드 연동 필요)
**2.8.1 프로필 페이지**
- Cognito에서 사용자 정보 조회 및 표시
- 온보딩 설정 수정 기능
- 로그아웃 버튼
- 홈으로 돌아가기 네비게이션

### 2.9 네비게이션 (기존 구현 완료)
**2.9.1 하단 네비게이션**
- 5개 메인 섹션: 홈, 웰빙, 근무표, 플랜, 내정보
- 현재 활성 섹션 하이라이트
- 아이콘 + 라벨 구조

**2.9.2 상단 바**
- 뒤로가기 버튼
- 페이지 제목
- 우측 슬롯 (프로필, 로그아웃 등)

## 3. 백엔드 아키텍처 요구사항

### 3.1 인프라 구조
- **컴퓨팅**: AWS Lambda (Python 3.9+)
- **데이터베이스**: Amazon RDS (PostgreSQL 또는 MySQL)
- **캐시**: AWS ElastiCache (Redis) - Cognito 세션 관리용
- **스토리지**: Amazon S3 (오디오 파일 저장)
- **CDN**: CloudFront (프론트엔드 배포)
- **인증**: AWS Cognito (기존 유지)

### 3.2 API 설계
**3.2.1 RESTful API 엔드포인트**
```
GET /api/user/profile          # 사용자 프로필 조회
PUT /api/user/profile          # 사용자 프로필 수정

GET /api/schedule              # 근무 스케줄 조회
POST /api/schedule             # 근무 스케줄 등록
PUT /api/schedule/{date}       # 특정 날짜 스케줄 수정
DELETE /api/schedule/{date}    # 특정 날짜 스케줄 삭제

POST /api/schedule/ocr         # OCR 이미지 업로드 (더미)
POST /api/ai/sleep-plan        # AI 수면 계획 생성 (더미)
POST /api/ai/caffeine-plan     # AI 카페인 계획 생성 (더미)
POST /api/ai/fatigue-risk      # AI 피로 위험도 계산 (더미)
POST /api/ai/chatbot           # AI 챗봇 상담 (더미)

GET /api/checklist             # 체크리스트 조회
POST /api/checklist            # 체크리스트 완료 상태 저장

GET /api/audio/meditation      # 명상 오디오 목록
GET /api/audio/whitenoise      # 백색소음 오디오 목록
GET /api/audio/stream/{id}     # 오디오 스트리밍 URL
```

### 3.3 데이터베이스 스키마
**3.3.1 사용자 테이블 (users)**
```sql
CREATE TABLE users (
    user_id VARCHAR(255) PRIMARY KEY,  -- Cognito user ID
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    work_type ENUM('2shift', '3shift', 'fixed_night', 'irregular'),
    commute_time INT DEFAULT 30,
    wearable_device ENUM('apple', 'google', 'galaxy', 'none'),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**3.3.2 근무 스케줄 테이블 (schedules)**
```sql
CREATE TABLE schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    work_date DATE NOT NULL,
    shift_type ENUM('day', 'evening', 'night', 'off') NOT NULL,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE KEY unique_user_date (user_id, work_date)
);
```

**3.3.3 체크리스트 테이블 (checklists)**
```sql
CREATE TABLE checklists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    task_date DATE NOT NULL,
    task_type ENUM('daily', 'jumpstart') NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE KEY unique_user_task (user_id, task_date, task_type, task_name)
);
```

**3.3.4 AI 상담 내역 테이블 (chat_history)**
```sql
CREATE TABLE chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

**3.3.5 오디오 파일 테이블 (audio_files)**
```sql
CREATE TABLE audio_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type ENUM('meditation', 'whitenoise') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_seconds INT,
    s3_key VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 4. 비기능 요구사항

### 4.1 성능 요구사항
- 페이지 로딩 시간 3초 이내
- API 응답 시간 1초 이내
- 애니메이션 60fps 유지
- 모바일 최적화 (390x844px 기준)
- S3 오디오 스트리밍 지연 최소화

### 4.2 사용성 요구사항
- 직관적인 터치 인터페이스
- 부드러운 화면 전환 애니메이션
- 일관된 디자인 시스템
- 오프라인 상태에서도 기본 기능 이용 가능

### 4.3 보안 요구사항
- AWS Cognito를 통한 안전한 인증
- API 엔드포인트 JWT 토큰 인증
- 민감한 데이터 암호화 저장
- HTTPS 통신 강제
- SQL Injection 방지

### 4.4 호환성 요구사항
- 모던 웹 브라우저 지원
- iOS Safari, Android Chrome 최적화
- 반응형 디자인
- PWA 지원 (향후 고려)

### 4.5 확장성 요구사항
- Lambda 함수 자동 스케일링
- RDS 읽기 전용 복제본 지원
- CloudFront 글로벌 배포
- API Gateway 요청 제한

## 5. 데이터 요구사항

### 5.1 사용자 데이터 (DB 저장)
```typescript
interface UserProfile {
  userId: string;           // Cognito user ID
  email: string;
  name: string;
  workType: "2shift" | "3shift" | "fixed_night" | "irregular";
  commuteTime: number;      // 분 단위
  wearableDevice: "apple" | "google" | "galaxy" | "none";
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.2 스케줄 데이터 (DB 저장)
```typescript
interface Schedule {
  id: number;
  userId: string;
  workDate: string;         // YYYY-MM-DD
  shiftType: "day" | "evening" | "night" | "off";
  startTime?: string;       // HH:MM
  endTime?: string;         // HH:MM
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.3 체크리스트 데이터 (DB 저장)
```typescript
interface ChecklistItem {
  id: number;
  userId: string;
  taskDate: string;         // YYYY-MM-DD
  taskType: "daily" | "jumpstart";
  taskName: string;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
}
```

### 5.4 AI 상담 데이터 (DB 저장)
```typescript
interface ChatMessage {
  id: number;
  userId: string;
  message: string;
  response: string;
  createdAt: Date;
}
```

### 5.5 오디오 파일 데이터 (S3 + DB)
```typescript
interface AudioFile {
  id: number;
  fileName: string;
  fileType: "meditation" | "whitenoise";
  title: string;
  description?: string;
  durationSeconds: number;
  s3Key: string;
  streamingUrl: string;     // CloudFront URL
  createdAt: Date;
}
```

## 6. 기술 요구사항

### 6.1 프론트엔드 (기존 유지)
- React 19.2 + TypeScript
- Vite 빌드 도구
- Tailwind CSS 스타일링
- Framer Motion 애니메이션
- Lucide React 아이콘

### 6.2 백엔드 (신규 구축)
- **런타임**: AWS Lambda (Python 3.9+)
- **프레임워크**: FastAPI 또는 Flask
- **데이터베이스**: Amazon RDS (PostgreSQL/MySQL)
- **ORM**: SQLAlchemy 또는 Django ORM
- **캐시**: Amazon ElastiCache (Redis)
- **API Gateway**: AWS API Gateway

### 6.3 인증 및 보안 (기존 유지)
- AWS Amplify
- AWS Cognito 사용자 관리
- JWT 토큰 기반 API 인증
- 환경 변수 설정:
  - `VITE_COGNITO_USER_POOL_ID`
  - `VITE_COGNITO_USER_POOL_CLIENT_ID`
  - `VITE_API_BASE_URL`

### 6.4 스토리지 및 CDN
- **정적 파일**: Amazon S3
- **오디오 스트리밍**: S3 + CloudFront
- **프론트엔드 배포**: S3 + CloudFront

### 6.5 개발 도구 (기존 유지)
- ESLint 코드 린팅
- TypeScript strict 모드
- PostCSS + Autoprefixer

### 6.6 외부 AI 서비스 연동
- OCR 근무표 파싱 API (더미 구현)
- 수면 계획 생성 AI API (더미 구현)
- 카페인 계획 생성 AI API (더미 구현)
- 피로 위험도 계산 AI API (더미 구현)
- 건강 상담 챗봇 AI API (더미 구현)

## 7. 개발 우선순위 및 단계

### 7.1 1단계: 백엔드 기본 인프라 구축
- [ ] Lambda 함수 기본 구조 설정
- [ ] RDS 데이터베이스 생성 및 스키마 구축
- [ ] API Gateway 설정
- [ ] Cognito 연동 및 JWT 인증 구현

### 7.2 2단계: 핵심 API 개발
- [ ] 사용자 프로필 CRUD API
- [ ] 근무 스케줄 CRUD API
- [ ] 체크리스트 API
- [ ] S3 오디오 파일 관리 API

### 7.3 3단계: AI 더미 API 구현
- [ ] OCR 근무표 파싱 더미 API
- [ ] 수면 계획 생성 더미 API
- [ ] 카페인 계획 생성 더미 API
- [ ] 피로 위험도 계산 더미 API
- [ ] 챗봇 상담 더미 API

### 7.4 4단계: 프론트엔드 백엔드 연동
- [ ] API 클라이언트 라이브러리 구현
- [ ] 홈 대시보드 데이터 연동
- [ ] 스케줄 관리 기능 연동
- [ ] 웰니스 기능 연동
- [ ] 오디오 스트리밍 연동

### 7.5 5단계: 추가 기능 및 최적화
- [ ] AI 챗봇 인터페이스 구현
- [ ] 캐시 최적화
- [ ] 성능 튜닝
- [ ] 에러 처리 및 로깅

## 8. 향후 개발 계획

### 8.1 현재 더미로 구현할 기능들
- **OCR 근무표 파싱**: 이미지 업로드 시 하드코딩된 JSON 응답
- **AI 수면 계획 생성**: 근무표 기반 고정된 수면 시간 응답
- **AI 카페인 계획 생성**: 근무 유형별 고정된 컷오프 시간 응답
- **AI 피로 위험도 계산**: 입력값 기반 간단한 점수 계산
- **AI 챗봇 상담**: 미리 정의된 Q&A 응답

### 8.2 실제 AI 연동 시 변경사항
- 더미 API를 실제 AI 서비스 호출로 교체
- 응답 형식은 동일하게 유지하여 프론트엔드 수정 최소화
- AI 서비스 장애 시 더미 응답으로 fallback

### 8.3 미구현 기능 (향후 계획)
- 웨어러블 기기 실제 연동 (Apple Health, Google Fit, Galaxy Watch)
- 푸시 알림 (수면 알람, 카페인 컷오프 알림)
- 실시간 건강 데이터 동기화
- 고급 분석 및 리포트 기능
- 소셜 기능 (팀 단위 피로 관리)

## 9. 수용 기준

### 9.1 온보딩 플로우 (기존 완료)
- [x] 사용자가 2단계 온보딩을 완료할 수 있어야 함
- [x] 온보딩 완료 후 재진입 시 메인 화면으로 이동해야 함
- [ ] 사용자 설정이 DB에 저장되어야 함 (현재 localStorage)

### 9.2 인증 시스템 (기존 완료)
- [x] 회원가입, 이메일 인증, 로그인이 정상 작동해야 함
- [x] 세션 상태가 앱 재시작 후에도 유지되어야 함
- [x] 로그아웃 시 모든 세션 정보가 삭제되어야 함

### 9.3 백엔드 API 연동 (신규 구현 필요)
- [ ] 모든 API 엔드포인트가 정상 응답해야 함
- [ ] JWT 토큰 기반 인증이 작동해야 함
- [ ] 데이터베이스 CRUD 작업이 정상 작동해야 함
- [ ] S3 오디오 스트리밍이 정상 작동해야 함

### 9.4 핵심 기능 (백엔드 연동 후)
- [ ] 홈 대시보드에서 실제 사용자 데이터가 표시되어야 함
- [ ] 스케줄 등록 및 편집이 DB에 저장되어야 함
- [ ] 체크리스트 완료 상태가 DB에 저장되어야 함
- [ ] AI 더미 API가 적절한 응답을 반환해야 함

### 9.5 사용자 경험 (기존 유지)
- [x] 모바일 화면에서 터치 인터페이스가 직관적이어야 함
- [x] 애니메이션이 부드럽게 재생되어야 함
- [x] 일관된 디자인 시스템이 적용되어야 함

### 9.6 성능 (백엔드 연동 후)
- [ ] API 응답 시간이 1초 이내여야 함
- [ ] 초기 로딩 시간이 3초 이내여야 함
- [ ] 오디오 스트리밍 지연이 최소화되어야 함
- [ ] 메모리 누수가 없어야 함

### 9.7 새로운 기능
- [ ] AI 챗봇 인터페이스가 정상 작동해야 함
- [ ] OCR 이미지 업로드 더미 기능이 작동해야 함
- [ ] 실제 오디오 파일 재생이 가능해야 함
- [ ] 사용자별 개인화된 데이터가 표시되어야 함