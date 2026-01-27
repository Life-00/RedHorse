"""
에러 처리 유틸리티
표준화된 에러 응답 생성
"""

from typing import Dict, Any, Optional
from fastapi import HTTPException
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)


def create_error_response(
    error: Exception, 
    correlation_id: str,
    status_code: Optional[int] = None
) -> JSONResponse:
    """
    표준화된 에러 응답 생성
    
    Args:
        error: 발생한 예외
        correlation_id: 상관관계 ID
        status_code: HTTP 상태 코드 (선택적)
        
    Returns:
        JSONResponse 객체
    """
    
    # HTTPException인 경우 상태 코드와 메시지 추출
    if isinstance(error, HTTPException):
        status_code = error.status_code
        error_code = get_error_code_from_status(status_code)
        message = error.detail
        details = getattr(error, 'details', {})
    else:
        # 일반 예외인 경우
        status_code = status_code or 500
        error_code = get_error_code_from_status(status_code)
        message = "Internal server error occurred"
        details = {"exception_type": type(error).__name__}
        
        # 개발 환경에서는 상세 에러 메시지 포함
        import os
        if os.getenv("DEBUG", "false").lower() == "true":
            details["exception_message"] = str(error)
    
    error_response = {
        "error": {
            "code": error_code,
            "message": message,
            "details": details
        },
        "correlationId": correlation_id
    }
    
    # 에러 로깅
    logger.error(f"API 에러 발생: {error_code} - {message}", extra={
        "correlation_id": correlation_id,
        "status_code": status_code,
        "error_type": type(error).__name__
    })
    
    return JSONResponse(
        status_code=status_code,
        content=error_response,
        headers={"X-Correlation-Id": correlation_id}
    )


def get_error_code_from_status(status_code: int) -> str:
    """
    HTTP 상태 코드에서 에러 코드 매핑
    
    Args:
        status_code: HTTP 상태 코드
        
    Returns:
        에러 코드 문자열
    """
    error_code_map = {
        400: "VALIDATION_ERROR",
        401: "AUTHENTICATION_ERROR", 
        403: "AUTHORIZATION_ERROR",
        404: "RESOURCE_NOT_FOUND",
        409: "RESOURCE_CONFLICT",
        429: "RATE_LIMIT_EXCEEDED",
        500: "INTERNAL_ERROR",
        502: "BAD_GATEWAY",
        503: "SERVICE_UNAVAILABLE",
        504: "GATEWAY_TIMEOUT"
    }
    
    return error_code_map.get(status_code, "UNKNOWN_ERROR")


def create_validation_error(
    message: str,
    field: Optional[str] = None,
    rule: Optional[str] = None,
    correlation_id: Optional[str] = None
) -> HTTPException:
    """
    검증 에러 생성
    
    Args:
        message: 에러 메시지
        field: 에러 발생 필드
        rule: 위반된 규칙
        correlation_id: 상관관계 ID
        
    Returns:
        HTTPException 객체
    """
    details = {}
    if field:
        details["field"] = field
    if rule:
        details["rule"] = rule
    
    error = HTTPException(
        status_code=400,
        detail=message
    )
    error.details = details
    
    return error


def create_authentication_error(
    message: str = "Authentication required",
    correlation_id: Optional[str] = None
) -> HTTPException:
    """
    인증 에러 생성
    
    Args:
        message: 에러 메시지
        correlation_id: 상관관계 ID
        
    Returns:
        HTTPException 객체
    """
    return HTTPException(
        status_code=401,
        detail=message
    )


def create_authorization_error(
    message: str = "Access denied",
    correlation_id: Optional[str] = None
) -> HTTPException:
    """
    권한 에러 생성
    
    Args:
        message: 에러 메시지
        correlation_id: 상관관계 ID
        
    Returns:
        HTTPException 객체
    """
    return HTTPException(
        status_code=403,
        detail=message
    )


def create_not_found_error(
    resource: str = "Resource",
    correlation_id: Optional[str] = None
) -> HTTPException:
    """
    리소스 없음 에러 생성
    
    Args:
        resource: 리소스 이름
        correlation_id: 상관관계 ID
        
    Returns:
        HTTPException 객체
    """
    return HTTPException(
        status_code=404,
        detail=f"{resource} not found"
    )


def create_internal_error(
    message: str = "Internal server error",
    correlation_id: Optional[str] = None
) -> HTTPException:
    """
    내부 서버 에러 생성
    
    Args:
        message: 에러 메시지
        correlation_id: 상관관계 ID
        
    Returns:
        HTTPException 객체
    """
    return HTTPException(
        status_code=500,
        detail=message
    )


def create_service_unavailable_error(
    service: str = "Service",
    correlation_id: Optional[str] = None
) -> HTTPException:
    """
    서비스 사용 불가 에러 생성
    
    Args:
        service: 서비스 이름
        correlation_id: 상관관계 ID
        
    Returns:
        HTTPException 객체
    """
    return HTTPException(
        status_code=503,
        detail=f"{service} is currently unavailable"
    )