"""
인증 서비스
JWT 토큰 검증 및 사용자 인증 처리
"""

import jwt
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from ..models.common import UserProfile
from .database_service import DatabaseService

logger = logging.getLogger(__name__)


class AuthService:
    """인증 서비스 클래스"""
    
    def __init__(self, db_service: Optional[DatabaseService] = None):
        self.db = db_service
    
    async def get_user_id_from_token(self, cognito_sub: str) -> Optional[str]:
        """Cognito sub로부터 내부 user_id 조회"""
        if not self.db:
            return None
            
        try:
            query = "SELECT user_id FROM users WHERE cognito_sub = $1"
            result = await self.db.fetch_one(query, cognito_sub)
            
            if result:
                return result['user_id']
            
            logger.warning(f"User not found for cognito_sub: {cognito_sub}")
            return None
            
        except Exception as e:
            logger.error(f"Failed to get user_id from token: {e}")
            return None
    
    async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """사용자 프로필 조회"""
        try:
            query = """
                SELECT user_id, cognito_sub, shift_type, commute_min, 
                       wearable_connected, org_id, created_at, updated_at
                FROM users 
                WHERE user_id = $1
            """
            result = await self.db.fetch_one(query, user_id)
            
            if result:
                return UserProfile(
                    userId=result['user_id'],
                    cognitoSub=result['cognito_sub'],
                    shiftType=result['shift_type'],
                    commuteMin=result['commute_min'],
                    wearableConnected=result['wearable_connected'],
                    orgId=result['org_id'],
                    createdAt=result['created_at'].isoformat() if result['created_at'] else None,
                    updatedAt=result['updated_at'].isoformat() if result['updated_at'] else None
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get user profile: {e}")
            return None
    
    async def validate_user_access(self, user_id: str, resource_user_id: str) -> bool:
        """사용자 리소스 접근 권한 검증"""
        return user_id == resource_user_id
    
    async def validate_b2b_access(self, user_id: str, org_id: str) -> bool:
        """B2B 조직 접근 권한 검증"""
        try:
            query = """
                SELECT org_id FROM users 
                WHERE user_id = $1 AND org_id = $2
            """
            result = await self.db.fetch_one(query, user_id, org_id)
            return result is not None
            
        except Exception as e:
            logger.error(f"Failed to validate B2B access: {e}")
            return False
    
    def extract_correlation_id(self, headers: Dict[str, str]) -> str:
        """요청 헤더에서 correlation ID 추출"""
        correlation_id = (
            headers.get('x-correlation-id') or 
            headers.get('X-Correlation-Id') or
            self._generate_correlation_id()
        )
        return correlation_id
    
    def _generate_correlation_id(self) -> str:
        """새로운 correlation ID 생성"""
        import uuid
        import time
        
        timestamp = int(time.time())
        unique_id = str(uuid.uuid4())[:8]
        return f"req-{timestamp}-{unique_id}"
    
    async def update_last_active(self, user_id: str) -> None:
        """사용자 마지막 활동 시간 업데이트"""
        try:
            query = """
                UPDATE users 
                SET last_active_at = NOW() 
                WHERE user_id = $1
            """
            await self.db.execute(query, user_id)
            
        except Exception as e:
            logger.error(f"Failed to update last active: {e}")
    
    def mask_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """민감한 데이터 마스킹"""
        masked_data = data.copy()
        
        # 이메일 마스킹
        if 'email' in masked_data:
            email = masked_data['email']
            if '@' in email:
                local, domain = email.split('@', 1)
                if len(local) > 1:
                    masked_local = local[0] + '*' * (len(local) - 1)
                else:
                    masked_local = '*'
                masked_data['email'] = f"{masked_local}@{domain}"
        
        # 사용자 ID 부분 마스킹
        if 'userId' in masked_data:
            user_id = masked_data['userId']
            if len(user_id) > 8:
                masked_data['userId'] = user_id[:8] + '***'
        
        # 민감한 필드 제거
        sensitive_fields = ['password', 'ssn', 'phoneNumber', 'cognitoSub']
        for field in sensitive_fields:
            if field in masked_data:
                del masked_data[field]
        
        return masked_data
    
    def create_audit_log(
        self, 
        user_id: str, 
        action: str, 
        resource: str, 
        correlation_id: str,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """감사 로그 생성"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "userId": user_id,
            "action": action,
            "resource": resource,
            "correlationId": correlation_id,
            "success": True
        }
        
        if additional_data:
            log_entry["additionalData"] = self.mask_sensitive_data(additional_data)
        
        return log_entry
    
    async def check_rate_limit(
        self, 
        user_id: str, 
        action: str, 
        limit_per_minute: int = 60
    ) -> tuple[bool, int]:
        """사용자별 요청 제한 확인"""
        try:
            # Redis나 메모리 캐시를 사용한 rate limiting 구현
            # 현재는 기본적인 구현만 제공
            
            # TODO: 실제 rate limiting 로직 구현
            # - Redis를 사용한 sliding window 또는 token bucket 알고리즘
            # - 사용자별, 액션별 제한 설정
            
            return True, 0  # 임시로 항상 허용
            
        except Exception as e:
            logger.error(f"Failed to check rate limit: {e}")
            return True, 0  # 에러 시 허용
    
    def validate_request_signature(
        self, 
        payload: str, 
        signature: str, 
        secret: str
    ) -> bool:
        """요청 서명 검증 (웹훅 등에 사용)"""
        try:
            import hmac
            import hashlib
            
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
            
        except Exception as e:
            logger.error(f"Failed to validate request signature: {e}")
            return False
    
    async def get_user_permissions(self, user_id: str) -> Dict[str, bool]:
        """사용자 권한 조회"""
        try:
            # 기본 권한
            permissions = {
                "read_own_data": True,
                "write_own_data": True,
                "delete_own_data": True,
                "access_engines": True,
                "upload_files": True
            }
            
            # B2B 권한 확인
            query = """
                SELECT org_id FROM users 
                WHERE user_id = $1 AND org_id IS NOT NULL
            """
            result = await self.db.fetch_one(query, user_id)
            
            if result:
                permissions.update({
                    "access_b2b_stats": True,
                    "view_org_data": True
                })
            
            return permissions
            
        except Exception as e:
            logger.error(f"Failed to get user permissions: {e}")
            return {
                "read_own_data": True,
                "write_own_data": True,
                "delete_own_data": True,
                "access_engines": True,
                "upload_files": True
            }
    
    def create_response_headers(self, correlation_id: str) -> Dict[str, str]:
        """응답 헤더 생성"""
        return {
            "X-Correlation-Id": correlation_id,
            "X-Disclaimer": "본 서비스는 의료 진단이 아닌 일반적인 수면 권장사항을 제공합니다."
        }
    
    async def log_security_event(
        self,
        event_type: str,
        user_id: Optional[str],
        ip_address: Optional[str],
        user_agent: Optional[str],
        details: Dict[str, Any],
        correlation_id: str
    ) -> None:
        """보안 이벤트 로깅"""
        try:
            security_log = {
                "timestamp": datetime.utcnow().isoformat(),
                "eventType": event_type,
                "userId": user_id,
                "ipAddress": ip_address,
                "userAgent": user_agent,
                "details": self.mask_sensitive_data(details),
                "correlationId": correlation_id,
                "severity": self._get_event_severity(event_type)
            }
            
            # 보안 로그는 별도 로거로 기록
            security_logger = logging.getLogger('security')
            security_logger.warning(f"Security event: {security_log}")
            
            # 심각한 보안 이벤트의 경우 알림 발송
            if security_log["severity"] == "high":
                await self._send_security_alert(security_log)
                
        except Exception as e:
            logger.error(f"Failed to log security event: {e}")
    
    def _get_event_severity(self, event_type: str) -> str:
        """보안 이벤트 심각도 결정"""
        high_severity_events = [
            "authentication_failure_multiple",
            "unauthorized_access_attempt",
            "data_breach_attempt",
            "suspicious_activity"
        ]
        
        medium_severity_events = [
            "authentication_failure",
            "permission_denied",
            "rate_limit_exceeded"
        ]
        
        if event_type in high_severity_events:
            return "high"
        elif event_type in medium_severity_events:
            return "medium"
        else:
            return "low"
    
    async def _send_security_alert(self, security_log: Dict[str, Any]) -> None:
        """보안 알림 발송"""
        try:
            # TODO: 실제 알림 시스템 연동
            # - SNS를 통한 이메일/SMS 알림
            # - Slack 웹훅
            # - CloudWatch 알람
            
            logger.critical(f"High severity security event: {security_log}")
            
        except Exception as e:
            logger.error(f"Failed to send security alert: {e}")