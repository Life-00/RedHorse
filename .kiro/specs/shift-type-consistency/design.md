# 교대 근무 유형 일관성 개선 - 설계 문서

## 1. 설계 개요

온보딩에서 선택한 `work_type`을 기반으로 허용되는 `shift_type`을 동적으로 필터링하고, 홈 화면의 근무 정보 표시를 정확하게 개선합니다.

### 1.1 핵심 설계 원칙

1. **Single Source of Truth**: `users.work_type`이 모든 근무 관련 로직의 기준
2. **백엔드 검증**: 프론트엔드뿐만 아니라 백엔드에서도 타입 검증
3. **데이터 일관성**: 홈 화면과 근무표 페이지의 데이터 완전 일치

## 2. 아키텍처 설계

### 2.1 컴포넌트 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  HomeDashboard   │         │  SchedulePage    │          │
│  │                  │         │                  │          │
│  │  - 오늘 근무 표시│         │  - 월간 달력     │          │
│  │  - 시간 포맷팅   │         │  - 주간 상세     │          │
│  └────────┬─────────┘         └────────┬─────────┘          │
│           │                            │                     │
│           │                            │                     │
│  ┌────────▼────────────────────────────▼─────────┐          │
│  │      ScheduleRegisterModal                    │          │
│  │                                                │          │
│  │  - work_type 기반 shift_type 필터링           │          │
│  │  - 동적 버튼 렌더링                            │          │
│  └────────────────────────────────────────────────┘          │
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            │ API 호출
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                Backend (AWS Lambda + RDS)                     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  schedule_management/handler.py                      │   │
│  │                                                       │   │
│  │  - validate_shift_type(work_type, shift_type)       │   │
│  │  - get_allowed_shift_types(work_type)               │   │
│  │  - create_schedule() with validation                │   │
│  │  - update_schedule() with validation                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PostgreSQL (RDS)                                    │   │
│  │                                                       │   │
│  │  users: work_type                                    │   │
│  │  schedules: shift_type, start_time, end_time         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름

```
1. 사용자 온보딩
   └─> work_type 선택 (2shift/3shift/fixed_night/irregular)
       └─> users 테이블에 저장

2. 근무표 등록
   └─> ScheduleRegisterModal 열기
       └─> work_type 조회
           └─> 허용된 shift_type만 버튼 표시
               └─> 사용자 선택
                   └─> 백엔드 검증
                       └─> schedules 테이블에 저장

3. 홈 화면 표시
   └─> 오늘 날짜 계산
       └─> schedules 테이블에서 오늘 데이터 조회
           └─> 시간 포맷팅 (HH:MM)
               └─> 화면에 표시
```

## 3. 상세 설계

### 3.1 백엔드: 교대 타입 검증 로직

**파일**: `backend/lambda/schedule_management/handler.py`

```python
# 근무 유형별 허용 교대 타입 매핑
WORK_TYPE_SHIFT_MAPPING = {
    '2shift': ['day', 'night', 'off'],
    '3shift': ['day', 'evening', 'night', 'off'],
    'fixed_night': ['night', 'off'],
    'irregular': ['day', 'evening', 'night', 'off']
}

def get_allowed_shift_types(work_type: str) -> List[str]:
    """근무 유형에 따라 허용되는 교대 타입 반환"""
    return WORK_TYPE_SHIFT_MAPPING.get(work_type, ['day', 'evening', 'night', 'off'])

def validate_shift_type(work_type: str, shift_type: str) -> bool:
    """교대 타입이 근무 유형에 맞는지 검증"""
    allowed_types = get_allowed_shift_types(work_type)
    return shift_type in allowed_types
```

**스케줄 생성/수정 시 검증 추가:**

```python
def create_schedule(self, user_id: str, schedule_data: Dict[str, Any]) -> Dict[str, Any]:
    # 1. 사용자의 work_type 조회
    user_query = "SELECT work_type FROM users WHERE user_id = %s"
    user_result = self.db.execute_query(user_query, (user_id,))
    
    if not user_result:
        raise ValueError("사용자를 찾을 수 없습니다")
    
    work_type = user_result[0]['work_type']
    shift_type = schedule_data['shift_type']
    
    # 2. shift_type 검증
    if not validate_shift_type(work_type, shift_type):
        allowed = get_allowed_shift_types(work_type)
        raise ValueError(
            f"{work_type} 근무 유형에서는 {shift_type} 교대를 사용할 수 없습니다. "
            f"허용된 교대: {', '.join(allowed)}"
        )
    
    # 3. 스케줄 생성 (기존 로직)
    ...
```

### 3.2 프론트엔드: 동적 교대 타입 필터링

**파일**: `src/components/schedule/ScheduleRegisterModal.tsx`

**현재 코드 (문제):**
```typescript
const availableShifts = useMemo(() => {
  const allShifts = [
    { id: "day" as const, label: "주간" },
    { id: "evening" as const, label: "중간" },
    { id: "night" as const, label: "야간" },
    { id: "off" as const, label: "휴무" },
  ];

  // 불완전한 필터링
  if (workType === '2shift' || workType === 'day') {
    return allShifts.filter(s => s.id === 'day' || s.id === 'night' || s.id === 'off');
  }
  ...
}, [workType]);
```

**개선된 코드:**
```typescript
const availableShifts = useMemo(() => {
  const allShifts = [
    { id: "day" as const, label: "주간" },
    { id: "evening" as const, label: "초저녁" },
    { id: "night" as const, label: "야간" },
    { id: "off" as const, label: "휴무" },
  ];

  // 근무 유형별 허용 교대 타입 매핑
  const workTypeShiftMapping: Record<string, ShiftType[]> = {
    '2shift': ['day', 'night', 'off'],
    '3shift': ['day', 'evening', 'night', 'off'],
    'fixed_night': ['night', 'off'],
    'irregular': ['day', 'evening', 'night', 'off']
  };

  const allowedShiftTypes = workTypeShiftMapping[workType || 'irregular'] || 
                           ['day', 'evening', 'night', 'off'];

  return allShifts.filter(shift => allowedShiftTypes.includes(shift.id));
}, [workType]);
```

### 3.3 프론트엔드: 근무표 페이지 범례 동적 표시

**파일**: `src/pages/schedule/SchedulePage.tsx`

**현재 코드 (문제):**
```typescript
{/* Legend - 하드코딩됨 */}
<div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-100">
  <div className="flex items-center gap-1.5">
    <div className="w-3 h-3 bg-amber-400 rounded-full" />
    <span className="text-xs text-gray-600">주간</span>
  </div>
  <div className="flex items-center gap-1.5">
    <div className="w-3 h-3 bg-indigo-500 rounded-full" />
    <span className="text-xs text-gray-600">야간</span>
  </div>
  <div className="flex items-center gap-1.5">
    <div className="w-3 h-3 bg-purple-500 rounded-full" />
    <span className="text-xs text-gray-600">초저녁</span>
  </div>
  <div className="flex items-center gap-1.5">
    <div className="w-3 h-3 bg-gray-200 rounded-full" />
    <span className="text-xs text-gray-600">휴무</span>
  </div>
</div>
```

**개선된 코드:**
```typescript
// 근무 유형에 따른 범례 항목 필터링
const legendItems = useMemo(() => {
  const allLegends = [
    { type: 'day', color: 'bg-amber-400', label: '주간' },
    { type: 'evening', color: 'bg-purple-500', label: '초저녁' },
    { type: 'night', color: 'bg-indigo-500', label: '야간' },
    { type: 'off', color: 'bg-gray-200', label: '휴무' }
  ];

  const workTypeShiftMapping: Record<string, string[]> = {
    '2shift': ['day', 'night', 'off'],
    '3shift': ['day', 'evening', 'night', 'off'],
    'fixed_night': ['night', 'off'],
    'irregular': ['day', 'evening', 'night', 'off']
  };

  const allowedTypes = workTypeShiftMapping[workType || 'irregular'] || 
                      ['day', 'evening', 'night', 'off'];

  return allLegends.filter(legend => allowedTypes.includes(legend.type));
}, [workType]);

// 렌더링
<div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-100">
  {legendItems.map(item => (
    <div key={item.type} className="flex items-center gap-1.5">
      <div className={`w-3 h-3 ${item.color} rounded-full`} />
      <span className="text-xs text-gray-600">{item.label}</span>
    </div>
  ))}
</div>
```

### 3.4 프론트엔드: 홈 화면 시간 포맷팅

**파일**: `src/pages/home/HomeDashboard.tsx`

**현재 코드 (문제):**
```typescript
const getScheduleInfo = () => {
  if (!todaySchedule) return { label: "휴무", time: "오늘은 쉬는 날입니다" };
  
  const shiftLabels = {
    day: "주간 근무",
    evening: "초저녁 근무", 
    night: "야간 근무",
    off: "휴무"
  };

  const label = shiftLabels[todaySchedule.shift_type as keyof typeof shiftLabels] || "근무";
  
  // 문제: 시간에 초가 포함됨
  const time = todaySchedule.start_time && todaySchedule.end_time 
    ? `${todaySchedule.start_time} – ${todaySchedule.end_time}`
    : todaySchedule.shift_type === 'off' 
      ? "오늘은 쉬는 날입니다"
      : "시간 미정";

  return { label, time };
};
```

**개선된 코드:**
```typescript
// 시간 포맷팅 유틸리티 함수
const formatTime = (timeString: string | null): string => {
  if (!timeString) return '';
  
  // HH:MM:SS 또는 HH:MM 형식을 HH:MM으로 변환
  const parts = timeString.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  
  return timeString;
};

const getScheduleInfo = () => {
  if (!todaySchedule) return { label: "휴무", time: "오늘은 쉬는 날입니다" };
  
  const shiftLabels = {
    day: "주간 근무",
    evening: "초저녁 근무", 
    night: "야간 근무",
    off: "휴무"
  };

  const label = shiftLabels[todaySchedule.shift_type as keyof typeof shiftLabels] || "근무";
  
  // 개선: 시간 포맷팅 적용
  if (todaySchedule.shift_type === 'off') {
    return { label, time: "오늘은 쉬는 날입니다" };
  }
  
  if (todaySchedule.start_time && todaySchedule.end_time) {
    const startTime = formatTime(todaySchedule.start_time);
    const endTime = formatTime(todaySchedule.end_time);
    return { label, time: `${startTime} ~ ${endTime}` };
  }
  
  return { label, time: "시간 미정" };
};
```

### 3.5 공통 유틸리티 함수

**새 파일**: `src/utils/shiftTypeUtils.ts`

```typescript
export type WorkType = '2shift' | '3shift' | 'fixed_night' | 'irregular';
export type ShiftType = 'day' | 'evening' | 'night' | 'off';

// 근무 유형별 허용 교대 타입 매핑
export const WORK_TYPE_SHIFT_MAPPING: Record<WorkType, ShiftType[]> = {
  '2shift': ['day', 'night', 'off'],
  '3shift': ['day', 'evening', 'night', 'off'],
  'fixed_night': ['night', 'off'],
  'irregular': ['day', 'evening', 'night', 'off']
};

/**
 * 근무 유형에 따라 허용되는 교대 타입 반환
 */
export function getAllowedShiftTypes(workType: WorkType | string): ShiftType[] {
  return WORK_TYPE_SHIFT_MAPPING[workType as WorkType] || 
         WORK_TYPE_SHIFT_MAPPING.irregular;
}

/**
 * 교대 타입이 근무 유형에 맞는지 검증
 */
export function isValidShiftType(workType: WorkType | string, shiftType: ShiftType): boolean {
  const allowedTypes = getAllowedShiftTypes(workType);
  return allowedTypes.includes(shiftType);
}

/**
 * 시간 문자열을 HH:MM 형식으로 포맷팅
 */
export function formatTimeToHHMM(timeString: string | null): string {
  if (!timeString) return '';
  
  // HH:MM:SS 또는 HH:MM 형식을 HH:MM으로 변환
  const parts = timeString.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  
  return timeString;
}
```

## 4. API 설계

### 4.1 스케줄 생성 API

**엔드포인트**: `POST /users/{user_id}/schedules`

**요청:**
```json
{
  "work_date": "2026-01-27",
  "shift_type": "day",
  "start_time": "08:00",
  "end_time": "17:00"
}
```

**응답 (성공):**
```json
{
  "schedule": {
    "id": 123,
    "user_id": "abc-123",
    "work_date": "2026-01-27",
    "shift_type": "day",
    "start_time": "08:00",
    "end_time": "17:00",
    "created_at": "2026-01-27T10:00:00Z",
    "updated_at": "2026-01-27T10:00:00Z"
  }
}
```

**응답 (검증 실패):**
```json
{
  "error": "2shift 근무 유형에서는 evening 교대를 사용할 수 없습니다. 허용된 교대: day, night, off"
}
```

### 4.2 허용 교대 타입 조회 API (신규)

**엔드포인트**: `GET /users/{user_id}/allowed-shift-types`

**응답:**
```json
{
  "work_type": "2shift",
  "allowed_shift_types": ["day", "night", "off"]
}
```

## 5. 데이터베이스 설계

### 5.1 기존 스키마 (변경 없음)

```sql
-- users 테이블
CREATE TABLE users (
    user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    work_type VARCHAR(50) DEFAULT 'irregular',
    commute_time INTEGER DEFAULT 30,
    wearable_device VARCHAR(50) DEFAULT 'none',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- schedules 테이블
CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    shift_type VARCHAR(20) NOT NULL,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, work_date)
);
```

### 5.2 데이터 마이그레이션 (선택사항)

기존 데이터 중 work_type과 맞지 않는 shift_type을 정리:

```sql
-- 2교대 사용자의 evening 교대를 off로 변경
UPDATE schedules s
SET shift_type = 'off', 
    start_time = NULL, 
    end_time = NULL,
    updated_at = CURRENT_TIMESTAMP
FROM users u
WHERE s.user_id = u.user_id
  AND u.work_type = '2shift'
  AND s.shift_type = 'evening';

-- 고정 야간 사용자의 day/evening 교대를 off로 변경
UPDATE schedules s
SET shift_type = 'off',
    start_time = NULL,
    end_time = NULL,
    updated_at = CURRENT_TIMESTAMP
FROM users u
WHERE s.user_id = u.user_id
  AND u.work_type = 'fixed_night'
  AND s.shift_type IN ('day', 'evening');
```

## 6. 테스트 전략

### 6.1 단위 테스트

**백엔드:**
- `validate_shift_type()` 함수 테스트
- `get_allowed_shift_types()` 함수 테스트
- 각 work_type별 스케줄 생성 검증 테스트

**프론트엔드:**
- `getAllowedShiftTypes()` 함수 테스트
- `formatTimeToHHMM()` 함수 테스트
- `isValidShiftType()` 함수 테스트

### 6.2 통합 테스트

1. **2교대 사용자 시나리오:**
   - 온보딩에서 2교대 선택
   - 근무표 등록 모달에서 주간/야간/휴무만 표시 확인
   - evening 타입 스케줄 생성 시 에러 확인
   - 홈 화면에서 오늘 근무 정보 정확성 확인

2. **3교대 사용자 시나리오:**
   - 온보딩에서 3교대 선택
   - 근무표 등록 모달에서 4가지 타입 모두 표시 확인
   - 모든 타입 스케줄 생성 성공 확인

3. **홈 화면 시간 포맷팅:**
   - DB에 "08:00:00" 저장
   - 홈 화면에 "08:00" 표시 확인

### 6.3 E2E 테스트

1. 신규 사용자 온보딩 → 근무표 등록 → 홈 화면 확인 전체 플로우
2. 기존 사용자의 근무표 수정 → 홈 화면 반영 확인

## 7. 배포 계획

### 7.1 배포 순서

1. **Phase 1: 백엔드 배포**
   - `schedule_management/handler.py` 업데이트
   - 검증 로직 추가
   - 허용 교대 타입 조회 API 추가

2. **Phase 2: 프론트엔드 배포**
   - 공통 유틸리티 함수 추가 (`shiftTypeUtils.ts`)
   - `ScheduleRegisterModal` 업데이트
   - `SchedulePage` 범례 동적 표시
   - `HomeDashboard` 시간 포맷팅

3. **Phase 3: 데이터 정리 (선택)**
   - 기존 불일치 데이터 마이그레이션

### 7.2 롤백 계획

- 백엔드: 이전 Lambda 버전으로 롤백
- 프론트엔드: 이전 빌드 버전으로 롤백
- 데이터베이스: 마이그레이션 전 백업에서 복원

## 8. 모니터링 및 알림

### 8.1 로그 모니터링

- CloudWatch Logs에서 검증 실패 로그 모니터링
- 에러 패턴: "근무 유형에서는 ... 교대를 사용할 수 없습니다"

### 8.2 메트릭

- 스케줄 생성 성공률
- 스케줄 생성 검증 실패율
- 홈 화면 로딩 시간

## 9. 향후 개선 사항

1. **근무 유형 변경 기능**
   - 프로필 설정에서 work_type 변경 가능
   - 변경 시 기존 스케줄 처리 방안 (유지/삭제/변환)

2. **커스텀 교대 타입**
   - 사용자 정의 교대 타입 추가 기능
   - 시간대 커스터마이징

3. **스케줄 템플릿**
   - 반복 패턴 저장 및 재사용
   - 예: "2주 주간 → 2주 야간" 패턴
