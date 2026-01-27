"""
교대근무자 수면 최적화 백엔드 - FastAPI 엔진 서비스
EC2에서 실행되는 3대 핵심 엔진 및 AI 상담봇 서비스

아키텍처:
- Lambda: 단순 CRUD API
- EC2 FastAPI: 복잡한 계산 엔진 및 AI 서비스
- ElastiCache: 계산 결과 캐시
"""

import os
import logging
from datetime import datetime
from typing import Optional, Dict, Any
import asyncio
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

# 로컬 임포트
from .config import settings
from .services.cache_service import CacheService
from .services.database_service import DatabaseService
from .services.auth_service import AuthService
from .services.logger_service import LoggerService
from .engines.shift_to_sleep import ShiftToSleepEngine
from .engines.caffeine_cutoff import CaffeineCutoffEngine
from .engines.fatigue_risk import FatigueRiskEngine
from .engines.ai_chatbot import AIChatbotEngine
from .models.common import EngineResponse, HealthStatus
from .utils.correlation import get_correlation_id
from .utils.error_handler import create_error_response

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 전역 서비스 인스턴스
cache_service: Optional[CacheService] = None
db_service: Optional[DatabaseService] = None
auth_service: Optional[AuthService] = None
logger_service: Optional[LoggerService] = None

# 엔진 인스턴스
shift_to_sleep_engine: Optional[ShiftToSleepEngine] = None
caffeine_cutoff_engine: Optional[CaffeineCutoffEngine] = None
fatigue_risk_engine: Optional[FatigueRiskEngine] = None
ai_chatbot_engine: Optional[AIChatbotEngine] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 생명주기 관리"""
    # 시작 시 초기화
    await initialize_services()
    logger.info("FastAPI 엔진 서비스가 시작되었습니다")
    
    yield
    
    # 종료 시 정리
    await cleanup_services()
    logger.info("FastAPI 엔진 서비스가 종료되었습니다")


# FastAPI 앱 생성
app = FastAPI(
    title="교대근무자 수면 최적화 엔진 서비스",
    description="3대 핵심 엔진 및 AI 상담봇을 제공하는 FastAPI 서비스",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


async def initialize_services():
    """서비스 초기화"""
    global cache_service, db_service, auth_service, logger_service
    global shift_to_sleep_engine, caffeine_cutoff_engine, fatigue_risk_engine, ai_chatbot_engine
    
    try:
        # 기본 서비스 초기화
        cache_service = CacheService()
        await cache_service.initialize()
        
        db_service = DatabaseService()
        await db_service.initialize()
        
        auth_service = AuthService()
        logger_service = LoggerService()
        
        # 엔진 초기화
        shift_to_sleep_engine = ShiftToSleepEngine(cache_service, db_service)
        caffeine_cutoff_engine = CaffeineCutoffEngine(cache_service, db_service)
        fatigue_risk_engine = FatigueRiskEngine(cache_service, db_service)
        ai_chatbot_engine = AIChatbotEngine(cache_service, db_service)
        
        logger.info("모든 서비스가 성공적으로 초기화되었습니다")
        
    except Exception as e:
        logger.error(f"서비스 초기화 실패: {e}")
        raise


async def cleanup_services():
    """서비스 정리"""
    global cache_service, db_service
    
    try:
        if cache_service:
            await cache_service.close()
        
        if db_service:
            await db_service.close()
            
        logger.info("모든 서비스가 정리되었습니다")
        
    except Exception as e:
        logger.error(f"서비스 정리 중 오류: {e}")


# 의존성 주입
async def get_cache_service() -> CacheService:
    if not cache_service:
        raise HTTPException(status_code=503, detail="캐시 서비스를 사용할 수 없습니다")
    return cache_service


async def get_db_service() -> DatabaseService:
    if not db_service:
        raise HTTPException(status_code=503, detail="데이터베이스 서비스를 사용할 수 없습니다")
    return db_service


async def get_auth_service() -> AuthService:
    if not auth_service:
        raise HTTPException(status_code=503, detail="인증 서비스를 사용할 수 없습니다")
    return auth_service


async def get_logger_service() -> LoggerService:
    if not logger_service:
        raise HTTPException(status_code=503, detail="로거 서비스를 사용할 수 없습니다")
    return logger_service


# 미들웨어: 요청 로깅 및 상관관계 ID 처리
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """요청/응답 로깅 미들웨어"""
    correlation_id = get_correlation_id(request)
    start_time = datetime.utcnow()
    
    # 요청 로깅
    if logger_service:
        await logger_service.log_request(
            correlation_id=correlation_id,
            method=request.method,
            path=str(request.url.path),
            query_params=dict(request.query_params),
            user_agent=request.headers.get("user-agent")
        )
    
    try:
        response = await call_next(request)
        
        # 성공 응답 로깅
        duration = (datetime.utcnow() - start_time).total_seconds() * 1000
        if logger_service:
            await logger_service.log_response(
                correlation_id=correlation_id,
                status_code=response.status_code,
                duration_ms=duration
            )
        
        # 응답에 상관관계 ID 추가
        response.headers["X-Correlation-Id"] = correlation_id
        return response
        
    except Exception as e:
        # 에러 응답 로깅
        duration = (datetime.utcnow() - start_time).total_seconds() * 1000
        if logger_service:
            await logger_service.log_error(
                correlation_id=correlation_id,
                error=e,
                duration_ms=duration
            )
        
        # 표준화된 에러 응답 반환
        return create_error_response(e, correlation_id)


# 헬스 체크 엔드포인트
@app.get("/health", response_model=HealthStatus)
async def health_check(
    cache: CacheService = Depends(get_cache_service),
    db: DatabaseService = Depends(get_db_service)
):
    """서비스 헬스 체크"""
    try:
        # 각 서비스 상태 확인
        cache_status = await cache.health_check()
        db_status = await db.health_check()
        
        # 전체 상태 결정
        overall_status = "healthy"
        if not cache_status["healthy"] or not db_status["healthy"]:
            overall_status = "degraded"
        
        return HealthStatus(
            status=overall_status,
            timestamp=datetime.utcnow().isoformat() + "+09:00",  # KST
            services={
                "cache": cache_status,
                "database": db_status,
                "engines": {
                    "shift_to_sleep": shift_to_sleep_engine is not None,
                    "caffeine_cutoff": caffeine_cutoff_engine is not None,
                    "fatigue_risk": fatigue_risk_engine is not None,
                    "ai_chatbot": ai_chatbot_engine is not None
                }
            },
            version="1.0.0"
        )
        
    except Exception as e:
        logger.error(f"헬스 체크 실패: {e}")
        return HealthStatus(
            status="unhealthy",
            timestamp=datetime.utcnow().isoformat() + "+09:00",
            services={},
            version="1.0.0",
            error=str(e)
        )


# 엔진 라우터 등록
from .routers import engines, chat, dashboard

app.include_router(engines.router, tags=["engines"])
app.include_router(chat.router, tags=["chat"])
app.include_router(dashboard.router, tags=["dashboard"])


# 루트 엔드포인트
@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "service": "교대근무자 수면 최적화 엔진 서비스",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat() + "+09:00",
        "endpoints": {
            "health": "/health",
            "engines": "/api/v1/engines",
            "chat": "/api/v1/chat"
        }
    }


# 개발 서버 실행
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )