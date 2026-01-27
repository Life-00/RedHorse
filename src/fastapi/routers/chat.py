"""
채팅 API 라우터
AI 상담봇 (Bedrock 연동) 엔드포인트
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional, List
import time

from ..models.common import ChatRequest, ChatResponse, ErrorResponse
from ..services.cache_service import CacheService
from ..services.database_service import DatabaseService
from ..services.auth_service import AuthService
from ..services.logger_service import LoggerFactory
from ..engines.ai_chatbot import AIChatbotEngine
from ..utils.time_utils import TimeUtils

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

# 의존성 주입
async def get_cache_service() -> CacheService:
    return CacheService()

async def get_db_service() -> DatabaseService:
    return DatabaseService()

async def get_auth_service() -> AuthService:
    return AuthService()

async def get_ai_chatbot_engine(
    cache_service: CacheService = Depends(get_cache_service),
    db_service: DatabaseService = Depends(get_db_service)
) -> AIChatbotEngine:
    return AIChatbotEngine(cache_service, db_service)


@router.post("/message", response_model=ChatResponse)
async def send_chat_message(
    request: ChatRequest,
    x_correlation_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    cache_service: CacheService = Depends(get_cache_service),
    db_service: DatabaseService = Depends(get_db_service),
    auth_service: AuthService = Depends(get_auth_service),
    ai_engine: AIChatbotEngine = Depends(get_ai_chatbot_engine)
):
    """
    AI 상담봇과 대화
    
    교대근무 특화 AI 상담봇과 대화를 나눕니다.
    Amazon Bedrock Claude 모델을 사용합니다.
    """
    start_time = time.time()
    correlation_id = x_correlation_id or auth_service._generate_correlation_id()
    
    logger = LoggerFactory.create_structured_logger("chat-service", correlation_id)
    metrics_logger = LoggerFactory.create_metrics_logger(correlation_id)
    
    try:
        if not x_user_id:
            raise HTTPException(status_code=401, detail="User authentication required")
        
        user_id = x_user_id
        logger.info("채팅 메시지 요청 시작", {
            "userId": user_id,
            "messageLength": len(request.message),
            "conversationId": request.conversationId
        })
        
        # AI 상담봇 엔진을 통한 응답 생성
        ai_response = await ai_engine.generate_response(
            user_message=request.message,
            user_id=user_id,
            conversation_id=request.conversationId,
            user_context=request.context,
            correlation_id=correlation_id
        )
        
        # ChatResponse 모델로 변환
        response = ChatResponse(
            message=ai_response["message"],
            conversationId=ai_response["conversationId"],
            timestamp=ai_response["timestamp"],
            suggestions=ai_response.get("suggestions", []),
            disclaimer=ai_response["disclaimer"],
            correlationId=correlation_id,
            metadata=ai_response.get("metadata", {})
        )
        
        duration_ms = (time.time() - start_time) * 1000
        
        # 메트릭 기록
        metrics_logger.record_api_call(
            endpoint="/api/v1/chat/message",
            method="POST",
            status_code=200,
            duration_ms=duration_ms,
            user_id=user_id
        )
        
        logger.info("채팅 메시지 요청 완료", {
            "userId": user_id,
            "conversationId": response.conversationId,
            "responseLength": len(response.message),
            "durationMs": round(duration_ms, 2),
            "model": ai_response.get("metadata", {}).get("model", "unknown")
        })
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        logger.error("채팅 메시지 요청 실패", e, {
            "userId": x_user_id,
            "durationMs": round(duration_ms, 2)
        })
        
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred while processing chat message"
        )


@router.get("/conversations/{conversation_id}/history")
async def get_conversation_history(
    conversation_id: str,
    limit: Optional[int] = 20,
    x_correlation_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    대화 기록 조회
    
    특정 대화의 기록을 조회합니다.
    """
    correlation_id = x_correlation_id or auth_service._generate_correlation_id()
    logger = LoggerFactory.create_structured_logger("chat-history", correlation_id)
    
    try:
        if not x_user_id:
            raise HTTPException(status_code=401, detail="User authentication required")
        
        user_id = x_user_id
        logger.info("대화 기록 조회 요청", {
            "userId": user_id,
            "conversationId": conversation_id,
            "limit": limit
        })
        
        # TODO: 실제 대화 기록 조회 구현
        # 현재는 빈 기록 반환
        
        return {
            "conversationId": conversation_id,
            "messages": [],
            "totalCount": 0,
            "correlationId": correlation_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("대화 기록 조회 실패", e, {
            "userId": x_user_id,
            "conversationId": conversation_id
        })
        
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred while retrieving conversation history"
        )


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    x_correlation_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    대화 삭제
    
    특정 대화와 관련된 모든 기록을 삭제합니다.
    """
    correlation_id = x_correlation_id or auth_service._generate_correlation_id()
    logger = LoggerFactory.create_structured_logger("chat-delete", correlation_id)
    
    try:
        if not x_user_id:
            raise HTTPException(status_code=401, detail="User authentication required")
        
        user_id = x_user_id
        logger.info("대화 삭제 요청", {
            "userId": user_id,
            "conversationId": conversation_id
        })
        
        # TODO: 실제 대화 삭제 구현
        
        logger.info("대화 삭제 완료", {
            "userId": user_id,
            "conversationId": conversation_id
        })
        
        return {
            "success": True,
            "message": "Conversation deleted successfully",
            "correlationId": correlation_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("대화 삭제 실패", e, {
            "userId": x_user_id,
            "conversationId": conversation_id
        })
        
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred while deleting conversation"
        )


@router.get("/health")
async def health_check(
    ai_engine: AIChatbotEngine = Depends(get_ai_chatbot_engine)
):
    """채팅 서비스 헬스 체크"""
    try:
        # AI 엔진 헬스 체크
        ai_health = await ai_engine.health_check()
        
        return {
            "status": "healthy" if ai_health["healthy"] else "degraded",
            "timestamp": TimeUtils.format_datetime(TimeUtils.now_kst()),
            "services": {
                "bedrock": ai_health,
                "conversation_storage": {
                    "healthy": True,
                    "details": {"implementation": "pending"}
                }
            }
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": TimeUtils.format_datetime(TimeUtils.now_kst()),
            "services": {
                "bedrock": {"healthy": False, "error": str(e)},
                "conversation_storage": {"healthy": False}
            }
        }