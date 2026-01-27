"""
로거 서비스
구조화된 로깅 및 관측가능성 지원
"""

import json
import logging
import time
from datetime import datetime
from typing import Dict, Any, Optional
from contextlib import contextmanager


class StructuredLogger:
    """구조화된 로거 클래스"""
    
    def __init__(self, name: str, correlation_id: str):
        self.logger = logging.getLogger(name)
        self.correlation_id = correlation_id
        self.service_name = name
    
    def _create_log_entry(
        self, 
        level: str, 
        message: str, 
        data: Optional[Dict[str, Any]] = None,
        error: Optional[Exception] = None,
        duration_ms: Optional[float] = None
    ) -> Dict[str, Any]:
        """로그 엔트리 생성"""
        entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": level,
            "service": self.service_name,
            "correlationId": self.correlation_id,
            "message": message
        }
        
        if data:
            entry["data"] = self._mask_sensitive_data(data)
        
        if error:
            entry["error"] = {
                "name": error.__class__.__name__,
                "message": str(error),
                "stack": self._get_stack_trace(error)
            }
        
        if duration_ms is not None:
            entry["durationMs"] = round(duration_ms, 2)
        
        return entry
    
    def info(self, message: str, data: Optional[Dict[str, Any]] = None) -> None:
        """정보 로그"""
        entry = self._create_log_entry("INFO", message, data)
        self.logger.info(json.dumps(entry, ensure_ascii=False))
    
    def warn(self, message: str, data: Optional[Dict[str, Any]] = None) -> None:
        """경고 로그"""
        entry = self._create_log_entry("WARN", message, data)
        self.logger.warning(json.dumps(entry, ensure_ascii=False))
    
    def error(
        self, 
        message: str, 
        error: Optional[Exception] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> None:
        """에러 로그"""
        entry = self._create_log_entry("ERROR", message, data, error)
        self.logger.error(json.dumps(entry, ensure_ascii=False))
    
    def debug(self, message: str, data: Optional[Dict[str, Any]] = None) -> None:
        """디버그 로그"""
        entry = self._create_log_entry("DEBUG", message, data)
        self.logger.debug(json.dumps(entry, ensure_ascii=False))
    
    def performance(
        self, 
        operation: str, 
        duration_ms: float,
        data: Optional[Dict[str, Any]] = None
    ) -> None:
        """성능 로그"""
        message = f"Operation completed: {operation}"
        entry = self._create_log_entry("INFO", message, data, duration_ms=duration_ms)
        self.logger.info(json.dumps(entry, ensure_ascii=False))
    
    @contextmanager
    def timer(self, operation: str, data: Optional[Dict[str, Any]] = None):
        """성능 측정 컨텍스트 매니저"""
        start_time = time.time()
        try:
            yield
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            self.error(f"Operation failed: {operation}", e, {
                **(data or {}),
                "durationMs": round(duration_ms, 2)
            })
            raise
        else:
            duration_ms = (time.time() - start_time) * 1000
            self.performance(operation, duration_ms, data)
    
    def _mask_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """민감한 데이터 마스킹"""
        if not isinstance(data, dict):
            return data
        
        masked_data = {}
        sensitive_keys = {
            'password', 'token', 'secret', 'key', 'auth', 'credential',
            'ssn', 'social_security', 'phone', 'email', 'cognito_sub'
        }
        
        for key, value in data.items():
            key_lower = key.lower()
            
            # 민감한 키 확인
            if any(sensitive in key_lower for sensitive in sensitive_keys):
                if key_lower == 'email' and isinstance(value, str) and '@' in value:
                    # 이메일 마스킹
                    local, domain = value.split('@', 1)
                    masked_local = local[0] + '*' * (len(local) - 1) if len(local) > 1 else '*'
                    masked_data[key] = f"{masked_local}@{domain}"
                else:
                    # 기타 민감한 데이터는 완전 마스킹
                    masked_data[key] = "***MASKED***"
            elif isinstance(value, dict):
                # 중첩된 딕셔너리 재귀 처리
                masked_data[key] = self._mask_sensitive_data(value)
            elif isinstance(value, list):
                # 리스트 내 딕셔너리 처리
                masked_data[key] = [
                    self._mask_sensitive_data(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                masked_data[key] = value
        
        return masked_data
    
    def _get_stack_trace(self, error: Exception) -> Optional[str]:
        """스택 트레이스 추출"""
        import traceback
        try:
            return traceback.format_exc()
        except:
            return None


class MetricsLogger:
    """메트릭 로거 클래스"""
    
    def __init__(self, correlation_id: str):
        self.logger = logging.getLogger('metrics')
        self.correlation_id = correlation_id
    
    def record_api_call(
        self,
        endpoint: str,
        method: str,
        status_code: int,
        duration_ms: float,
        user_id: Optional[str] = None
    ) -> None:
        """API 호출 메트릭 기록"""
        metric = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "type": "api_call",
            "correlationId": self.correlation_id,
            "endpoint": endpoint,
            "method": method,
            "statusCode": status_code,
            "durationMs": round(duration_ms, 2),
            "userId": user_id
        }
        
        self.logger.info(json.dumps(metric, ensure_ascii=False))
    
    def record_engine_execution(
        self,
        engine_type: str,
        success: bool,
        duration_ms: float,
        cache_hit: bool = False,
        user_id: Optional[str] = None
    ) -> None:
        """엔진 실행 메트릭 기록"""
        metric = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "type": "engine_execution",
            "correlationId": self.correlation_id,
            "engineType": engine_type,
            "success": success,
            "durationMs": round(duration_ms, 2),
            "cacheHit": cache_hit,
            "userId": user_id
        }
        
        self.logger.info(json.dumps(metric, ensure_ascii=False))
    
    def record_database_operation(
        self,
        operation: str,
        table: str,
        duration_ms: float,
        success: bool = True,
        row_count: Optional[int] = None
    ) -> None:
        """데이터베이스 작업 메트릭 기록"""
        metric = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "type": "database_operation",
            "correlationId": self.correlation_id,
            "operation": operation,
            "table": table,
            "durationMs": round(duration_ms, 2),
            "success": success,
            "rowCount": row_count
        }
        
        self.logger.info(json.dumps(metric, ensure_ascii=False))
    
    def record_cache_operation(
        self,
        operation: str,
        cache_key: str,
        hit: bool,
        duration_ms: float
    ) -> None:
        """캐시 작업 메트릭 기록"""
        metric = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "type": "cache_operation",
            "correlationId": self.correlation_id,
            "operation": operation,
            "cacheKey": cache_key,
            "hit": hit,
            "durationMs": round(duration_ms, 2)
        }
        
        self.logger.info(json.dumps(metric, ensure_ascii=False))


class AuditLogger:
    """감사 로거 클래스"""
    
    def __init__(self, correlation_id: str):
        self.logger = logging.getLogger('audit')
        self.correlation_id = correlation_id
    
    def log_user_action(
        self,
        user_id: str,
        action: str,
        resource: str,
        success: bool = True,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """사용자 액션 감사 로그"""
        audit_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "type": "user_action",
            "correlationId": self.correlation_id,
            "userId": user_id,
            "action": action,
            "resource": resource,
            "success": success,
            "details": self._mask_sensitive_data(details) if details else None
        }
        
        self.logger.info(json.dumps(audit_entry, ensure_ascii=False))
    
    def log_data_access(
        self,
        user_id: str,
        data_type: str,
        operation: str,
        record_count: int,
        success: bool = True
    ) -> None:
        """데이터 접근 감사 로그"""
        audit_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "type": "data_access",
            "correlationId": self.correlation_id,
            "userId": user_id,
            "dataType": data_type,
            "operation": operation,
            "recordCount": record_count,
            "success": success
        }
        
        self.logger.info(json.dumps(audit_entry, ensure_ascii=False))
    
    def log_security_event(
        self,
        event_type: str,
        severity: str,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """보안 이벤트 감사 로그"""
        audit_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "type": "security_event",
            "correlationId": self.correlation_id,
            "eventType": event_type,
            "severity": severity,
            "userId": user_id,
            "ipAddress": ip_address,
            "details": self._mask_sensitive_data(details) if details else None
        }
        
        # 보안 이벤트는 항상 WARNING 레벨로 기록
        self.logger.warning(json.dumps(audit_entry, ensure_ascii=False))
    
    def _mask_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """민감한 데이터 마스킹 (StructuredLogger와 동일한 로직)"""
        if not isinstance(data, dict):
            return data
        
        masked_data = {}
        sensitive_keys = {
            'password', 'token', 'secret', 'key', 'auth', 'credential',
            'ssn', 'social_security', 'phone', 'email', 'cognito_sub'
        }
        
        for key, value in data.items():
            key_lower = key.lower()
            
            if any(sensitive in key_lower for sensitive in sensitive_keys):
                if key_lower == 'email' and isinstance(value, str) and '@' in value:
                    local, domain = value.split('@', 1)
                    masked_local = local[0] + '*' * (len(local) - 1) if len(local) > 1 else '*'
                    masked_data[key] = f"{masked_local}@{domain}"
                else:
                    masked_data[key] = "***MASKED***"
            elif isinstance(value, dict):
                masked_data[key] = self._mask_sensitive_data(value)
            elif isinstance(value, list):
                masked_data[key] = [
                    self._mask_sensitive_data(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                masked_data[key] = value
        
        return masked_data


class LoggerFactory:
    """로거 팩토리 클래스"""
    
    @staticmethod
    def create_structured_logger(service_name: str, correlation_id: str) -> StructuredLogger:
        """구조화된 로거 생성"""
        return StructuredLogger(service_name, correlation_id)
    
    @staticmethod
    def create_metrics_logger(correlation_id: str) -> MetricsLogger:
        """메트릭 로거 생성"""
        return MetricsLogger(correlation_id)
    
    @staticmethod
    def create_audit_logger(correlation_id: str) -> AuditLogger:
        """감사 로거 생성"""
        return AuditLogger(correlation_id)
    
    @staticmethod
    def setup_logging_config():
        """로깅 설정 초기화"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(message)s',  # JSON 로그이므로 추가 포맷팅 불필요
            handlers=[
                logging.StreamHandler()  # CloudWatch로 전송
            ]
        )
        
        # 각 로거별 레벨 설정
        logging.getLogger('metrics').setLevel(logging.INFO)
        logging.getLogger('audit').setLevel(logging.INFO)
        logging.getLogger('security').setLevel(logging.WARNING)
        
        # 외부 라이브러리 로그 레벨 조정
        logging.getLogger('asyncpg').setLevel(logging.WARNING)
        logging.getLogger('uvicorn').setLevel(logging.INFO)
        logging.getLogger('fastapi').setLevel(logging.INFO)