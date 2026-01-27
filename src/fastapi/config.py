"""
FastAPI 애플리케이션 설정
환경 변수 기반 설정 관리
"""

import os
from typing import List, Optional
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    """애플리케이션 설정"""
    
    # 기본 설정
    DEBUG: bool = Field(default=False, env="DEBUG")
    APP_NAME: str = Field(default="교대근무자 수면 최적화 엔진 서비스", env="APP_NAME")
    VERSION: str = Field(default="1.0.0", env="VERSION")
    
    # 데이터베이스 설정
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    DATABASE_POOL_SIZE: int = Field(default=20, env="DATABASE_POOL_SIZE")
    
    # Redis/ElastiCache 설정
    REDIS_URL: str = Field(..., env="REDIS_URL")
    REDIS_POOL_SIZE: int = Field(default=10, env="REDIS_POOL_SIZE")
    CACHE_TTL_SECONDS: int = Field(default=172800, env="CACHE_TTL_SECONDS")  # 48시간
    
    # AWS 설정
    AWS_REGION: str = Field(default="us-east-1", env="AWS_REGION")
    AWS_ACCESS_KEY_ID: Optional[str] = Field(default=None, env="AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = Field(default=None, env="AWS_SECRET_ACCESS_KEY")
    
    # Bedrock 설정
    BEDROCK_MODEL_ID: str = Field(
        default="anthropic.claude-3-haiku-20240307-v1:0", 
        env="BEDROCK_MODEL_ID"
    )
    BEDROCK_MAX_TOKENS: int = Field(default=1000, env="BEDROCK_MAX_TOKENS")
    BEDROCK_TEMPERATURE: float = Field(default=0.7, env="BEDROCK_TEMPERATURE")
    
    # CORS 설정
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:8080",
            "https://*.amazonaws.com"
        ],
        env="CORS_ORIGINS"
    )
    
    # 로깅 설정
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        env="LOG_FORMAT"
    )
    
    # 보안 설정
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    ALGORITHM: str = Field(default="HS256", env="ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # 엔진 설정
    ENGINE_CACHE_ENABLED: bool = Field(default=True, env="ENGINE_CACHE_ENABLED")
    ENGINE_TIMEOUT_SECONDS: int = Field(default=30, env="ENGINE_TIMEOUT_SECONDS")
    
    # 메트릭 설정
    METRICS_ENABLED: bool = Field(default=True, env="METRICS_ENABLED")
    CLOUDWATCH_NAMESPACE: str = Field(default="ShiftSleep/Engine", env="CLOUDWATCH_NAMESPACE")
    
    # 헬스 체크 설정
    HEALTH_CHECK_TIMEOUT: int = Field(default=5, env="HEALTH_CHECK_TIMEOUT")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# 전역 설정 인스턴스
settings = Settings()


def get_database_url() -> str:
    """데이터베이스 URL 반환"""
    return settings.DATABASE_URL


def get_redis_url() -> str:
    """Redis URL 반환"""
    return settings.REDIS_URL


def is_debug_mode() -> bool:
    """디버그 모드 여부 확인"""
    return settings.DEBUG


def get_cors_origins() -> List[str]:
    """CORS 허용 오리진 목록 반환"""
    if isinstance(settings.CORS_ORIGINS, str):
        return [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
    return settings.CORS_ORIGINS


def get_aws_config() -> dict:
    """AWS 설정 반환"""
    config = {
        "region_name": settings.AWS_REGION
    }
    
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        config.update({
            "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
            "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY
        })
    
    return config


def get_bedrock_config() -> dict:
    """Bedrock 설정 반환"""
    return {
        "model_id": settings.BEDROCK_MODEL_ID,
        "max_tokens": settings.BEDROCK_MAX_TOKENS,
        "temperature": settings.BEDROCK_TEMPERATURE,
        **get_aws_config()
    }


def get_logging_config() -> dict:
    """로깅 설정 반환"""
    return {
        "level": settings.LOG_LEVEL,
        "format": settings.LOG_FORMAT,
        "handlers": ["console"]
    }


def get_cache_config() -> dict:
    """캐시 설정 반환"""
    return {
        "url": settings.REDIS_URL,
        "pool_size": settings.REDIS_POOL_SIZE,
        "ttl_seconds": settings.CACHE_TTL_SECONDS,
        "enabled": settings.ENGINE_CACHE_ENABLED
    }


def get_engine_config() -> dict:
    """엔진 설정 반환"""
    return {
        "cache_enabled": settings.ENGINE_CACHE_ENABLED,
        "timeout_seconds": settings.ENGINE_TIMEOUT_SECONDS,
        "bedrock": get_bedrock_config()
    }


def get_metrics_config() -> dict:
    """메트릭 설정 반환"""
    return {
        "enabled": settings.METRICS_ENABLED,
        "namespace": settings.CLOUDWATCH_NAMESPACE,
        **get_aws_config()
    }


# 환경별 설정 검증
def validate_settings():
    """설정 유효성 검증"""
    errors = []
    
    # 필수 환경 변수 확인
    required_vars = [
        "DATABASE_URL",
        "REDIS_URL", 
        "SECRET_KEY"
    ]
    
    for var in required_vars:
        if not getattr(settings, var, None):
            errors.append(f"Required environment variable {var} is not set")
    
    # 데이터베이스 URL 형식 확인
    if settings.DATABASE_URL and not settings.DATABASE_URL.startswith(("postgresql://", "postgres://")):
        errors.append("DATABASE_URL must be a valid PostgreSQL connection string")
    
    # Redis URL 형식 확인
    if settings.REDIS_URL and not settings.REDIS_URL.startswith("redis://"):
        errors.append("REDIS_URL must be a valid Redis connection string")
    
    if errors:
        raise ValueError("Configuration validation failed:\n" + "\n".join(errors))


# 애플리케이션 시작 시 설정 검증
if __name__ != "__main__":
    try:
        validate_settings()
    except ValueError as e:
        import logging
        logging.error(f"Configuration error: {e}")
        # 개발 환경에서는 경고만 출력, 프로덕션에서는 예외 발생
        if not is_debug_mode():
            raise