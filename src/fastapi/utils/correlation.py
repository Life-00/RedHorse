"""
상관관계 ID 처리 유틸리티
"""

import uuid
from typing import Optional
from fastapi import Request


def get_correlation_id(request: Request) -> str:
    """
    요청에서 상관관계 ID 추출 또는 생성
    
    Args:
        request: FastAPI 요청 객체
        
    Returns:
        상관관계 ID 문자열
    """
    # 헤더에서 상관관계 ID 확인
    correlation_id = request.headers.get("X-Correlation-Id")
    
    if not correlation_id:
        correlation_id = request.headers.get("x-correlation-id")
    
    # 없으면 새로 생성
    if not correlation_id:
        correlation_id = generate_correlation_id()
    
    return correlation_id


def generate_correlation_id() -> str:
    """
    새로운 상관관계 ID 생성
    
    Returns:
        req-{timestamp}-{random} 형식의 ID
    """
    import time
    import random
    import string
    
    timestamp = int(time.time())
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    
    return f"req-{timestamp}-{random_suffix}"


def extract_correlation_id_from_header(header_value: Optional[str]) -> Optional[str]:
    """
    헤더 값에서 상관관계 ID 추출
    
    Args:
        header_value: 헤더 값
        
    Returns:
        추출된 상관관계 ID 또는 None
    """
    if not header_value:
        return None
    
    # 기본적으로 그대로 반환하지만, 필요시 검증 로직 추가 가능
    return header_value.strip()