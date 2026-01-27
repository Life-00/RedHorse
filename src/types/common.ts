/**
 * 공통 타입 정의
 * camelCase 네이밍 규칙 적용
 */

/**
 * API 응답 기본 형식
 */
export interface APIResponse<T = any> {
  data?: T;
  created?: boolean;
  correlationId: string;
}

/**
 * 에러 응답 형식
 */
export interface APIErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  correlationId: string;
}

/**
 * 페이지네이션 커서
 */
export interface PaginationCursor {
  cursorDate: string;     // YYYY-MM-DD
  cursorId: string;       // UUID
}

/**
 * 페이지네이션 응답
 */
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: PaginationCursor;
  hasMore: boolean;
  correlationId: string;
}

/**
 * 엔진 공통 응답 스키마
 */
export interface EngineResponse<T = any> {
  result?: T;              // 있으면 성공, 없으면 실패
  whyNotShown?: string;    // result가 없을 때만 존재
  dataMissing?: string[];  // 부족한 데이터 목록
  generatedAt: string;     // 항상 포함 (ISO 8601, KST)
}

/**
 * 사용자 프로필
 */
export interface UserProfile {
  userId: string;
  cognitoSub: string;
  shiftType: 'TWO_SHIFT' | 'THREE_SHIFT' | 'FIXED_NIGHT' | 'IRREGULAR';
  commuteMin: number;
  wearableConnected: boolean;
  orgId?: string;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 근무표
 */
export interface ShiftSchedule {
  scheduleId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  shiftType: 'DAY' | 'MID' | 'NIGHT' | 'OFF';
  startAt?: string; // ISO 8601, OFF일 때 null
  endAt?: string;   // ISO 8601, OFF일 때 null
  commuteMin: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 엔진 캐시 항목
 */
export interface EngineCacheItem {
  cacheId: string;
  userId: string;
  engineType: 'SHIFT_TO_SLEEP' | 'CAFFEINE_CUTOFF' | 'FATIGUE_RISK';
  targetDate: string; // YYYY-MM-DD
  result: any;
  generatedAt: string;
  expiresAt: string;
}

/**
 * 파일 메타데이터
 */
export interface FileMetadata {
  fileId: string;
  uploadedBy: string;
  fileType: 'SHIFT_SCHEDULE' | 'WEARABLE_DATA' | 'ATTACHMENT';
  contentType: string;
  fileSize: number;
  s3Key: string;
  status: 'UPLOADING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

/**
 * 점프스타트 체크리스트
 */
export interface JumpstartChecklist {
  checklistId: string;
  userId: string;
  itemKey: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

/**
 * 수면창 정보
 */
export interface SleepWindow {
  startAt: string; // ISO 8601, KST
  endAt: string;   // ISO 8601, KST
}

/**
 * Shift-to-Sleep 엔진 결과
 */
export interface ShiftToSleepResult {
  sleepMain: SleepWindow;
  sleepNap?: SleepWindow; // 파워냅 (선택적)
}

/**
 * Caffeine Cutoff 엔진 결과
 */
export interface CaffeineCutoffResult {
  caffeineDeadline: string; // ISO 8601, KST
  halfLifeInfo: {
    halfLifeHours: number;
    timeline: Array<{
      hours: number;
      remainingCaffeine: number;
      percentage: number;
    }>;
    safeThreshold: number;
  };
}

/**
 * Fatigue Risk Score 엔진 결과
 */
export interface FatigueRiskResult {
  fatigueScore: number; // 0-100
  fatigueLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  breakdown: {
    sleepDeficit: number;
    consecutiveNights: number;
    commute: number;
    additional: number;
  };
  recommendations: string[];
}

/**
 * 대시보드 응답
 */
export interface DashboardResponse {
  sleepRecommendation: EngineResponse<ShiftToSleepResult>;
  caffeineAdvice: EngineResponse<CaffeineCutoffResult>;
  fatigueAssessment: EngineResponse<FatigueRiskResult>;
  jumpstartProgress: {
    completedItems: number;
    totalItems: number;
    nextAction?: string;
  };
  todaySchedule?: ShiftSchedule;
  disclaimer?: string; // ADR-008: 의료 진단 면책
}

/**
 * 배치 작업 요청
 */
export interface BatchJobRequest {
  jobType: 'DAILY_CACHE_REFRESH' | 'WEEKLY_STATS_AGGREGATION' | 'DATA_CLEANUP';
  targetDate?: string;
  batchSize?: number;
  source?: string;
}

/**
 * 검증 에러
 */
export interface ValidationError {
  field: string;
  rule: string;
  message: string;
}

/**
 * 검증 결과
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * 데이터 부족 enum
 */
export enum DataMissing {
  SHIFT_SCHEDULE_TODAY = 'SHIFT_SCHEDULE_TODAY',
  SHIFT_SCHEDULE_RANGE = 'SHIFT_SCHEDULE_RANGE',
  COMMUTE_MIN = 'COMMUTE_MIN',
  SHIFT_TYPE = 'SHIFT_TYPE',
  SLEEP_HISTORY = 'SLEEP_HISTORY',
  CAFFEINE_LOG_TODAY = 'CAFFEINE_LOG_TODAY',
  WEARABLE_DATA = 'WEARABLE_DATA'
}

/**
 * HTTP 상태 코드
 */
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500
}

/**
 * 에러 코드
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * 환경 변수 타입
 */
export interface EnvironmentVariables {
  STAGE: string;
  REGION: string;
  RDS_PROXY_ENDPOINT: string;
  DB_NAME: string;
  DB_CREDENTIALS_SECRET_ARN: string;
  ELASTICACHE_ENDPOINT: string;
  FILES_BUCKET_NAME: string;
  USER_POOL_ID: string;
  USER_POOL_CLIENT_ID: string;
  EC2_ENGINE_URL?: string;
}