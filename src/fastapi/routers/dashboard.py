"""
대시보드 API 라우터
홈 대시보드 및 점프스타트 체크리스트 엔드포인트
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional
import time

from ..models.common import (
    DashboardHomeResponse, JumpstartChecklistResponse, 
    ChecklistUpdateRequest, ErrorResponse
)
from ..services.dashboard_service import DashboardService
from ..services.cache_service import CacheService
from ..services.database_service import DatabaseService
from ..services.auth_service import AuthService
from ..services.logger_service import LoggerFactory
from ..utils.time_utils import TimeUtils

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

# 의존성 주입
async def get_cache_service() -> CacheService:
    return CacheService()

async def get_db_service() -> DatabaseService:
    return DatabaseService()

async def get_auth_service() -> AuthService:
    return AuthService()

async def get_dashboard_service(
    cache_service: CacheService = Depends(get_cache_service),
    db_service: DatabaseService = Depends(get_db_service)
) -> DashboardService:
    return DashboardService(cache_service, db_service)


@router.get("/home", response_model=DashboardHomeResponse)
async def get_home_dashboard(
    x_correlation_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    홈 대시보드 데이터 조회
    
    교대근무자를 위한 통합 대시보드 정보를 제공합니다.
    - 수면 권장사항
    - 카페인 가이드
    - 피로도 평가
    - 오늘 근무 일정
    - 빠른 액션 목록
    """
    start_time = time.time()
    correlation_id = x_correlation_id or auth_service._generate_correlation_id()
    
    logger = LoggerFactory.create_structured_logger("dashboard-home", correlation_id)
    metrics_logger = LoggerFactory.create_metrics_logger(correlation_id)
    
    try:
        if not x_user_id:
            raise HTTPException(status_code=401, detail="User authentication required")
        
        user_id = x_user_id
        logger.info("홈 대시보드 요청 시작", {"userId": user_id})
        
        # 대시보드 데이터 조회
        result = await dashboard_service.get_home_dashboard(user_id, correlation_id)
        
        duration_ms = (time.time() - start_time) * 1000
        
        # 메트릭 기록
        metrics_logger.record_api_call(
            endpoint="/api/v1/dashboard/home",
            method="GET",
            status_code=200,
            duration_ms=duration_ms,
            user_id=user_id
        )
        
        logger.info("홈 대시보드 요청 완료", {
            "userId": user_id,
            "durationMs": round(duration_ms, 2),
            "hasSleepData": result.sleepRecommendation is not None,
            "hasCaffeineData": result.caffeineGuidance is not None,
            "hasFatigueData": result.fatigueAssessment is not None,
            "hasScheduleData": result.todaySchedule is not None,
            "quickActionsCount": len(result.quickActions)
        })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        logger.error("홈 대시보드 요청 실패", e, {
            "userId": x_user_id,
            "durationMs": round(duration_ms, 2)
        })
        
        metrics_logger.record_api_call(
            endpoint="/api/v1/dashboard/home",
            method="GET",
            status_code=500,
            duration_ms=duration_ms,
            user_id=x_user_id
        )
        
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred while retrieving dashboard data"
        )


@router.get("/jumpstart", response_model=JumpstartChecklistResponse)
async def get_jumpstart_checklist(
    x_correlation_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    점프스타트 체크리스트 조회
    
    교대근무 수면 개선을 위한 단계별 체크리스트를 제공합니다.
    - 프로필 설정
    - 근무표 입력
    - 수면 환경 개선
    - 습관 형성 등
    """
    start_time = time.time()
    correlation_id = x_correlation_id or auth_service._generate_correlation_id()
    
    logger = LoggerFactory.create_structured_logger("jumpstart-checklist", correlation_id)
    metrics_logger = LoggerFactory.create_metrics_logger(correlation_id)
    
    try:
        if not x_user_id:
            raise HTTPException(status_code=401, detail="User authentication required")
        
        user_id = x_user_id
        logger.info("점프스타트 체크리스트 요청 시작", {"userId": user_id})
        
        # 체크리스트 조회
        result = await dashboard_service.get_jumpstart_checklist(user_id, correlation_id)
        
        duration_ms = (time.time() - start_time) * 1000
        
        # 메트릭 기록
        metrics_logger.record_api_call(
            endpoint="/api/v1/dashboard/jumpstart",
            method="GET",
            status_code=200,
            duration_ms=duration_ms,
            user_id=user_id
        )
        
        logger.info("점프스타트 체크리스트 요청 완료", {
            "userId": user_id,
            "durationMs": round(duration_ms, 2),
            "totalItems": result.totalItems,
            "completedItems": result.completedItems,
            "completionRate": result.completionRate
        })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        logger.error("점프스타트 체크리스트 요청 실패", e, {
            "userId": x_user_id,
            "durationMs": round(duration_ms, 2)
        })
        
        metrics_logger.record_api_call(
            endpoint="/api/v1/dashboard/jumpstart",
            method="GET",
            status_code=500,
            duration_ms=duration_ms,
            user_id=x_user_id
        )
        
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred while retrieving jumpstart checklist"
        )


@router.post("/jumpstart/update")
async def update_checklist_item(
    request: ChecklistUpdateRequest,
    x_correlation_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    체크리스트 항목 업데이트
    
    특정 체크리스트 항목의 완료 상태를 업데이트합니다.
    """
    start_time = time.time()
    correlation_id = x_correlation_id or auth_service._generate_correlation_id()
    
    logger = LoggerFactory.create_structured_logger("checklist-update", correlation_id)
    metrics_logger = LoggerFactory.create_metrics_logger(correlation_id)
    
    try:
        if not x_user_id:
            raise HTTPException(status_code=401, detail="User authentication required")
        
        user_id = x_user_id
        logger.info("체크리스트 항목 업데이트 요청 시작", {
            "userId": user_id,
            "itemId": request.itemId,
            "completed": request.completed
        })
        
        # 체크리스트 항목 업데이트
        result = await dashboard_service.update_checklist_item(
            user_id=user_id,
            item_id=request.itemId,
            completed=request.completed,
            correlation_id=correlation_id
        )
        
        duration_ms = (time.time() - start_time) * 1000
        
        if result["success"]:
            # 메트릭 기록
            metrics_logger.record_api_call(
                endpoint="/api/v1/dashboard/jumpstart/update",
                method="POST",
                status_code=200,
                duration_ms=duration_ms,
                user_id=user_id
            )
            
            logger.info("체크리스트 항목 업데이트 완료", {
                "userId": user_id,
                "itemId": request.itemId,
                "completed": request.completed,
                "newCompletionRate": result.get("completionRate", 0),
                "durationMs": round(duration_ms, 2)
            })
            
            return {
                "success": True,
                "message": "Checklist item updated successfully",
                "data": result,
                "correlationId": correlation_id
            }
        else:
            logger.error("체크리스트 항목 업데이트 실패", None, {
                "userId": user_id,
                "itemId": request.itemId,
                "error": result.get("error")
            })
            
            raise HTTPException(
                status_code=500,
                detail=f"Failed to update checklist item: {result.get('error', 'Unknown error')}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        logger.error("체크리스트 항목 업데이트 요청 실패", e, {
            "userId": x_user_id,
            "itemId": request.itemId,
            "durationMs": round(duration_ms, 2)
        })
        
        metrics_logger.record_api_call(
            endpoint="/api/v1/dashboard/jumpstart/update",
            method="POST",
            status_code=500,
            duration_ms=duration_ms,
            user_id=x_user_id
        )
        
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred while updating checklist item"
        )


@router.get("/health")
async def health_check(
    dashboard_service: DashboardService = Depends(get_dashboard_service)
):
    """대시보드 서비스 헬스 체크"""
    try:
        return {
            "status": "healthy",
            "timestamp": TimeUtils.format_datetime(TimeUtils.now_kst()),
            "services": {
                "dashboard": "active",
                "engines_integration": "active",
                "checklist": "active"
            }
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": TimeUtils.format_datetime(TimeUtils.now_kst()),
            "error": str(e)
        }