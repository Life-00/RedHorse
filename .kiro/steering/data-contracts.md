---
inclusion: always
---

# 데이터 계약 및 스키마 규격

## 날짜/시간 처리 규칙

**ISO 8601 + KST 고정**
- 모든 datetime은 ISO 8601 형식 사용
- 타임존은 Asia/Seoul (+09:00) 고정
- 내부 계산은 UTC epoch, 외부 출력만 KST 변환

```typescript
// 올바른 시간 처리 예시
class TimeService {
  static formatToKST(date: Date): string {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const hour = parts.find(p => p.type === 'hour')?.value;
    const minute = parts.find(p => p.type === 'minute')?.value;
    const second = parts.find(p => p.type === 'second')?.value;
    
    return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
  }
}

// 사용 예시
{
  "startAt": "2024-01-26T22:00:00+09:00",
  "endAt": "2024-01-27T06:00:00+09:00",
  "generatedAt": "2024-01-26T09:00:00+09:00"
}
```

## null vs 필드 생략 규칙

**엔진 응답 규칙 (확정)**
- 확실한 결과가 있으면 `result` 필드 포함
- 확실하지 않으면 `result` 필드 생략하고 `whyNotShown` 포함
- null 값 사용 금지, 필드 자체를 생략

```typescript
// 올바른 응답 예시
interface EngineResponse<T = any> {
  result?: T;              // 있으면 성공, 없으면 실패
  whyNotShown?: string;    // result가 없을 때만 존재
  dataMissing?: string[];  // 부족한 데이터 목록
  generatedAt: string;     // 항상 포함
}

// 성공 응답
{
  "result": {
    "sleepMain": {
      "startAt": "2024-01-26T22:00:00+09:00",
      "endAt": "2024-01-27T06:00:00+09:00"
    }
  },
  "generatedAt": "2024-01-26T09:00:00+09:00"
}

// 실패 응답
{
  "whyNotShown": "INSUFFICIENT_DATA",
  "dataMissing": ["SHIFT_SCHEDULE_TODAY"],
  "generatedAt": "2024-01-26T09:00:00+09:00"
}
```

## 근무표 스키마

**표준 근무표 데이터 구조**
```typescript
interface ShiftSchedule {
  scheduleId: string;      // UUID
  userId: string;          // 소유자 ID
  date: string;           // YYYY-MM-DD 형식
  shiftType: 'DAY' | 'MID' | 'NIGHT' | 'OFF';
  startAt?: string;       // ISO 8601, OFF일 때 생략
  endAt?: string;         // ISO 8601, OFF일 때 생략
  commuteMin: number;     // 0-240 범위
  note?: string;          // 최대 200자, 선택적
  createdAt: string;      // ISO 8601
  updatedAt: string;      // ISO 8601
}
```

**야간 근무 처리 규칙**
- 22:00-07:00처럼 날짜가 넘어가는 경우 허용
- endAt이 다음날 날짜로 설정됨
- startAt < endAt 검증 시 날짜 차이 고려

```json
{
  "date": "2024-01-26",
  "shiftType": "NIGHT",
  "startAt": "2024-01-26T22:00:00+09:00",
  "endAt": "2024-01-27T06:00:00+09:00",
  "commuteMin": 30
}
```

## 사용자 프로필 스키마

**사용자 기본 정보**
```typescript
interface UserProfile {
  userId: string;                    // UUID
  cognitoSub: string;               // Cognito User Pool subject
  shiftType: 'TWO_SHIFT' | 'THREE_SHIFT' | 'FIXED_NIGHT' | 'IRREGULAR';
  commuteMin: number;               // 0-240 범위
  wearableConnected: boolean;       // 웨어러블 연동 상태
  orgId?: string;                   // B2B 조직 ID (선택적)
  createdAt: string;                // ISO 8601
  updatedAt: string;                // ISO 8601
}
```

## 파일 메타데이터 스키마

**파일 업로드 정보**
```typescript
interface FileMetadata {
  fileId: string;                   // UUID
  uploadedBy: string;               // 업로드한 사용자 ID
  fileType: 'SHIFT_SCHEDULE' | 'WEARABLE_DATA' | 'ATTACHMENT';
  contentType: string;              // MIME type
  fileSize: number;                 // 바이트 단위
  s3Key: string;                    // S3 객체 키
  status: 'UPLOADING' | 'COMPLETED' | 'FAILED';
  createdAt: string;                // ISO 8601
  updatedAt: string;                // ISO 8601
}
```

## 검증 규칙

**근무표 검증**
```typescript
interface ValidationRule {
  field: string;
  rule: string;
  message: string;
}

const SCHEDULE_VALIDATION_RULES = {
  START_BEFORE_END: {
    field: 'startAt',
    rule: 'start_before_end',
    message: '시작 시간이 종료 시간보다 늦을 수 없습니다'
  },
  MIN_WORK_HOURS: {
    field: 'duration',
    rule: 'min_work_hours',
    message: '최소 근무 시간은 4시간입니다'
  },
  MAX_WORK_HOURS: {
    field: 'duration',
    rule: 'max_work_hours',
    message: '최대 근무 시간은 16시간입니다'
  },
  COMMUTE_RANGE: {
    field: 'commuteMin',
    rule: 'commute_range',
    message: '통근 시간은 0-240분 범위여야 합니다'
  }
};
```

## 페이지네이션 스키마

**커서 기반 페이지네이션**
```typescript
interface PaginationCursor {
  cursorDate: string;     // YYYY-MM-DD
  cursorId: string;       // UUID
}

interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: PaginationCursor;
  hasMore: boolean;
  correlationId: string;
}
```

## 타입 안전성 보장

**TypeScript 인터페이스 활용**
```typescript
// 런타임 검증과 타입 안전성 동시 보장
function validateShiftSchedule(data: any): ShiftSchedule {
  // 런타임 검증
  if (!data.date || !data.shiftType) {
    throw new ValidationError('Required fields missing');
  }
  
  // 타입 캐스팅
  return data as ShiftSchedule;
}
```