"""
공통 데이터 모델 정의
Pydantic 모델을 사용한 타입 안전성 보장
"""

from typing import Optional, Dict, Any, List, Union
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class ShiftType(str, Enum):
    """근무 유형"""
    DAY = "DAY"
    MID = "MID" 
    NIGHT = "NIGHT"
    OFF = "OFF"


class UserShiftType(str, Enum):
    """사용자 교대 유형"""
    TWO_SHIFT = "TWO_SHIFT"
    THREE_SHIFT = "THREE_SHIFT"
    FIXED_NIGHT = "FIXED_NIGHT"
    IRREGULAR = "IRREGULAR"


class EngineType(str, Enum):
    """엔진 유형"""
    SHIFT_TO_SLEEP = "shift_to_sleep"
    CAFFEINE_CUTOFF = "caffeine_cutoff"
    FATIGUE_RISK = "fatigue_risk"


class DataMissingReason(str, Enum):
    """데이터 부족 사유"""
    SHIFT_SCHEDULE_TODAY = "SHIFT_SCHEDULE_TODAY"
    SHIFT_SCHEDULE_RANGE = "SHIFT_SCHEDULE_RANGE"
    COMMUTE_MIN = "COMMUTE_MIN"
    SHIFT_TYPE = "SHIFT_TYPE"
    USER_PROFILE = "USER_PROFILE"


# 기본 응답 모델
class BaseResponse(BaseModel):
    """기본 응답 모델"""
    correlationId: str = Field(..., description="요청 추적 ID")


class EngineResponse(BaseResponse):
    """엔진 공통 응답 모델"""
    result: Optional[Dict[str, Any]] = Field(None, description="계산 결과 (성공 시)")
    whyNotShown: Optional[str] = Field(None, description="미표시 사유 (실패 시)")
    dataMissing: Optional[List[str]] = Field(None, description="부족한 데이터 목록")
    generatedAt: str = Field(..., description="생성 시간 (KST ISO 8601)")
    
    class Config:
        schema_extra = {
            "example": {
                "result": {
                    "sleepMain": {
                        "startAt": "2024-01-26T22:00:00+09:00",
                        "endAt": "2024-01-27T06:00:00+09:00"
                    }
                },
                "generatedAt": "2024-01-26T09:00:00+09:00",
                "correlationId": "req-12345-abcde"
            }
        }


class ErrorResponse(BaseResponse):
    """에러 응답 모델"""
    error: Dict[str, Any] = Field(..., description="에러 정보")
    
    class Config:
        schema_extra = {
            "example": {
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "입력 데이터가 유효하지 않습니다",
                    "details": {}
                },
                "correlationId": "req-12345-abcde"
            }
        }


# 사용자 관련 모델
class UserProfile(BaseModel):
    """사용자 프로필"""
    userId: str
    shiftType: UserShiftType
    commuteMin: int = Field(..., ge=0, le=240, description="통근 시간 (분)")
    wearableConnected: bool = Field(default=False, description="웨어러블 연결 상태")
    orgId: Optional[str] = Field(None, description="조직 ID (B2B)")


class ShiftSchedule(BaseModel):
    """근무표"""
    scheduleId: str
    userId: str
    date: str = Field(..., regex=r"^\d{4}-\d{2}-\d{2}$", description="날짜 (YYYY-MM-DD)")
    shiftType: ShiftType
    startAt: Optional[str] = Field(None, description="시작 시간 (ISO 8601)")
    endAt: Optional[str] = Field(None, description="종료 시간 (ISO 8601)")
    commuteMin: int = Field(..., ge=0, le=240, description="통근 시간 (분)")
    note: Optional[str] = Field(None, max_length=200, description="메모")


# 엔진 요청 모델
class EngineRequest(BaseModel):
    """엔진 요청 기본 모델"""
    userId: str = Field(..., description="사용자 ID")
    targetDate: Optional[str] = Field(None, regex=r"^\d{4}-\d{2}-\d{2}$", description="대상 날짜")
    forceRefresh: bool = Field(default=False, description="캐시 무시 강제 계산")


class ShiftToSleepRequest(EngineRequest):
    """Shift-to-Sleep 엔진 요청"""
    sleepDurationHours: Optional[float] = Field(8.0, ge=4.0, le=12.0, description="희망 수면 시간")
    bufferMinutes: Optional[int] = Field(30, ge=0, le=120, description="여유 시간 (분)")


class CaffeineCutoffRequest(EngineRequest):
    """Caffeine Cutoff 엔진 요청"""
    caffeineHalfLife: Optional[float] = Field(5.0, ge=3.0, le=8.0, description="카페인 반감기 (시간)")
    targetSleepTime: Optional[str] = Field(None, description="목표 수면 시간 (HH:MM)")


class FatigueRiskRequest(EngineRequest):
    """Fatigue Risk Score 엔진 요청"""
    includePrediction: bool = Field(default=True, description="예측 점수 포함 여부")
    daysAhead: int = Field(default=3, ge=1, le=7, description="예측 일수")


# 엔진 응답 모델
class SleepWindow(BaseModel):
    """수면창 정보"""
    startAt: str = Field(..., description="수면 시작 시간 (ISO 8601)")
    endAt: str = Field(..., description="수면 종료 시간 (ISO 8601)")
    durationHours: float = Field(..., description="수면 시간 (시간)")
    quality: str = Field(..., description="수면 품질 평가")


class ShiftToSleepResult(BaseModel):
    """Shift-to-Sleep 결과"""
    sleepMain: SleepWindow = Field(..., description="주 수면창")
    sleepNap: Optional[SleepWindow] = Field(None, description="낮잠 수면창")
    recommendations: List[str] = Field(..., description="수면 권장사항")
    conflictWarnings: List[str] = Field(default_factory=list, description="충돌 경고")


class CaffeineInfo(BaseModel):
    """카페인 정보"""
    cutoffTime: str = Field(..., description="카페인 마감 시간 (HH:MM)")
    halfLifeHours: float = Field(..., description="반감기 (시간)")
    recommendedAmount: str = Field(..., description="권장 섭취량")
    alternatives: List[str] = Field(..., description="대안 음료")


class CaffeineCutoffResult(BaseModel):
    """Caffeine Cutoff 결과"""
    today: CaffeineInfo = Field(..., description="오늘 카페인 정보")
    tomorrow: Optional[CaffeineInfo] = Field(None, description="내일 카페인 정보")
    tips: List[str] = Field(..., description="카페인 관리 팁")


class FatigueScore(BaseModel):
    """피로도 점수"""
    score: int = Field(..., ge=0, le=100, description="피로도 점수 (0-100)")
    level: str = Field(..., description="위험 레벨")
    factors: Dict[str, float] = Field(..., description="피로 요인별 점수")


class FatigueRiskResult(BaseModel):
    """Fatigue Risk Score 결과"""
    current: FatigueScore = Field(..., description="현재 피로도")
    prediction: Optional[List[FatigueScore]] = Field(None, description="예측 피로도")
    recommendations: List[str] = Field(..., description="피로 관리 권장사항")
    alerts: List[str] = Field(default_factory=list, description="주의 알림")


# AI 챗봇 모델
class ChatMessage(BaseModel):
    """채팅 메시지"""
    role: str = Field(..., description="역할 (user/assistant)")
    content: str = Field(..., description="메시지 내용")
    timestamp: str = Field(..., description="시간 (ISO 8601)")


class ChatRequest(BaseModel):
    """채팅 요청"""
    message: str = Field(..., min_length=1, max_length=1000, description="사용자 메시지")
    conversationId: Optional[str] = Field(None, description="대화 ID")
    context: Optional[Dict[str, Any]] = Field(None, description="추가 컨텍스트")


class ChatResponse(BaseResponse):
    """채팅 응답"""
    message: str = Field(..., description="AI 응답 메시지")
    conversationId: str = Field(..., description="대화 ID")
    timestamp: str = Field(..., description="응답 시간 (ISO 8601)")
    suggestions: List[str] = Field(default_factory=list, description="추천 질문")
    disclaimer: str = Field(..., description="의료 면책 메시지")
    metadata: Optional[Dict[str, Any]] = Field(None, description="추가 메타데이터")


# 헬스 체크 모델
class ServiceStatus(BaseModel):
    """서비스 상태"""
    healthy: bool = Field(..., description="서비스 정상 여부")
    latency_ms: Optional[float] = Field(None, description="응답 시간 (밀리초)")
    details: Optional[Dict[str, Any]] = Field(None, description="상세 정보")


class HealthStatus(BaseModel):
    """전체 헬스 상태"""
    status: str = Field(..., description="전체 상태 (healthy/degraded/unhealthy)")
    timestamp: str = Field(..., description="확인 시간 (ISO 8601)")
    services: Dict[str, Any] = Field(..., description="서비스별 상태")
    version: str = Field(..., description="서비스 버전")
    error: Optional[str] = Field(None, description="에러 메시지")


# 대시보드 관련 모델
class DashboardHomeResponse(BaseResponse):
    """홈 대시보드 응답"""
    sleepRecommendation: Optional[Dict[str, Any]] = Field(None, description="수면 권장사항")
    caffeineGuidance: Optional[Dict[str, Any]] = Field(None, description="카페인 가이드")
    fatigueAssessment: Optional[Dict[str, Any]] = Field(None, description="피로도 평가")
    todaySchedule: Optional[Dict[str, Any]] = Field(None, description="오늘 근무 일정")
    quickActions: List[Dict[str, str]] = Field(default_factory=list, description="빠른 액션")
    disclaimer: str = Field(..., description="의료 면책 메시지")
    generatedAt: str = Field(..., description="생성 시간 (KST ISO 8601)")


class JumpstartChecklistItem(BaseModel):
    """점프스타트 체크리스트 항목"""
    itemId: str = Field(..., description="항목 ID")
    title: str = Field(..., description="항목 제목")
    description: str = Field(..., description="항목 설명")
    category: str = Field(..., description="카테고리")
    priority: int = Field(..., ge=1, le=5, description="우선순위 (1-5)")
    completed: bool = Field(default=False, description="완료 여부")
    completedAt: Optional[str] = Field(None, description="완료 시간")
    estimatedMinutes: int = Field(..., ge=1, description="예상 소요 시간 (분)")


class JumpstartChecklistResponse(BaseResponse):
    """점프스타트 체크리스트 응답"""
    items: List[JumpstartChecklistItem] = Field(..., description="체크리스트 항목들")
    completionRate: float = Field(..., ge=0, le=100, description="완료율 (%)")
    totalItems: int = Field(..., description="전체 항목 수")
    completedItems: int = Field(..., description="완료된 항목 수")
    estimatedTimeRemaining: int = Field(..., description="남은 예상 시간 (분)")
    nextRecommendedAction: Optional[str] = Field(None, description="다음 권장 액션")
    generatedAt: str = Field(..., description="생성 시간 (KST ISO 8601)")


class ChecklistUpdateRequest(BaseModel):
    """체크리스트 업데이트 요청"""
    itemId: str = Field(..., description="항목 ID")
    completed: bool = Field(..., description="완료 여부")


# 캐시 관련 모델
class CacheKey(BaseModel):
    """캐시 키 정보"""
    engine_type: EngineType
    user_id: str
    target_date: Optional[str] = None
    parameters_hash: Optional[str] = None
    
    def generate_key(self) -> str:
        """캐시 키 생성"""
        parts = [f"engine#{self.engine_type.value}", f"user#{self.user_id}"]
        
        if self.target_date:
            parts.append(f"date#{self.target_date}")
        
        if self.parameters_hash:
            parts.append(f"params#{self.parameters_hash}")
        
        return ":".join(parts)


class CacheEntry(BaseModel):
    """캐시 엔트리"""
    key: str
    value: Dict[str, Any]
    expires_at: datetime
    created_at: datetime
    hit_count: int = 0