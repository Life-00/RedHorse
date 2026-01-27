"""
엔진 API 라우터
3대 핵심 엔진 (Shift-to-Sleep, Caffeine Cutoff, Fatigue Risk Score) 엔드포인트
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional, List
import time

from ..models.common import (
    EngineResponse, ShiftToSleepRequest, CaffeineCutoffRequest, 
    FatigueRiskRequest, ErrorResponse, EngineType
)
from ..engines.shift_to_sleep import ShiftToSleepEngine
from ..services.cache_service import CacheService
from ..services.database_service import DatabaseService
from ..services.auth_service import AuthService
from ..services.logger_service import LoggerFactory
from ..utils.time_utils import TimeUtils

router = APIRouter(prefix="/api/v1/engines", tags=["engines"])

# 의존성 주입
async def get_cache_service() -> CacheService:
    return CacheService()

async def get_db_service() -> DatabaseService:
    return DatabaseService()

async def get_auth_service(db_service: DatabaseService = Depends(get_db_service)) -> AuthService:
    return AuthService(db_service)


@router.get("/shift-to-sleep", response_model=EngineResponse)
async def get_shift_to_sleep_recommendation(
    date: Optional[str] = None,
    sleep_duration_hours: Optional[float] = 8.0,
    buffer_minutes: Optional[int] = 30,
    force_refresh: Optional[bool] = False,
    x_correlation_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),  # 실제로는 JWT에서 추출
    cache_service: CacheService = Depends(get_cache_service),
    db_service: DatabaseService = Depends(get_db_service),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Shift-to-Sleep 엔진 - 최적 수면창 계산
    
    교대근무자의 근무 패턴을 분석하여 최적의 수면창(메인 수면 + 파워냅)을 계산합니다.
    """
    start_time = time.time()
    
    # Correlation ID 생성
    correlation_id = x_correlation_id or auth_service._generate_correlation_id()
    
    # 로거 생성
    logger = LoggerFactory.create_structured_logger("shift-to-sleep-engine", correlation_id)
    metrics_logger = LoggerFactory.create_metrics_logger(correlation_id)
    
    try:
        # 사용자 인증 (실제로는 JWT 미들웨어에서 처리)
        if not x_user_id:
            raise HTTPException(status_code=401, detail="User authentication required")
        
        user_id = x_user_id
        logger.info("Shift-to-Sleep 엔진 요청 시작", {
            "userId": user_id,
            "targetDate": date,
            "sleepDurationHours": sleep_duration_hours,
            "bufferMinutes": buffer_minutes,
            "forceRefresh": force_refresh
        })
        
        # 요청 객체 생성
        request = ShiftToSleepRequest(
            userId=user_id,
            targetDate=date or TimeUtils.today_kst(),
            sleepDurationHours=sleep_duration_hours,
            bufferMinutes=buffer_minutes,
            forceRefresh=force_refresh
        )
        
        # 엔진 실행
        engine = ShiftToSleepEngine(cache_service, db_service)
        
        with logger.timer("shift_to_sleep_calculation", {"userId": user_id}):
            result = await engine.calculate(request, correlation_id)
        
        # 메트릭 기록
        duration_ms = (time.time() - start_time) * 1000
        cache_hit = hasattr(result, 'result') and result.result is not None and not force_refresh
        
        metrics_logger.record_engine_execution(
            engine_type="SHIFT_TO_SLEEP",
            success=True,
            duration_ms=duration_ms,
            cache_hit=cache_hit,
            user_id=user_id
        )
        
        logger.info("Shift-to-Sleep 엔진 요청 완료", {
            "userId": user_id,
            "success": True,
            "hasResult": result.result is not None,
            "durationMs": round(duration_ms, 2)
        })
        
        # 응답 헤더 설정
        result.correlationId = correlation_id
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        logger.error("Shift-to-Sleep 엔진 요청 실패", e, {
            "userId": x_user_id,
            "durationMs": round(duration_ms, 2)
        })
        
        metrics_logger.record_engine_execution(
            engine_type="SHIFT_TO_SLEEP",
            success=False,
            duration_ms=duration_ms,
            cache_hit=False,
            user_id=x_user_id
        )
        
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred while calculating sleep recommendation"
        )


@router.get("/caffeine-cutoff", response_model=EngineResponse)
async def get_caffeine_cutoff_recommendation(
    date: Optional[str] = None,
    target_sleep_time: Optional[str] = None,
    caffeine_amount_mg: Optional[float] = 100.0,
    half_life_hours: Optional[float] = 5.0,
    safe_threshold_mg: Optional[float] = 25.0,
    force_refresh: Optional[bool] = False,
    x_correlation_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    cache_service: CacheService = Depends(get_cache_service),
    db_service: DatabaseService = Depends(get_db_service),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Caffeine Cutoff 엔진 - 카페인 마감시간 계산
    
    카페인의 반감기를 고려하여 수면에 영향을 주지 않는 카페인 마감시간을 계산합니다.
    """
    start_time = time.time()
    correlation_id = x_correlation_id or auth_service._generate_correlation_id()
    
    logger = LoggerFactory.create_structured_logger("caffeine-cutoff-engine", correlation_id)
    metrics_logger = LoggerFactory.create_metrics_logger(correlation_id)
    
    try:
        if not x_user_id:
            raise HTTPException(status_code=401, detail="User authentication required")
        
        user_id = x_user_id
        logger.info("Caffeine Cutoff 엔진 요청 시작", {
            "userId": user_id,
            "targetDate": date,
            "targetSleepTime": target_sleep_time,
            "caffeineAmountMg": caffeine_amount_mg,
            "halfLifeHours": half_life_hours
        })
        
        # 요청 객체 생성
        from ..models.common import CaffeineCutoffRequest
        request = CaffeineCutoffRequest(
            userId=user_id,
            targetDate=date or TimeUtils.today_kst(),
            targetSleepTime=target_sleep_time,
            caffeineAmountMg=caffeine_amount_mg,
            halfLifeHours=half_life_hours,
            safeThresholdMg=safe_threshold_mg,
            forceRefresh=force_refresh
        )
        
        # 엔진 실행
        from ..engines.caffeine_cutoff import CaffeineCutoffEngine
        engine = CaffeineCutoffEngine(cache_service, db_service)
        
        with logger.timer("caffeine_cutoff_calculation", {"userId": user_id}):
            result = await engine.calculate(request, correlation_id)
        
        # 메트릭 기록
        duration_ms = (time.time() - start_time) * 1000
        cache_hit = hasattr(result, 'result') and result.result is not None and not force_refresh
        
        metrics_logger.record_engine_execution(
            engine_type="CAFFEINE_CUTOFF",
            success=True,
            duration_ms=duration_ms,
            cache_hit=cache_hit,
            user_id=user_id
        )
        
        logger.info("Caffeine Cutoff 엔진 요청 완료", {
            "userId": user_id,
            "success": True,
            "hasResult": result.result is not None,
            "durationMs": round(duration_ms, 2)
        })
        
        # 응답 헤더 설정
        result.correlationId = correlation_id
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        logger.error("Caffeine Cutoff 엔진 요청 실패", e, {
            "userId": x_user_id,
            "durationMs": round(duration_ms, 2)
        })
        
        metrics_logger.record_engine_execution(
            engine_type="CAFFEINE_CUTOFF",
            success=False,
            duration_ms=duration_ms,
            cache_hit=False,
            user_id=x_user_id
        )
        
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred while calculating caffeine cutoff"
        )


@router.get("/fatigue-risk", response_model=EngineResponse)
async def get_fatigue_risk_assessment(
    date: Optional[str] = None,
    include_recommendations: Optional[bool] = True,
    include_prediction: Optional[bool] = False,
    days_to_analyze: Optional[int] = 7,
    x_correlation_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    cache_service: CacheService = Depends(get_cache_service),
    db_service: DatabaseService = Depends(get_db_service),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Fatigue Risk Score 엔진 - 피로도 위험 점수 계산
    
    평균 수면시간, 연속 야간근무, 통근시간을 종합하여 피로도 위험 점수를 계산합니다.
    """
    start_time = time.time()
    correlation_id = x_correlation_id or auth_service._generate_correlation_id()
    
    logger = LoggerFactory.create_structured_logger("fatigue-risk-engine", correlation_id)
    metrics_logger = LoggerFactory.create_metrics_logger(correlation_id)
    
    try:
        if not x_user_id:
            raise HTTPException(status_code=401, detail="User authentication required")
        
        user_id = x_user_id
        logger.info("Fatigue Risk 엔진 요청 시작", {
            "userId": user_id,
            "targetDate": date,
            "includeRecommendations": include_recommendations,
            "includePrediction": include_prediction,
            "daysToAnalyze": days_to_analyze
        })
        
        # 요청 객체 생성
        from ..models.common import FatigueRiskRequest
        request = FatigueRiskRequest(
            userId=user_id,
            targetDate=date or TimeUtils.today_kst(),
            includeRecommendations=include_recommendations,
            includePrediction=include_prediction,
            daysToAnalyze=days_to_analyze,
            forceRefresh=False
        )
        
        # 엔진 실행
        from ..engines.fatigue_risk import FatigueRiskEngine
        engine = FatigueRiskEngine(cache_service, db_service)
        
        with logger.timer("fatigue_risk_calculation", {"userId": user_id}):
            result = await engine.calculate(request, correlation_id)
        
        # 메트릭 기록
        duration_ms = (time.time() - start_time) * 1000
        cache_hit = hasattr(result, 'result') and result.result is not None
        
        metrics_logger.record_engine_execution(
            engine_type="FATIGUE_RISK",
            success=True,
            duration_ms=duration_ms,
            cache_hit=cache_hit,
            user_id=user_id
        )
        
        logger.info("Fatigue Risk 엔진 요청 완료", {
            "userId": user_id,
            "success": True,
            "hasResult": result.result is not None,
            "durationMs": round(duration_ms, 2)
        })
        
        # 응답 헤더 설정
        result.correlationId = correlation_id
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        logger.error("Fatigue Risk 엔진 요청 실패", e, {
            "userId": x_user_id,
            "durationMs": round(duration_ms, 2)
        })
        
        metrics_logger.record_engine_execution(
            engine_type="FATIGUE_RISK",
            success=False,
            duration_ms=duration_ms,
            cache_hit=False,
            user_id=x_user_id
        )
        
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred while calculating fatigue risk"
        )


@router.delete("/cache/{user_id}")
async def invalidate_user_cache(
    user_id: str,
    engine_type: Optional[str] = None,
    target_date: Optional[str] = None,
    x_correlation_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    cache_service: CacheService = Depends(get_cache_service),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    사용자 캐시 무효화
    
    특정 사용자의 엔진 캐시를 무효화합니다.
    관리자 권한 또는 본인 캐시만 무효화 가능합니다.
    """
    correlation_id = x_correlation_id or auth_service._generate_correlation_id()
    logger = LoggerFactory.create_structured_logger("cache-invalidation", correlation_id)
    
    try:
        # 권한 확인 (본인 캐시만 무효화 가능)
        if not x_user_id or x_user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        logger.info("캐시 무효화 요청", {
            "targetUserId": user_id,
            "requestUserId": x_user_id,
            "engineType": engine_type,
            "targetDate": target_date
        })
        
        # 엔진 타입 변환
        engine_type_enum = None
        if engine_type:
            try:
                engine_type_enum = EngineType(engine_type)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid engine type: {engine_type}")
        
        # 캐시 무효화 실행
        deleted_count = await cache_service.invalidate_engine_cache(
            user_id=user_id,
            engine_type=engine_type_enum,
            target_date=target_date
        )
        
        logger.info("캐시 무효화 완료", {
            "targetUserId": user_id,
            "deletedCount": deleted_count,
            "engineType": engine_type,
            "targetDate": target_date
        })
        
        return {
            "success": True,
            "message": f"Cache invalidated successfully",
            "deletedEntries": deleted_count,
            "correlationId": correlation_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("캐시 무효화 실패", e, {
            "targetUserId": user_id,
            "requestUserId": x_user_id
        })
        
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred while invalidating cache"
        )


@router.get("/cache/stats")
async def get_cache_statistics(
    x_correlation_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    cache_service: CacheService = Depends(get_cache_service),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    캐시 통계 조회
    
    사용자별 캐시 통계 정보를 조회합니다.
    """
    correlation_id = x_correlation_id or auth_service._generate_correlation_id()
    logger = LoggerFactory.create_structured_logger("cache-stats", correlation_id)
    
    try:
        if not x_user_id:
            raise HTTPException(status_code=401, detail="User authentication required")
        
        user_id = x_user_id
        logger.info("캐시 통계 조회 요청", {"userId": user_id})
        
        # 캐시 통계 조회
        stats = await cache_service.get_cache_stats(user_id)
        hit_rate = await cache_service.get_cache_hit_rate(user_id)
        
        result = {
            **stats,
            "hitRate": round(hit_rate * 100, 2),  # 백분율로 변환
            "correlationId": correlation_id
        }
        
        logger.info("캐시 통계 조회 완료", {
            "userId": user_id,
            "cacheKeys": stats.get("user_cache_keys", 0),
            "hitRate": result["hitRate"]
        })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("캐시 통계 조회 실패", e, {"userId": x_user_id})
        
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred while retrieving cache statistics"
        )


@router.post("/cache/preload")
async def preload_user_cache(
    target_dates: List[str],
    engine_types: Optional[List[str]] = None,
    x_correlation_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    cache_service: CacheService = Depends(get_cache_service),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    사용자 캐시 사전 로딩
    
    지정된 날짜와 엔진 타입에 대해 캐시를 미리 생성합니다.
    배치 작업이나 성능 최적화를 위해 사용됩니다.
    """
    correlation_id = x_correlation_id or auth_service._generate_correlation_id()
    logger = LoggerFactory.create_structured_logger("cache-preload", correlation_id)
    
    try:
        if not x_user_id:
            raise HTTPException(status_code=401, detail="User authentication required")
        
        user_id = x_user_id
        
        # 엔진 타입 변환
        if engine_types:
            try:
                engine_type_enums = [EngineType(et) for et in engine_types]
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"Invalid engine type: {e}")
        else:
            # 모든 엔진 타입 사용
            engine_type_enums = list(EngineType)
        
        logger.info("캐시 사전 로딩 요청", {
            "userId": user_id,
            "targetDates": target_dates,
            "engineTypes": [et.value for et in engine_type_enums]
        })
        
        # 캐시 사전 로딩 실행
        result = await cache_service.preload_user_cache(
            user_id=user_id,
            target_dates=target_dates,
            engine_types=engine_type_enums
        )
        
        logger.info("캐시 사전 로딩 완료", {
            "userId": user_id,
            "createdEntries": result.get("cache_entries_created", 0),
            "errors": len(result.get("errors", []))
        })
        
        return {
            **result,
            "correlationId": correlation_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("캐시 사전 로딩 실패", e, {"userId": x_user_id})
        
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred while preloading cache"
        )


@router.get("/health")
async def health_check(
    cache_service: CacheService = Depends(get_cache_service),
    db_service: DatabaseService = Depends(get_db_service)
):
    """엔진 서비스 헬스 체크"""
    try:
        # 캐시 및 데이터베이스 상태 확인
        cache_health = await cache_service.health_check()
        db_health = await db_service.health_check()
        
        overall_status = "healthy"
        if not cache_health["healthy"] or not db_health["healthy"]:
            overall_status = "degraded"
        
        return {
            "status": overall_status,
            "timestamp": TimeUtils.format_datetime(TimeUtils.now_kst()),
            "engines": {
                "shift_to_sleep": "active",
                "caffeine_cutoff": "active",
                "fatigue_risk": "active"
            },
            "services": {
                "cache": cache_health,
                "database": db_health
            }
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": TimeUtils.format_datetime(TimeUtils.now_kst()),
            "engines": {
                "shift_to_sleep": "unknown",
                "caffeine_cutoff": "unknown", 
                "fatigue_risk": "unknown"
            },
            "error": str(e)
        }