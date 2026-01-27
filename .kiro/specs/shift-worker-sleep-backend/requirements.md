# 교대근무자 수면/피로 관리 앱 백엔드 요구사항 정의서

## 소개

교대근무자(2교대/3교대/고정야간/불규칙)를 위한 수면 최적화 및 피로 관리 앱의 AWS 기반 백엔드 시스템입니다. 핵심 알고리즘을 통해 개인화된 수면 권장사항과 피로도 평가를 제공하며, 웨어러블 기기 연동과 B2B 통계 기능을 지원합니다.

**플랫폼 가정**: 본 시스템은 모바일/데스크톱 웹을 대상으로 하며, 웨어러블(Apple Health/Google Fit) 원격 수집은 웹 단독으로 보장하지 않습니다. MVP에서는 연동 설정 상태 저장만 제공하고, V2에서는 사용자 업로드 또는 네이티브 앱/브릿지 연동 방식으로 확장합니다.

## MVP/V2 기능 범위

### MVP 범위 (필수 기능)
- 사용자 온보딩 및 프로필 관리
- 근무표 CRUD 및 검증
- 3대 핵심 엔진 (Shift-to-Sleep, Caffeine Cutoff, Fatigue Risk Score)
- 홈 대시보드 데이터 제공
- 점프스타트 체크리스트 상태 관리
- 웨어러블 연동 설정 저장 (실제 데이터 수집 제외)
- 파일 업로드/다운로드 (S3 presigned URL)
- 기본 인증/권한 관리
- 기본 로깅 및 모니터링
- 매일 수면 권장사항 사전 계산 캐시 (실패 시 실시간 계산)

### V2 범위 (확장 기능)
- 웨어러블 데이터 파일 업로드 및 분석
- 명상/식사/백색소음 오디오 스트리밍 (S3/CloudFront + 저작권)
- 웹 푸시 알림 (지원 브라우저 한정)
- B2B 통계 대시보드 및 고급 분석
- 고급 배치 작업 (주간 통계, 재시도 로직, 리소스 관리)
- Step Functions를 활용한 복잡한 워크플로우 (웨어러블 분석, 복잡 배치)
- 고급 관측가능성 및 알람
- 파일 업로드 후 파싱 결과 미리보기
- Lambda Layer/Provisioned Concurrency (필요 시)

## 공통 데이터 규격

### 시간/날짜 형식
- 모든 datetime: ISO 8601 형식, Asia/Seoul 타임존 고정
- 예시: "2024-01-15T22:00:00+09:00"

### 엔진 공통 응답 스키마
모든 엔진(Shift-to-Sleep, Caffeine Cutoff, Fatigue Risk Score) 응답은 다음 형식을 따름:

**성공 시 응답 예시:**
```json
{
  "result": {
    "sleepMain": {
      "startAt": "2024-01-26T08:00:00+09:00",
      "endAt": "2024-01-26T15:00:00+09:00"
    }
  },
  "generatedAt": "2024-01-26T09:00:00+09:00"
}
```

**미표시 시 응답 예시:**
```json
{
  "whyNotShown": "INSUFFICIENT_DATA",
  "dataMissing": ["SHIFT_SCHEDULE_TODAY"],
  "generatedAt": "2024-01-26T09:00:00+09:00"
}
```

**응답 규칙:**
- `result`가 있으면 성공, 없으면 `whyNotShown` 필수
- `whyNotShown`은 result가 없을 때만 존재

### DataMissing Enum 정의
- `SHIFT_SCHEDULE_TODAY`: 오늘 근무 일정 없음
- `SHIFT_SCHEDULE_RANGE`: 필요한 기간의 근무 일정 부족
- `COMMUTE_MIN`: 통근 시간 정보 없음
- `SHIFT_TYPE`: 교대 유형 정보 없음
- `SLEEP_HISTORY`: 수면 기록 부족 (V2)
- `CAFFEINE_LOG_TODAY`: 오늘 카페인 로그 없음 (선택)
- `WEARABLE_DATA`: 웨어러블 데이터 없음 (V2)

### DynamoDB 트랜잭션 사용 기준
- 서로 다른 아이템을 동시에 원자적으로 저장해야 하는 경우 DynamoDB Transactions 사용
- 예: 온보딩 시 사용자 프로필 + 초기 설정 동시 생성

### 근무표 스키마
```json
{
  "shiftType": "DAY | MID | NIGHT | OFF",
  "startAt": "ISO 8601 datetime (OFF일 때 null)",
  "endAt": "ISO 8601 datetime (OFF일 때 null)", 
  "commuteMin": "number (0-240 범위)",
  "note": "string (optional, max 200자, 예외 케이스 처리용)"
}
```

### 야간 근무 처리 규칙
- 22:00-07:00처럼 날짜가 넘어가는 경우: endAt이 다음날 날짜로 설정
- startAt < endAt 검증 시 날짜 차이 고려

### 근무표 검증 규칙
- startAt < endAt (날짜 넘어가는 야간 근무 허용)
- **MVP**: 하루 최대 1개 근무 입력 허용 (예외 케이스는 OFF+메모로 처리, V2에서 확장 가능)
- 근무 시간 겹침(Overlap) 금지
- 최소 근무시간: 4시간, 최대 근무시간: 16시간
- 통근시간: 0-240분 범위

### 근무표 조회 규칙
- 날짜 범위 조회: `GET /schedule?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=30&nextToken=...`
- 페이지네이션: limit(기본 30, 최대 100), nextToken 지원
- DynamoDB SK 형식: `date#YYYY-MM-DD` (범위 검색 지원)

## 인증/권한 모델

### 인증 방식
- AWS Cognito JWT 토큰 기반 인증
- 프론트엔드에서 Authorization 헤더로 JWT 전송
- 웹 세션 기반 쿠키 인증은 사용하지 않음

### 권한 레벨
- **user**: 본인 데이터만 접근 가능
- **b2b_admin**: 소속 조직의 익명 집계 데이터만 접근 가능
- **system_admin**: 시스템 관리 기능 접근 가능

### 테넌시 모델
- 사용자 프로필에 orgId 필드로 조직 구분
- B2B 요청 시 JWT의 orgId와 요청 데이터의 orgId 일치 검증

## B2B 익명화 규칙

### 최소 그룹 크기
- 3명 미만 그룹의 통계 데이터 제공 금지
- 필터 조합으로 소수 그룹이 되는 경우도 차단

### 집계 단위 및 범위
- 집계 단위: 일/주/월 단위 선택 가능
- 집계 범위: 팀/조/근무조별 필터링 지원
- 시간대 버킷: 4시간 단위 구간별 집계

### 익명화 방법
- Raw 개인 데이터 직접 접근 금지
- 오직 사전 집계된 Aggregate 테이블만 제공
- 개인 식별 정보 완전 제거
- **집계 단계**: 최소 그룹 크기(>=3) 보장하여 테이블 생성
- **조회 단계**: 최종 방어로 한번 더 검증 (Defense in Depth)

## 파일 업로드 규격

### 허용 파일 형식
- 근무표: .csv, .xlsx (최대 5MB)
- 웨어러블 데이터: .csv, .json (최대 2MB) - V2
- 기타 첨부: .pdf, .txt (최대 10MB)

### 파일 처리 흐름
1. **MVP**: 업로드 완료 후 콜백 API로 메타데이터 저장
2. **V2**: S3 이벤트 트리거 → Lambda 파싱 → 근무표/웨어러블 데이터 자동 변환

### 파일 타입 정의
- `SHIFT_SCHEDULE`: 근무표 가져오기
- `WEARABLE_DATA`: 웨어러블 데이터 업로드 (V2)
- `ATTACHMENT`: 기타 첨부파일

### 추가 기능
- CSV 템플릿 다운로드 엔드포인트 제공
- **V2**: 업로드 후 파싱 결과 미리보기 기능

### 보안 조건
- **업로드**: Presigned URL 만료시간 5분
  - 발급 시 contentType, maxSize 검증 및 메타데이터 기록
- **다운로드**: Presigned URL 방식, 만료시간 5분
- 파일 소유자(userId) 또는 orgId 권한 검사 후 URL 발급
- 업로드 버킷: Private, SSE-S3 암호화 적용
- 파일 메타데이터 필수 필드: `uploadedBy=userId`, `fileType`, `contentType`

## 관측가능성 규격

### 로깅 규칙
- 모든 API 요청에 correlationId 생성 및 전파 (헤더명: `X-Correlation-Id`)
- 로그에 PII 마스킹 처리:
  - email: `a***@domain.com` 형식
  - name: 저장/로그 금지 (userId만 사용)
- 구조화된 JSON 로그 형식 사용

### 로그 보존 기간
- **MVP**: CloudWatch Logs 30일 보존
- **V2**: CloudWatch Logs 90일 보존

### 알람 기준
- 5xx 에러율 > 1% (5분 연속)
- P95 응답시간 > 1초 (5분 연속)  
- 배치 작업 연속 3회 실패
- DynamoDB 스로틀링 발생

### 메트릭 수집
- API 호출 수, 응답시간, 성공률
- 엔진별 계산 시간 및 성공률
- 사용자별 활성도 지표

## API 표준 응답 포맷

### 성공 응답 포맷
모든 API 성공 응답은 다음 형식을 따름:
```json
{
  "data": "응답 데이터 객체",
  "correlationId": "X-Correlation-Id 헤더값"
}
```

생성 작업 성공 시:
```json
{
  "data": "생성된 객체",
  "created": true,
  "correlationId": "X-Correlation-Id 헤더값"
}
```

### 에러 응답 포맷
모든 API 에러 응답은 다음 형식을 따름:
```json
{
  "error": {
    "code": "VALIDATION_ERROR | AUTHENTICATION_ERROR | AUTHORIZATION_ERROR | INTERNAL_ERROR",
    "message": "사용자 친화적 에러 메시지",
    "details": {
      "field": "오류 발생 필드명 (선택)",
      "rule": "위반된 규칙 (선택)"
    }
  },
  "correlationId": "X-Correlation-Id 헤더값"
}
```

## 용어 정의 (Glossary)

- **System**: 교대근무자 수면/피로 관리 백엔드 시스템
- **User**: 교대근무자 앱 사용자
- **Shift_Worker**: 2교대/3교대/고정야간/불규칙 근무를 하는 사용자
- **Sleep_Engine**: 최적 수면창 계산 알고리즘 엔진
- **Caffeine_Engine**: 카페인 마감시간 계산 알고리즘 엔진
- **Fatigue_Engine**: 피로도 위험 점수 계산 알고리즘 엔진
- **Shift_Schedule**: 사용자의 근무 일정 정보
- **Sleep_Window**: 메인 수면과 파워냅을 포함한 권장 수면 시간대
- **Wearable_Device**: Apple Health, Google Fit 등 웨어러블 기기
- **B2B_Client**: 기업 고객 (통계 데이터 제공 대상)
- **MVP**: 최소 기능 제품 (필수 기능)
- **V2**: 확장 버전 (추가 기능)

## 요구사항

### Requirement 1: 사용자 온보딩 관리 [MVP]

**User Story:** 교대근무자로서, 나의 근무 유형과 개인 정보를 설정하고 싶습니다. 그래야 개인화된 수면 권장사항을 받을 수 있습니다.

#### Acceptance Criteria

1. WHEN 새로운 사용자가 온보딩을 시작하면, THE System SHALL 교대 유형(2교대/3교대/고정야간/불규칙) 선택 옵션을 제공한다
2. WHEN 사용자가 교대 유형을 선택하면, THE System SHALL 통근 시간 정보를 입력받는다
3. WHEN 사용자가 웨어러블 연동을 선택하면, THE System SHALL 연동 설정 정보를 저장한다
4. WHEN 온보딩이 완료되면, THE System SHALL 사용자 프로필을 생성하고 고유 ID를 할당한다
5. WHEN 온보딩 중 오류가 발생하면, THE System SHALL 적절한 오류 메시지를 반환하고 이전 단계로 복구한다

### Requirement 2: 홈 대시보드 데이터 제공 [MVP]

**User Story:** 교대근무자로서, 오늘의 수면 권장사항과 피로도 정보를 한눈에 보고 싶습니다. 그래야 하루 일정을 효과적으로 계획할 수 있습니다.

#### Acceptance Criteria

1. WHEN 사용자가 홈 화면을 요청하면, THE System SHALL 오늘의 수면 권장사항을 계산하여 제공한다
2. WHEN 사용자가 홈 화면을 요청하면, THE System SHALL 현재 피로도 점수를 계산하여 제공한다
3. WHEN 사용자가 홈 화면을 요청하면, THE System SHALL 카페인 마감시간을 계산하여 제공한다
4. WHEN 권장사항을 제공할 수 없는 경우, THE System SHALL whyNotShown 필드에 이유와 부족한 데이터 목록을 명시한다
5. WHEN 홈 데이터 조회 중 오류가 발생하면, THE System SHALL 권장사항을 제공하지 않고 whyNotShown에 오류 상태를 반환한다

### Requirement 3: 근무표 관리 [MVP]

**User Story:** 교대근무자로서, 나의 근무 일정을 입력하고 관리하고 싶습니다. 그래야 정확한 수면 권장사항을 받을 수 있습니다.

#### Acceptance Criteria

1. WHEN 사용자가 근무표를 입력하면, THE System SHALL 근무 시간과 날짜 정보를 검증하고 저장한다
   - startAt < endAt 검증 (날짜 넘어가는 야간 근무 허용)
   - 하루 최대 1개 근무 입력 허용
   - 근무 시간 겹침(Overlap) 금지
   - 최소 4시간, 최대 16시간 근무시간 검증
   - 통근시간 0-240분 범위 검증
2. WHEN 사용자가 근무표를 가져오기 요청하면, THE System SHALL 기존 저장된 근무표 데이터를 반환한다
3. WHEN 사용자가 근무표를 수정하면, THE System SHALL 변경사항을 검증하고 업데이트한다
4. WHEN 잘못된 근무표 데이터가 입력되면, THE System SHALL 구체적인 검증 오류 메시지와 위반 규칙을 반환한다
5. WHEN 근무표 데이터가 없는 경우, THE System SHALL 빈 근무표 템플릿을 제공한다

### Requirement 4: 핵심 수면/피로 알고리즘 엔진 [MVP]

**User Story:** 교대근무자로서, 과학적 근거에 기반한 개인화된 수면 권장사항을 받고 싶습니다. 그래야 최적의 수면 패턴을 유지할 수 있습니다.

#### Acceptance Criteria

1. WHEN Shift-to-Sleep 엔진이 호출되면, THE System SHALL 사용자의 근무 일정을 기반으로 최적 수면창(메인+파워냅)을 계산한다
2. WHEN Caffeine Cutoff 엔진이 호출되면, THE System SHALL 수면 시각에서 역산한 카페인 마감시간과 반감기 정보를 계산한다
3. WHEN Fatigue Risk Score 엔진이 호출되면, THE System SHALL 평균 수면시간, 연속 야간근무, 통근시간을 기반으로 위험도 점수를 계산한다
4. WHEN 엔진 계산에 필요한 데이터가 부족하면, THE System SHALL whyNotShown 필드에 부족한 데이터 목록과 이유를 명시한다
5. WHEN 엔진 계산 중 오류가 발생하면, THE System SHALL 오류 로그를 기록하고 권장사항을 제공하지 않으며 whyNotShown에 오류 상태를 명시한다

### Requirement 5: 점프스타트 체크리스트 [MVP]

**User Story:** 교대근무자로서, 수면 개선을 위한 실행 가능한 체크리스트를 받고 싶습니다. 그래야 단계적으로 수면 습관을 개선할 수 있습니다.

#### Acceptance Criteria

1. WHEN 사용자가 점프스타트를 요청하면, THE System SHALL 개인화된 체크리스트 항목들을 생성한다
2. WHEN 사용자가 체크리스트 항목을 완료하면, THE System SHALL 완료 상태를 업데이트한다
3. WHEN 사용자가 체크리스트 진행상황을 조회하면, THE System SHALL 완료율과 다음 권장 액션을 제공한다
4. WHEN 체크리스트가 모두 완료되면, THE System SHALL 다음 단계 체크리스트를 생성한다
5. WHEN 체크리스트 데이터가 손상된 경우, THE System SHALL 기본 체크리스트로 복구한다

### Requirement 6: 웨어러블 기기 연동 [MVP/V2]

**User Story:** 교대근무자로서, 웨어러블 기기의 수면 데이터를 연동하고 싶습니다. 그래야 더 정확한 수면 분석을 받을 수 있습니다.

#### Acceptance Criteria

1. WHEN 사용자가 웨어러블 연동을 활성화하면, THE System SHALL 연동 설정을 저장한다 (MVP)
2. WHEN 사용자가 웨어러블 연동을 비활성화하면, THE System SHALL 연동 설정을 해제한다 (MVP)
3. WHEN V2에서 웨어러블 데이터 업로드가 요청되면, THE System SHALL 사용자가 업로드한 파일을 파싱하여 수면 데이터를 수집한다
4. WHEN 웨어러블 데이터 처리 중 오류가 발생하면, THE System SHALL 오류를 로깅하고 기존 데이터로 대체한다
5. WHEN 웨어러블 데이터가 수집되면, THE System SHALL 개인정보 보호 정책에 따라 데이터를 암호화하여 저장한다

### Requirement 7: 가이드 콘텐츠 제공 [MVP/V2]

**User Story:** 교대근무자로서, 명상, 식사, 백색소음 등의 가이드를 받고 싶습니다. 그래야 수면 품질을 개선할 수 있습니다.

#### Acceptance Criteria

1. WHEN 사용자가 명상 가이드를 요청하면, THE System SHALL 교대근무에 특화된 명상 가이드 링크와 타이머 기능을 제공한다 (MVP)
2. WHEN 사용자가 식사 가이드를 요청하면, THE System SHALL 근무 시간대별 식사 권장사항을 제공한다 (MVP)
3. WHEN 사용자가 백색소음 가이드를 요청하면, THE System SHALL 수면 환경 개선을 위한 음향 가이드와 외부 링크를 제공한다 (MVP)
4. WHEN V2에서 오디오 스트리밍이 요청되면, THE System SHALL S3/CloudFront를 통해 저작권 확보된 오디오 콘텐츠를 제공한다
5. WHEN 가이드 콘텐츠가 없는 경우, THE System SHALL 기본 가이드 메시지를 제공한다
6. WHEN 가이드 콘텐츠 로딩 중 오류가 발생하면, THE System SHALL 캐시된 콘텐츠를 제공한다

### Requirement 8: B2B 통계 데이터 제공 [V2]

**User Story:** 기업 고객으로서, 직원들의 익명화된 수면/피로 통계를 받고 싶습니다. 그래야 근무 환경 개선에 활용할 수 있습니다.

#### Acceptance Criteria

1. WHEN B2B 클라이언트가 통계를 요청하면, THE System SHALL 익명화된 집계 데이터를 제공한다
2. WHEN 통계 그룹의 인원이 3명 미만이면, THE System SHALL 개인정보 보호를 위해 데이터 제공을 거부한다
3. WHEN 통계 데이터를 생성할 때, THE System SHALL 개인 식별 정보를 완전히 제거한다
4. WHEN B2B 클라이언트가 권한이 없는 데이터를 요청하면, THE System SHALL 접근을 거부한다
5. WHEN 통계 데이터 생성 중 오류가 발생하면, THE System SHALL 오류 로그를 기록하고 빈 결과를 반환한다

### Requirement 9: 파일 업로드/다운로드 관리 [MVP]

**User Story:** 사용자로서, 근무표나 수면 데이터를 파일로 업로드하거나 다운로드하고 싶습니다. 그래야 데이터를 효율적으로 관리할 수 있습니다.

#### Acceptance Criteria

1. WHEN 사용자가 파일 업로드를 요청하면, THE System SHALL S3 presigned URL을 생성하여 제공한다
2. WHEN 사용자가 파일 다운로드를 요청하면, THE System SHALL 보안이 적용된 다운로드 URL을 제공한다
3. WHEN 파일 업로드가 완료되면, THE System SHALL 파일 메타데이터를 데이터베이스에 저장한다
4. WHEN 허용되지 않은 파일 형식이 업로드되면, THE System SHALL 업로드를 거부한다
5. WHEN 파일 크기가 제한을 초과하면, THE System SHALL 적절한 오류 메시지를 반환한다

### Requirement 10: 보안 및 인증 관리 [MVP]

**User Story:** 사용자로서, 내 개인정보와 건강 데이터가 안전하게 보호되기를 원합니다. 그래야 안심하고 앱을 사용할 수 있습니다.

#### Acceptance Criteria

1. WHEN 사용자가 API를 호출하면, THE System SHALL 유효한 인증 토큰을 검증한다
2. WHEN 민감한 개인정보가 저장될 때, THE System SHALL 데이터를 암호화하여 저장한다
   - **MVP**: DynamoDB SSE(기본 암호화) 사용
   - **V2**: 웨어러블 원시 데이터 및 건강 관련 상세 지표는 application-level encryption 추가 적용
3. WHEN 시스템 컴포넌트 간 통신이 발생하면, THE System SHALL 최소 권한 원칙을 적용한다
4. WHEN 의료 진단과 관련된 요청이 있으면, THE System SHALL "의료 진단이 아님" 원칙을 명시한다
5. WHEN 보안 위반이 감지되면, THE System SHALL 즉시 로그를 기록하고 알림을 발송한다

### Requirement 11: 관측가능성 및 모니터링 [MVP]

**User Story:** 시스템 관리자로서, 백엔드 시스템의 상태와 성능을 모니터링하고 싶습니다. 그래야 문제를 조기에 발견하고 해결할 수 있습니다.

#### Acceptance Criteria

1. WHEN 시스템 이벤트가 발생하면, THE System SHALL CloudWatch에 구조화된 로그를 기록한다
2. WHEN API 호출이 발생하면, THE System SHALL 응답시간과 성공률 메트릭을 수집한다
3. WHEN 시스템 오류가 발생하면, THE System SHALL 알람을 트리거한다
4. WHEN 성능 임계값을 초과하면, THE System SHALL 자동 알림을 발송한다
5. WHEN 로그 데이터가 보존 기간을 초과하면, THE System SHALL 자동으로 아카이브한다

### Requirement 12: 배치 작업 및 스케줄링 [MVP/V2]

**User Story:** 시스템 관리자로서, 정기적인 데이터 처리와 통계 생성이 자동으로 실행되기를 원합니다. 그래야 시스템이 효율적으로 운영될 수 있습니다.

#### Acceptance Criteria

1. WHEN 매일 정해진 시간이 되면, THE System SHALL 사용자별 수면 권장사항을 사전 계산하여 캐시한다 (MVP)
   - 캐시 TTL: 48시간 후 자동 삭제 (오늘/내일 데이터만 유지)
2. WHEN 사전 계산된 캐시가 없거나 실패한 경우, THE System SHALL 실시간 계산으로 대체한다 (MVP)
3. WHEN 주간 통계 생성 시간이 되면, THE System SHALL B2B 통계 데이터를 업데이트한다 (V2)
4. WHEN 배치 작업이 실패하면, THE System SHALL 재시도 로직을 실행한다 (V2)
5. WHEN 배치 작업이 완료되면, THE System SHALL 실행 결과를 로깅한다
6. WHEN 배치 작업 실행 중 리소스 부족이 발생하면, THE System SHALL 작업을 일시 중단하고 알림을 발송한다 (V2)