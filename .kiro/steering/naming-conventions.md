---
inclusion: always
---

# 네이밍 및 코딩 컨벤션

## API JSON 필드 규칙

**camelCase 사용**
- 모든 JSON 필드명은 camelCase로 통일
- 예시: `startAt`, `endAt`, `commuteMin`, `whyNotShown`, `dataMissing`, `generatedAt`

```json
{
  "sleepMain": {
    "startAt": "2024-01-26T22:00:00+09:00",
    "endAt": "2024-01-26T06:00:00+09:00"
  },
  "whyNotShown": "INSUFFICIENT_DATA",
  "dataMissing": ["SHIFT_SCHEDULE_TODAY"],
  "generatedAt": "2024-01-26T09:00:00+09:00"
}
```

## URL 경로 규칙

**kebab-case 사용**
- 모든 URL 경로는 kebab-case로 통일
- 예시: `/sleep-recommendation`, `/jumpstart-checklist`, `/caffeine-cutoff`

```
GET /api/v1/engines/shift-to-sleep
GET /api/v1/engines/caffeine-cutoff
GET /api/v1/engines/fatigue-risk
GET /api/v1/dashboard/jumpstart-checklist
```

## Query Parameter 규칙

**camelCase 사용 (확정)**
- Query parameter는 camelCase로 통일 (snake_case 금지)
- 예시: `nextToken`, `from`, `to`, `limit`, `cursorDate`, `cursorId`

```
GET /api/v1/schedules?from=2024-01-01&to=2024-01-31&limit=30&cursorDate=2024-01-15&cursorId=uuid
```

## Enum 값 규칙

**SCREAMING_SNAKE_CASE 사용**
- 모든 enum 값은 SCREAMING_SNAKE_CASE로 통일
- 예시: `INSUFFICIENT_DATA`, `SHIFT_SCHEDULE_TODAY`, `TWO_SHIFT`, `THREE_SHIFT`

```typescript
enum DataMissing {
  SHIFT_SCHEDULE_TODAY = 'SHIFT_SCHEDULE_TODAY',
  SHIFT_SCHEDULE_RANGE = 'SHIFT_SCHEDULE_RANGE',
  COMMUTE_MIN = 'COMMUTE_MIN',
  SHIFT_TYPE = 'SHIFT_TYPE'
}

enum ShiftType {
  TWO_SHIFT = 'TWO_SHIFT',
  THREE_SHIFT = 'THREE_SHIFT',
  FIXED_NIGHT = 'FIXED_NIGHT',
  IRREGULAR = 'IRREGULAR'
}
```

## 데이터베이스 규칙

**PK/SK prefix#value 패턴**
- DynamoDB 스타일이지만 PostgreSQL에서도 일관성을 위해 사용
- 예시: `pk = user#<userId>`, `sk = date#2026-01-26`

```sql
-- PostgreSQL에서는 실제로는 별도 컬럼으로 관리
CREATE TABLE shift_schedules (
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    -- ...
);
```

## 내부 코드 규칙

**TypeScript/JavaScript 표준**
- 변수/함수: camelCase
- 클래스: PascalCase
- 상수: SCREAMING_SNAKE_CASE

```typescript
class UserService {
  private readonly DEFAULT_SLEEP_HOURS = 8;
  
  async getUserProfile(userId: string): Promise<UserProfile> {
    // ...
  }
}
```

## 문서 용어 규칙

**PascalCase 또는 일반 단어**
- 기술 용어: PascalCase (예: `ShiftWorker`, `SleepEngine`)
- 일반 용어: 띄어쓰기 (예: "Shift worker", "Sleep engine")
- 언더스코어 지양: `Shift_Worker` ❌ → `ShiftWorker` ✅

## 금지 사항

- JSON 필드에서 snake_case 사용 금지
- URL 경로에서 camelCase 사용 금지
- Enum이 아닌 곳에서 SCREAMING_SNAKE_CASE 사용 금지
- 문서에서 불필요한 언더스코어 사용 금지