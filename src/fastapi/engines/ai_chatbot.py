"""
AI 상담봇 엔진
Amazon Bedrock Claude 모델을 사용한 교대근무 특화 상담봇
"""

import json
import time
import hashlib
from typing import Dict, Any, Optional, List
import boto3
from botocore.exceptions import ClientError

from ..services.cache_service import CacheService
from ..services.database_service import DatabaseService
from ..services.logger_service import LoggerFactory
from ..utils.time_utils import TimeUtils
from ..models.common import EngineResponse, DataMissingReason


class AIChatbotEngine:
    """AI 상담봇 엔진 클래스"""
    
    def __init__(self, cache_service: CacheService, db_service: DatabaseService):
        self.cache_service = cache_service
        self.db_service = db_service
        
        # Bedrock 클라이언트 초기화
        self.bedrock_client = boto3.client(
            'bedrock-runtime',
            region_name='us-east-1'
        )
        
        # Claude 모델 설정
        self.model_id = "anthropic.claude-3-haiku-20240307-v1:0"
        self.max_tokens = 1000
        self.temperature = 0.7
        
        # 교대근무 특화 시스템 프롬프트
        self.system_prompt = """당신은 교대근무자 전문 수면 상담사입니다. 다음 원칙을 따라 상담해주세요:

1. **전문성**: 교대근무(2교대/3교대/고정야간/불규칙)와 수면 과학에 대한 전문 지식을 바탕으로 답변
2. **개인화**: 사용자의 근무 패턴과 개인 상황을 고려한 맞춤형 조언
3. **실용성**: 실제로 실행 가능한 구체적인 방법 제시
4. **안전성**: 의료적 조언이 아닌 일반적인 수면 개선 정보만 제공
5. **공감**: 교대근무의 어려움을 이해하고 공감하는 톤

주요 상담 영역:
- 수면 패턴 조정 및 최적화
- 수면 환경 개선 (빛 차단, 소음 관리 등)
- 피로 관리 및 회복 전략
- 생활 리듬 조절 팁
- 카페인 및 식사 타이밍
- 스트레스 관리

항상 답변 끝에 "본 상담은 의료 진단이 아닌 일반적인 수면 개선 정보를 제공합니다."를 포함하세요.

한국어로 친근하고 전문적인 톤으로 답변해주세요."""

    async def generate_response(
        self,
        user_message: str,
        user_id: str,
        conversation_id: Optional[str] = None,
        user_context: Optional[Dict[str, Any]] = None,
        correlation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        AI 상담봇 응답 생성
        
        Args:
            user_message: 사용자 메시지
            user_id: 사용자 ID
            conversation_id: 대화 ID
            user_context: 사용자 컨텍스트 (프로필, 근무표 등)
            correlation_id: 요청 추적 ID
            
        Returns:
            AI 응답 데이터
        """
        start_time = time.time()
        logger = LoggerFactory.create_structured_logger("ai-chatbot-engine", correlation_id)
        
        try:
            logger.info("AI 상담봇 응답 생성 시작", {
                "userId": user_id,
                "conversationId": conversation_id,
                "messageLength": len(user_message)
            })
            
            # 사용자 컨텍스트 수집
            if not user_context:
                user_context = await self._collect_user_context(user_id)
            
            # 대화 기록 조회 (최근 5개)
            conversation_history = await self._get_conversation_history(
                user_id, conversation_id, limit=5
            )
            
            # 프롬프트 구성
            enhanced_prompt = await self._build_enhanced_prompt(
                user_message, user_context, conversation_history
            )
            
            # Bedrock Claude 호출
            response = await self._call_bedrock_claude(enhanced_prompt, correlation_id)
            
            # 응답 후처리
            processed_response = self._process_response(response)
            
            # 대화 기록 저장
            await self._save_conversation(
                user_id, conversation_id, user_message, processed_response["message"]
            )
            
            duration_ms = (time.time() - start_time) * 1000
            
            logger.info("AI 상담봇 응답 생성 완료", {
                "userId": user_id,
                "conversationId": conversation_id,
                "responseLength": len(processed_response["message"]),
                "durationMs": round(duration_ms, 2)
            })
            
            return {
                "message": processed_response["message"],
                "conversationId": conversation_id or f"conv-{int(time.time())}",
                "timestamp": TimeUtils.format_datetime(TimeUtils.now_kst()),
                "suggestions": processed_response.get("suggestions", []),
                "disclaimer": "본 상담은 의료 진단이 아닌 일반적인 수면 개선 정보를 제공합니다.",
                "metadata": {
                    "model": self.model_id,
                    "durationMs": round(duration_ms, 2),
                    "hasUserContext": bool(user_context),
                    "conversationLength": len(conversation_history)
                }
            }
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            
            logger.error("AI 상담봇 응답 생성 실패", e, {
                "userId": user_id,
                "conversationId": conversation_id,
                "durationMs": round(duration_ms, 2)
            })
            
            # 폴백 응답 반환
            return self._get_fallback_response(user_message, conversation_id)

    async def _collect_user_context(self, user_id: str) -> Dict[str, Any]:
        """사용자 컨텍스트 수집"""
        try:
            # 사용자 프로필 조회
            user_profile = await self.db_service.get_user_profile(user_id)
            
            # 최근 근무표 조회 (7일)
            recent_schedules = await self.db_service.get_recent_schedules(user_id, days=7)
            
            # 컨텍스트 구성
            context = {
                "shiftType": user_profile.get("shift_type") if user_profile else None,
                "commuteMin": user_profile.get("commute_min") if user_profile else None,
                "recentSchedules": [
                    {
                        "date": schedule.date,
                        "shiftType": schedule.shiftType.value,
                        "startAt": schedule.startAt,
                        "endAt": schedule.endAt
                    }
                    for schedule in recent_schedules[:5]
                ] if recent_schedules else [],
                "hasProfile": bool(user_profile)
            }
            
            return context
            
        except Exception as e:
            # 컨텍스트 수집 실패 시 빈 컨텍스트 반환
            return {"hasProfile": False}

    async def _get_conversation_history(
        self, 
        user_id: str, 
        conversation_id: Optional[str], 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """대화 기록 조회"""
        try:
            if not conversation_id:
                return []
            
            # TODO: 실제 대화 기록 조회 구현
            # 현재는 빈 기록 반환
            return []
            
        except Exception:
            return []

    async def _build_enhanced_prompt(
        self,
        user_message: str,
        user_context: Dict[str, Any],
        conversation_history: List[Dict[str, Any]]
    ) -> str:
        """향상된 프롬프트 구성"""
        
        # 사용자 컨텍스트 정보 추가
        context_info = ""
        if user_context.get("hasProfile"):
            shift_type_map = {
                "TWO_SHIFT": "2교대",
                "THREE_SHIFT": "3교대", 
                "FIXED_NIGHT": "고정야간",
                "IRREGULAR": "불규칙"
            }
            
            shift_type = user_context.get("shiftType")
            if shift_type:
                context_info += f"사용자 근무 유형: {shift_type_map.get(shift_type, shift_type)}\n"
            
            commute_min = user_context.get("commuteMin")
            if commute_min:
                context_info += f"통근 시간: {commute_min}분\n"
            
            recent_schedules = user_context.get("recentSchedules", [])
            if recent_schedules:
                context_info += f"최근 근무 패턴: {len(recent_schedules)}개 일정 확인됨\n"
        
        # 대화 기록 추가
        history_text = ""
        if conversation_history:
            history_text = "\n이전 대화:\n"
            for msg in conversation_history[-3:]:  # 최근 3개만
                role = "사용자" if msg.get("role") == "user" else "상담사"
                history_text += f"{role}: {msg.get('content', '')}\n"
        
        # 최종 프롬프트 구성
        enhanced_prompt = f"""{self.system_prompt}

{context_info}
{history_text}

현재 사용자 질문: {user_message}

위 정보를 바탕으로 개인화된 상담을 제공해주세요."""
        
        return enhanced_prompt

    async def _call_bedrock_claude(self, prompt: str, correlation_id: Optional[str]) -> str:
        """Bedrock Claude 모델 호출"""
        try:
            # Claude 3 Haiku 요청 형식
            request_body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": self.max_tokens,
                "temperature": self.temperature,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            }
            
            # Bedrock 호출
            response = self.bedrock_client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(request_body),
                contentType="application/json",
                accept="application/json"
            )
            
            # 응답 파싱
            response_body = json.loads(response['body'].read())
            
            if 'content' in response_body and len(response_body['content']) > 0:
                return response_body['content'][0]['text']
            else:
                raise Exception("Bedrock 응답에서 텍스트를 찾을 수 없습니다")
                
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'ThrottlingException':
                raise Exception("Bedrock API 요청 한도 초과")
            elif error_code == 'ValidationException':
                raise Exception("Bedrock 요청 형식 오류")
            else:
                raise Exception(f"Bedrock API 오류: {error_code}")
                
        except Exception as e:
            raise Exception(f"Bedrock 호출 실패: {str(e)}")

    def _process_response(self, raw_response: str) -> Dict[str, Any]:
        """응답 후처리"""
        try:
            # 기본 응답 정리
            message = raw_response.strip()
            
            # 추천 질문 추출 (간단한 패턴 매칭)
            suggestions = []
            
            # 교대근무 관련 추천 질문
            if any(keyword in message.lower() for keyword in ["수면", "잠"]):
                suggestions.extend([
                    "야간 근무 후 언제 자는 것이 좋을까요?",
                    "낮잠은 얼마나 자는 것이 적당한가요?"
                ])
            
            if any(keyword in message.lower() for keyword in ["피로", "졸림"]):
                suggestions.extend([
                    "연속 야간 근무 시 피로 관리 방법은?",
                    "근무 중 졸음을 이기는 방법이 있나요?"
                ])
            
            if any(keyword in message.lower() for keyword in ["카페인", "커피"]):
                suggestions.extend([
                    "야간 근무 시 카페인 섭취 타이밍은?",
                    "카페인 대신 할 수 있는 각성 방법은?"
                ])
            
            # 중복 제거 및 최대 3개로 제한
            suggestions = list(set(suggestions))[:3]
            
            return {
                "message": message,
                "suggestions": suggestions
            }
            
        except Exception:
            return {
                "message": raw_response.strip(),
                "suggestions": []
            }

    def _get_fallback_response(self, user_message: str, conversation_id: Optional[str]) -> Dict[str, Any]:
        """폴백 응답 생성"""
        
        # 키워드 기반 기본 응답
        shift_keywords = ["야간", "교대", "수면", "피로", "근무", "잠", "졸림", "스트레스"]
        has_shift_context = any(keyword in user_message for keyword in shift_keywords)
        
        if has_shift_context:
            message = """죄송합니다. 일시적으로 AI 상담 서비스에 문제가 발생했습니다.

교대근무와 수면에 관한 기본적인 도움말을 드리겠습니다:

**야간 근무 후 수면 팁:**
- 근무 직후보다는 1-2시간 후에 수면
- 어두운 환경 조성 (암막 커튼, 아이마스크)
- 실온을 18-20도로 유지
- 카페인은 수면 6시간 전까지만 섭취

**연속 근무 시 피로 관리:**
- 20-30분 파워냅 활용
- 규칙적인 식사 시간 유지
- 충분한 수분 섭취
- 가벼운 스트레칭이나 운동

더 자세한 상담이 필요하시면 잠시 후 다시 시도해 주세요.

본 상담은 의료 진단이 아닌 일반적인 수면 개선 정보를 제공합니다."""
        else:
            message = """안녕하세요! 교대근무자 수면 전문 상담봇입니다.

현재 일시적으로 AI 서비스에 문제가 발생하여 기본 응답을 제공하고 있습니다.

교대근무와 수면에 관련된 질문이 있으시면 다음과 같은 주제로 도움을 드릴 수 있습니다:

- 야간 근무 후 수면 방법
- 교대 근무 적응 팁  
- 수면 품질 개선 방법
- 피로 관리 전략

잠시 후 다시 시도해 주시면 더 자세한 상담을 받으실 수 있습니다."""
        
        return {
            "message": message,
            "conversationId": conversation_id or f"conv-{int(time.time())}",
            "timestamp": TimeUtils.format_datetime(TimeUtils.now_kst()),
            "suggestions": [
                "야간 근무 후 언제 자는 것이 좋을까요?",
                "연속 야간 근무 시 피로 관리 방법은?",
                "수면 환경을 어떻게 개선할 수 있나요?"
            ],
            "disclaimer": "본 상담은 의료 진단이 아닌 일반적인 수면 개선 정보를 제공합니다.",
            "metadata": {
                "model": "fallback",
                "hasUserContext": False,
                "isFallback": True
            }
        }

    async def _save_conversation(
        self,
        user_id: str,
        conversation_id: Optional[str],
        user_message: str,
        ai_response: str
    ):
        """대화 기록 저장"""
        try:
            if not conversation_id:
                return
            
            # TODO: 실제 대화 기록 저장 구현
            # 현재는 로깅만 수행
            logger = LoggerFactory.create_structured_logger("conversation-storage")
            logger.info("대화 기록 저장", {
                "userId": user_id,
                "conversationId": conversation_id,
                "userMessageLength": len(user_message),
                "aiResponseLength": len(ai_response)
            })
            
        except Exception as e:
            # 대화 저장 실패는 전체 프로세스를 중단하지 않음
            logger = LoggerFactory.create_structured_logger("conversation-storage")
            logger.error("대화 기록 저장 실패", e, {
                "userId": user_id,
                "conversationId": conversation_id
            })

    async def health_check(self) -> Dict[str, Any]:
        """엔진 헬스 체크"""
        try:
            # Bedrock 연결 테스트 (간단한 요청)
            test_request = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 10,
                "temperature": 0.1,
                "messages": [
                    {
                        "role": "user",
                        "content": "Hello"
                    }
                ]
            }
            
            start_time = time.time()
            response = self.bedrock_client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(test_request),
                contentType="application/json",
                accept="application/json"
            )
            latency_ms = (time.time() - start_time) * 1000
            
            return {
                "healthy": True,
                "latency_ms": round(latency_ms, 2),
                "model": self.model_id,
                "details": {
                    "bedrock_available": True,
                    "model_accessible": True
                }
            }
            
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
                "model": self.model_id,
                "details": {
                    "bedrock_available": False,
                    "model_accessible": False
                }
            }