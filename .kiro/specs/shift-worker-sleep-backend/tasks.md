# 구현 계획: 교대근무자 수면 최적화 백엔드 시스템

## 개요

하이브리드 AWS 아키텍처(Lambda + EC2 FastAPI + ElastiCache Serverless)를 기반으로 한 교대근무자 수면 최적화 백엔드 시스템의 구현 계획입니다. MVP 기능을 우선 구현하고, 3대 핵심 엔진(Shift-to-Sleep, Caffeine Cutoff, Fatigue Risk Score)을 중심으로 점진적으로 기능을 확장합니다.

**배포 리전**: us-east-1 (버지니아 북부)
**변수명 규칙**: camelCase 사용 (snake_case 금지)

## 구현 작업

- [x] 1. 프로젝트 설정 및 인프라 구성
  - TypeScript 프로젝트 초기화 및 AWS CDK 설정 (us-east-1 리전)
  - RDS PostgreSQL 데이터베이스 스키마 생성
  - ElastiCache Serverless 클러스터 설정
  - Lambda 함수 기본 구조 및 RDS 연결 설정
  - EC2 FastAPI 서비스 기본 구조 설정
  - _Requirements: 전체 시스템 기반_

- [x] 2. 데이터베이스 스키마 및 연결 구현
  - [x] 2.1 PostgreSQL 스키마 생성
    - users, shift_schedules, engine_cache, file_metadata, jumpstart_checklists 테이블 생성
    - 외래 키 제약 조건 및 인덱스 설정
    - _Requirements: 10.2, 11.1_
  
  - [x]* 2.2 데이터베이스 연결 서비스 구현
    - DatabaseService 클래스 구현 (연결 풀, 트랜잭션 지원)
    - RDS Proxy 연결 최적화
    - _Requirements: 10.1, 10.3_

- [ ] 3. 사용자 인증 및 권한 관리
  - [x] 3.1 인증 서비스 구현
    - Cognito JWT 토큰 검증
    - Cognito sub → user_id 매핑 로직
    - _Requirements: 10.1_
  
  - [-]* 3.2 공통 인증 가드 유틸 구현
    - requireUser(event) 함수로 모든 Lambda 진입점에서 강제 호출
    - Cross-user access 차단 로직 (Cognito sub → user_id 매핑)
    - _Requirements: 10.1, 10.5_

- [ ] 4. 사용자 관리 Lambda 구현
  - [x] 4.1 사용자 온보딩 API 구현
    - POST /api/v1/users/onboarding 엔드포인트
    - 사용자 프로필 생성 및 트랜잭션 처리
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 4.2 사용자 프로필 CRUD API 구현
    - GET/PUT/DELETE /api/v1/users/profile 엔드포인트
    - 프로필 수정 시 캐시 무효화
    - _Requirements: 1.5_
  
  - [ ]* 4.3 사용자 관리 단위 테스트
    - 온보딩 플로우 테스트
    - 프로필 CRUD 테스트
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 5. 근무표 관리 Lambda 구현
  - [x] 5.1 근무표 CRUD API 구현
    - POST/PUT/DELETE /api/v1/schedules 엔드포인트
    - 근무표 검증 로직 (시간 겹침, 4-16시간 제한)
    - _Requirements: 3.1, 3.3, 3.4_
  
  - [x] 5.2 커서 기반 페이지네이션 구현 (성능 최적화)
    - GET /api/v1/schedules?from&to&limit&cursor= 엔드포인트
    - 응답: { items, nextCursor } 형식
    - DB: (date, schedule_id) 복합 커서로 정렬/비교
    - _Requirements: 3.2, 3.5_
  
  - [ ]* 5.3 근무표 검증 속성 테스트
    - **Property 1: 근무표 시간 유효성 불변식**
    - **Validates: Requirements 3.1, 3.3, 3.4**
  
  - [ ]* 5.4 근무표 CRUD 단위 테스트
    - 검증 실패 케이스 테스트
    - 페이지네이션 테스트
    - _Requirements: 3.2, 3.5_

- [ ] 6. 핵심 엔진 EC2 FastAPI 구현
  - [x] 6.1 EC2 FastAPI 서비스 기본 구조
    - FastAPI 애플리케이션 초기화
    - ElastiCache 연결 및 캐시 관리
    - Bedrock 클라이언트 설정
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 6.2 Shift-to-Sleep 엔진 구현
    - 최적 수면창 계산 알고리즘
    - 근무 시간 충돌 방지 로직
    - _Requirements: 4.1_
  
  - [x] 6.3 Caffeine Cutoff 엔진 구현
    - 카페인 반감기 기반 마감시간 계산
    - 반감기 정보 제공
    - _Requirements: 4.2_
  
  - [x] 6.4 Fatigue Risk Score 엔진 구현
    - 수면 부족, 연속 야간근무, 통근 피로 점수 계산
    - 위험 레벨 결정 및 권장사항 생성
    - _Requirements: 4.3_
  
  - [x] 6.5 AI 상담봇 구현 (Bedrock 연동)
    - Amazon Bedrock Claude 모델 연동
    - 교대근무 특화 상담 로직
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ]* 6.6 Shift-to-Sleep 엔진 속성 테스트
    - **Property 2: Shift-to-Sleep 기본 논리 정합성**
    - **Validates: Requirements 4.1**
  
  - [ ]* 6.7 Caffeine Cutoff 엔진 속성 테스트
    - **Property 3: Caffeine Cutoff 수학적 정합성**
    - **Validates: Requirements 4.2**
  
  - [ ]* 6.8 Fatigue Risk Score 엔진 속성 테스트
    - **Property 4: Fatigue Risk Score 범위 및 단조성**
    - **Validates: Requirements 4.3**

- [ ] 7. ElastiCache 캐시 시스템 구현
  - [x] 7.1 ElastiCache Serverless 연결 서비스
    - Redis 클라이언트 초기화 및 연결 관리
    - 캐시 키 네이밍 규칙 정의
    - TTL 관리 및 만료 처리
    - _Requirements: 4.4, 4.5_
  
  - [x] 7.2 엔진 결과 캐시 구현
    - 엔진별 계산 결과 캐시 저장/조회
    - 캐시 히트/미스 메트릭 수집
    - _Requirements: 4.4, 4.5_
  
  - [x] 7.3 캐시 무효화 로직 구현
    - 근무표/프로필 변경 시 관련 캐시 삭제
    - 배치 작업을 통한 캐시 갱신
    - _Requirements: 4.4, 4.5_
  
  - [ ]* 7.4 캐시 시스템 속성 테스트
    - **Property 5: 캐시 TTL·만료 불변식**
    - **Validates: Requirements 4.4, 4.5**

- [ ] 8. 대시보드 Lambda 구현
  - [x] 8.1 홈 대시보드 API 구현
    - GET /api/v1/dashboard/home 엔드포인트
    - EC2 엔진 서비스 호출 및 결과 통합
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 8.2 점프스타트 체크리스트 API 구현
    - GET/POST /api/v1/dashboard/jumpstart 엔드포인트
    - 체크리스트 진행률 계산
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ]* 8.3 대시보드 일관성 속성 테스트
    - **Property 6: 홈 대시보드 "일관된 스냅샷" 제공**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ] 9. 파일 관리 Lambda 구현
  - [ ] 9.1 파일 업로드/다운로드 URL 생성
    - POST /api/v1/files/upload-url 엔드포인트
    - GET /api/v1/files/{fileId}/download-url 엔드포인트
    - S3 presigned URL 생성 및 보안 검증
    - _Requirements: 9.1, 9.2_
  
  - [ ] 9.2 파일 메타데이터 관리
    - POST /api/v1/files/{fileId}/metadata 엔드포인트
    - 업로드 완료 후 재검증 로직
    - _Requirements: 9.3, 9.4, 9.5_
  
  - [ ]* 9.3 파일 접근 통제 속성 테스트
    - **Property 7: 파일 접근 통제 (Presigned URL Scope)**
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [ ] 10. 배치 처리 Lambda 구현
  - [x] 10.1 일일 캐시 갱신 배치 구현 (활성 사용자 정의 포함)
    - users 테이블에 last_active_at 컬럼 추가
    - 활성 사용자 조회: WHERE last_active_at >= NOW() - interval '7 days'
    - EC2 엔진 서비스 호출을 통한 캐시 사전 계산
    - _Requirements: 12.1, 12.2_
  
  - [x] 10.2 EventBridge 스케줄러 설정
    - 매일 새벽 3시 (Asia/Seoul) 실행
    - 배치 실패 시 CloudWatch 알람
    - _Requirements: 12.1, 12.5, 12.6_
  
  - [ ]* 10.3 배치 처리 속성 테스트
    - **Property 8: 배치의 멱등성과 최소 1회 실행 내성**
    - **Validates: Requirements 12.1, 12.2, 12.4**

- [x] 11. 체크포인트 - 핵심 기능 검증
  - 모든 핵심 API 엔드포인트 동작 확인
  - 3대 엔진 계산 결과 검증
  - 캐시 시스템 정상 동작 확인
  - 사용자에게 질문이 있으면 문의

- [ ] 12. 로깅 및 모니터링 구현
  - [x] 12.1 구조화된 로깅 시스템
    - Logger 클래스 구현 (PII 마스킹 포함)
    - Correlation ID 생성 및 전파
    - _Requirements: 11.1_
  
  - [x] 12.2 메트릭 수집 및 알람 설정
    - CloudWatch 커스텀 메트릭
    - 에러율, 응답시간, 엔진 성능 메트릭
    - _Requirements: 11.2, 11.3, 11.4_
  
  - [ ]* 12.3 관측가능성 속성 테스트
    - **Property 9: 로그 PII 마스킹 불변식**
    - **Validates: Requirements 11.1, 11.5**

- [ ] 13. 에러 처리 및 응답 표준화
  - [x] 13.1 글로벌 에러 핸들러 구현
    - 표준화된 에러 응답 형식
    - whyNotShown 필드 처리 로직
    - _Requirements: 2.4, 2.5, 4.4, 4.5_
  
  - [x] 13.2 엔진 공통 응답 계약 구현
    - EngineResponse 타입 및 검증
    - 데이터 부족 시 적절한 응답
    - _Requirements: 2.4, 2.5, 4.4, 4.5_
  
  - [ ]* 13.3 엔진 응답 계약 속성 테스트
    - **Property 10: 엔진 공통 응답 계약**
    - **Validates: Requirements 2.4, 2.5, 4.4, 4.5**

- [ ] 14. 보안 및 데이터 보호 구현
  - [x] 14.1 데이터 암호화 설정
    - RDS 저장 시 암호화 활성화
    - S3 파일 암호화 설정
    - _Requirements: 10.2_
  
  - [x] 14.2 의료 진단 면책 처리 (응답 계약 보호)
    - HTTP 헤더 X-Disclaimer로 면책 메시지 제공
    - 또는 dashboard API에서만 별도 disclaimer 필드 제공
    - 엔진 응답 스키마(EngineResponse)는 변경하지 않음
    - _Requirements: 10.4_
  
  - [ ]* 14.3 보안 속성 테스트
    - **Property 11: 인증·권한 안전성 (No Cross-User Access)**
    - **Validates: Requirements 10.1, 10.5**

- [ ] 15. 시간 처리 및 KST 변환 구현
  - [x] 15.1 TimeService 클래스 구현
    - UTC epoch 기반 내부 계산
    - KST ISO 8601 (+09:00) 출력 변환
    - _Requirements: 전체 시스템 시간 정책_
  
  - [x] 15.2 모든 엔진에 KST 시간 적용
    - formatToKST 메서드 통합 적용
    - 배치 작업 시간 계산 최적화
    - _Requirements: 12.1, 12.2_

- [ ] 16. API Gateway 및 CDK 인프라 완성
  - [x] 16.1 API Gateway 리소스 구성
    - 리소스별 Lambda 연결 (/api/v1/users, /schedules, /dashboard 등)
    - EC2 FastAPI 서비스 연결 (/api/v1/engines, /api/v1/chat 등)
    - Cognito Authorizer 설정
    - _Requirements: 10.1_
  
  - [ ] 16.2 CloudFront 및 S3 웹사이트 호스팅 설정
    - S3 정적 웹사이트 호스팅 구성
    - CloudFront 배포 설정 (한국 사용자 지연시간 최적화)
    - 개발/프로덕션 환경별 CORS 정책
    - _Requirements: 10.3_
  
  - [ ] 16.3 CloudWatch 알람 및 대시보드
    - 에러율, 응답시간 알람 설정
    - ElastiCache 및 EC2 모니터링
    - 운영 대시보드 구성
    - _Requirements: 11.3, 11.4_

- [ ] 17. 최종 체크포인트 - 전체 시스템 검증
  - 모든 API 엔드포인트 통합 테스트
  - 배치 작업 정상 실행 확인
  - 모니터링 및 알람 동작 검증
  - 사용자에게 질문이 있으면 문의

## 참고사항

- 작업에 `*` 표시가 있는 항목은 선택적 구현 가능 (MVP 우선)
- 각 작업은 이전 작업의 결과를 기반으로 구성됨
- 체크포인트에서 전체 시스템 동작을 검증하고 다음 단계로 진행
- 모든 속성 기반 테스트는 최소 100회 반복 실행으로 구성
- **변수명 규칙**: camelCase 사용 (snake_case 금지)
- **배포 리전**: us-east-1 (버지니아 북부)
- **아키텍처**: Lambda (CRUD) + EC2 FastAPI (엔진/AI) + ElastiCache (캐시)
- TypeScript와 PostgreSQL을 기반으로 한 타입 안전성 보장