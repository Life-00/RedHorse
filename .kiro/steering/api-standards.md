---
inclusion: always
---

# API 표준 및 응답 규격

## API 버전 관리

**v1 프리픽스 사용**
- 모든 API 경로에 `/api/v1/` 프리픽스 사용
- 향후 버전 업그레이드 시 `/api/v2/` 형태로 확장

```
/api/v1/users/profile
/api/v1/schedules
/api/v1/engines/shift-to-sleep
/api/v1/dashboard/home
```

## HTTP Status Code 규칙

**표준 HTTP 상태 코드 사용**
- `200 OK`: 성공적인 GET/PUT 요청
- `201 Created`: 성공적인 POST 요청 (리소스 생성)
- `204 No Content`: 성공적인 DELETE 요청
- `400 Bad Request`: 클라이언트 요청 오류
- `401 Unauthorized`: 인증 실패
- `403 Forbidden`: 권한 부족
- `404 Not Found`: 리소스 없음
- `409 Conflict`: 리소스 충돌 (중복 생성 등)
- `429 Too Many Requests`: 요청 제한 초과
- `500 Internal Server Error`: 서버 내부 오류

## 표준 응답 포맷

### 성공 응답

**일반 성공 응답**
```json
{
  "data": {
    "userId": "uuid-here",
    "shiftType": "TWO_SHIFT",
    "commuteMin": 30
  },
  "correlationId": "req-12345-abcde"
}
```

**생성 성공 응답**
```json
{
  "data": {
    "scheduleId": "uuid-here",
    "date": "2024-01-26",
    "shiftType": "DAY"
  },
  "created": true,
  "correlationId": "req-12345-abcde"
}
```

### 에러 응답

**표준 에러 응답**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "근무 시간이 유효하지 않습니다",
    "details": {
      "field": "startAt",
      "rule": "start_before_end"
    }
  },
  "correlationId": "req-12345-abcde"
}
```

**에러 코드 정의**
- `VALIDATION_ERROR`: 입력 데이터 검증 실패
- `AUTHENTICATION_ERROR`: 인증 토큰 오류
- `AUTHORIZATION_ERROR`: 권한 부족
- `RESOURCE_NOT_FOUND`: 요청한 리소스 없음
- `RESOURCE_CONFLICT`: 리소스 충돌
- `RATE_LIMIT_EXCEEDED`: 요청 제한 초과
- `INTERNAL_ERROR`: 서버 내부 오류

## 엔진 공통 응답 규격

**성공 시 응답**
```json
{
  "result": {
    "sleepMain": {
      "startAt": "2024-01-26T22:00:00+09:00",
      "endAt": "2024-01-26T06:00:00+09:00"
    }
  },
  "generatedAt": "2024-01-26T09:00:00+09:00"
}
```

**미표시 시 응답**
```json
{
  "whyNotShown": "INSUFFICIENT_DATA",
  "dataMissing": ["SHIFT_SCHEDULE_TODAY"],
  "generatedAt": "2024-01-26T09:00:00+09:00"
}
```

**응답 규칙**
- `result`가 있으면 성공, 없으면 `whyNotShown` 필수
- `whyNotShown`은 result가 없을 때만 존재
- `generatedAt`은 항상 포함 (ISO 8601, KST)

## 페이지네이션 규격

**커서 기반 페이지네이션**
```json
{
  "data": [
    {
      "scheduleId": "uuid-1",
      "date": "2024-01-26"
    }
  ],
  "nextCursor": {
    "cursorDate": "2024-01-26",
    "cursorId": "uuid-1"
  },
  "hasMore": true,
  "correlationId": "req-12345-abcde"
}
```

**Query Parameters**
- `limit`: 페이지 크기 (기본 30, 최대 100)
- `cursorDate`: 커서 날짜
- `cursorId`: 커서 ID

## 헤더 규격

**필수 헤더**
- `Authorization`: Bearer JWT 토큰
- `Content-Type`: application/json
- `X-Correlation-Id`: 요청 추적 ID (선택적, 없으면 서버에서 생성)

**응답 헤더**
- `X-Correlation-Id`: 요청 추적 ID (항상 포함)
- `X-Disclaimer`: 의료 진단 면책 메시지 (엔진 API에만)

## Rate Limiting

**기본 제한**
- 사용자당 분당 60회 요청
- 엔진 API는 분당 30회 요청
- B2B API는 분당 100회 요청

**제한 초과 시 응답**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "요청 제한을 초과했습니다. 잠시 후 다시 시도해주세요.",
    "details": {
      "retryAfter": 60
    }
  },
  "correlationId": "req-12345-abcde"
}
```