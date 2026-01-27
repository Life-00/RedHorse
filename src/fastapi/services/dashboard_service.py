"""
대시보드 서비스
홈 대시보드 및 점프스타트 체크리스트 관리
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from ..services.cache_service import CacheService
from ..services.database_service import DatabaseService
from ..engines.shift_to_sleep import ShiftToSleepEngine
from ..engines.caffeine_cutoff import CaffeineCutoffEngine
from ..engines.fatigue_risk import FatigueRiskEngine
from ..models.common import (
    DashboardHomeResponse, JumpstartChecklistResponse, JumpstartChecklistItem,
    ShiftToSleepRequest, CaffeineCutoffRequest, FatigueRiskRequest,
    UserProfile, ShiftSchedule
)
from ..utils.time_utils import TimeUtils

logger = logging.getLogger(__name__)


class DashboardService:
    """대시보드 서비스 클래스"""
    
    def __init__(self, cache_service: CacheService, db_service: DatabaseService):
        self.cache = cache_service
        self.db = db_service
        
        # 엔진 인스턴스
        self.shift_to_sleep_engine = ShiftToSleepEngine(cache_service, db_service)
        self.caffeine_cutoff_engine = CaffeineCutoffEngine(cache_service, db_service)
        self.fatigue_risk_engine = FatigueRiskEngine(cache_service, db_service)
    
    async def get_home_dashboard(
        self, 
        user_id: str, 
        correlation_id: str
    ) -> DashboardHomeResponse:
        """
        홈 대시보드 데이터 조회
        
        Args:
            user_id: 사용자 ID
            correlation_id: 요청 추적 ID
            
        Returns:
            홈 대시보드 응답
        """
        try:
            logger.info("홈 대시보드 조회 시작", {"userId": user_id})
            
            # 오늘 날짜
            today = TimeUtils.format_date_only(TimeUtils.now_kst())
            
            # 병렬로 모든 엔진 데이터 조회
            sleep_data, caffeine_data, fatigue_data, schedule_data = await asyncio.gather(
                self._get_sleep_recommendation(user_id, today, correlation_id),
                self._get_caffeine_guidance(user_id, today, correlation_id),
                self._get_fatigue_assessment(user_id, today, correlation_id),
                self._get_today_schedule(user_id, today),
                return_exceptions=True
            )
            
            # 예외 처리
            if isinstance(sleep_data, Exception):
                logger.warning(f"수면 권장사항 조회 실패: {sleep_data}")
                sleep_data = None
            
            if isinstance(caffeine_data, Exception):
                logger.warning(f"카페인 가이드 조회 실패: {caffeine_data}")
                caffeine_data = None
            
            if isinstance(fatigue_data, Exception):
                logger.warning(f"피로도 평가 조회 실패: {fatigue_data}")
                fatigue_data = None
            
            if isinstance(schedule_data, Exception):
                logger.warning(f"오늘 일정 조회 실패: {schedule_data}")
                schedule_data = None
            
            # 빠른 액션 생성
            quick_actions = self._generate_quick_actions(
                sleep_data, caffeine_data, fatigue_data, schedule_data
            )
            
            response = DashboardHomeResponse(
                sleepRecommendation=sleep_data,
                caffeineGuidance=caffeine_data,
                fatigueAssessment=fatigue_data,
                todaySchedule=schedule_data,
                quickActions=quick_actions,
                disclaimer="본 서비스는 의료 진단이 아닌 일반적인 수면 권장사항을 제공합니다.",
                generatedAt=TimeUtils.format_datetime(TimeUtils.now_kst()),
                correlationId=correlation_id
            )
            
            logger.info("홈 대시보드 조회 완료", {
                "userId": user_id,
                "hasSleepData": sleep_data is not None,
                "hasCaffeineData": caffeine_data is not None,
                "hasFatigueData": fatigue_data is not None,
                "hasScheduleData": schedule_data is not None
            })
            
            return response
            
        except Exception as e:
            logger.error("홈 대시보드 조회 실패", e, {"userId": user_id})
            
            # 기본 응답 반환
            return DashboardHomeResponse(
                sleepRecommendation=None,
                caffeineGuidance=None,
                fatigueAssessment=None,
                todaySchedule=None,
                quickActions=[],
                disclaimer="본 서비스는 의료 진단이 아닌 일반적인 수면 권장사항을 제공합니다.",
                generatedAt=TimeUtils.format_datetime(TimeUtils.now_kst()),
                correlationId=correlation_id
            )
    
    async def _get_sleep_recommendation(
        self, 
        user_id: str, 
        target_date: str, 
        correlation_id: str
    ) -> Optional[Dict[str, Any]]:
        """수면 권장사항 조회"""
        try:
            request = ShiftToSleepRequest(
                userId=user_id,
                targetDate=target_date,
                sleepDurationHours=8.0,
                bufferMinutes=30,
                forceRefresh=False
            )
            
            result = await self.shift_to_sleep_engine.calculate(request, correlation_id)
            
            if result.result:
                return {
                    "status": "available",
                    "data": result.result,
                    "generatedAt": result.generatedAt
                }
            else:
                return {
                    "status": "unavailable",
                    "reason": result.whyNotShown,
                    "dataMissing": result.dataMissing,
                    "generatedAt": result.generatedAt
                }
                
        except Exception as e:
            logger.error("수면 권장사항 조회 실패", e, {"userId": user_id})
            return None
    
    async def _get_caffeine_guidance(
        self, 
        user_id: str, 
        target_date: str, 
        correlation_id: str
    ) -> Optional[Dict[str, Any]]:
        """카페인 가이드 조회"""
        try:
            request = CaffeineCutoffRequest(
                userId=user_id,
                targetDate=target_date,
                caffeineAmountMg=100.0,
                halfLifeHours=5.0,
                safeThresholdMg=25.0,
                forceRefresh=False
            )
            
            result = await self.caffeine_cutoff_engine.calculate(request, correlation_id)
            
            if result.result:
                return {
                    "status": "available",
                    "data": result.result,
                    "generatedAt": result.generatedAt
                }
            else:
                return {
                    "status": "unavailable",
                    "reason": result.whyNotShown,
                    "dataMissing": result.dataMissing,
                    "generatedAt": result.generatedAt
                }
                
        except Exception as e:
            logger.error("카페인 가이드 조회 실패", e, {"userId": user_id})
            return None
    
    async def _get_fatigue_assessment(
        self, 
        user_id: str, 
        target_date: str, 
        correlation_id: str
    ) -> Optional[Dict[str, Any]]:
        """피로도 평가 조회"""
        try:
            request = FatigueRiskRequest(
                userId=user_id,
                targetDate=target_date,
                includeRecommendations=True,
                includePrediction=False,
                daysToAnalyze=7,
                forceRefresh=False
            )
            
            result = await self.fatigue_risk_engine.calculate(request, correlation_id)
            
            if result.result:
                return {
                    "status": "available",
                    "data": result.result,
                    "generatedAt": result.generatedAt
                }
            else:
                return {
                    "status": "unavailable",
                    "reason": result.whyNotShown,
                    "dataMissing": result.dataMissing,
                    "generatedAt": result.generatedAt
                }
                
        except Exception as e:
            logger.error("피로도 평가 조회 실패", e, {"userId": user_id})
            return None
    
    async def _get_today_schedule(
        self, 
        user_id: str, 
        target_date: str
    ) -> Optional[Dict[str, Any]]:
        """오늘 근무 일정 조회"""
        try:
            schedule = await self.db.get_schedule_by_date(user_id, target_date)
            
            if schedule:
                return {
                    "status": "scheduled",
                    "shiftType": schedule.shiftType.value,
                    "startAt": schedule.startAt,
                    "endAt": schedule.endAt,
                    "commuteMin": schedule.commuteMin,
                    "note": schedule.note,
                    "workDurationHours": TimeUtils.get_work_duration_hours(
                        schedule.startAt, schedule.endAt
                    ) if schedule.startAt and schedule.endAt else None
                }
            else:
                return {
                    "status": "no_schedule",
                    "message": "오늘 등록된 근무 일정이 없습니다"
                }
                
        except Exception as e:
            logger.error("오늘 일정 조회 실패", e, {"userId": user_id})
            return None
    
    def _generate_quick_actions(
        self,
        sleep_data: Optional[Dict[str, Any]],
        caffeine_data: Optional[Dict[str, Any]],
        fatigue_data: Optional[Dict[str, Any]],
        schedule_data: Optional[Dict[str, Any]]
    ) -> List[Dict[str, str]]:
        """빠른 액션 생성"""
        actions = []
        
        # 기본 액션
        actions.append({
            "id": "add_schedule",
            "title": "근무표 입력",
            "description": "오늘 또는 향후 근무 일정을 입력하세요",
            "icon": "calendar",
            "priority": "high" if not schedule_data or schedule_data.get("status") == "no_schedule" else "medium"
        })
        
        # 수면 관련 액션
        if sleep_data and sleep_data.get("status") == "available":
            actions.append({
                "id": "view_sleep_detail",
                "title": "수면 권장사항 상세보기",
                "description": "개인화된 수면 가이드를 확인하세요",
                "icon": "moon",
                "priority": "medium"
            })
        elif sleep_data and sleep_data.get("status") == "unavailable":
            actions.append({
                "id": "complete_profile",
                "title": "프로필 완성",
                "description": "더 정확한 수면 권장사항을 위해 프로필을 완성하세요",
                "icon": "user",
                "priority": "high"
            })
        
        # 피로도 관련 액션
        if fatigue_data and fatigue_data.get("status") == "available":
            fatigue_score = fatigue_data.get("data", {}).get("current", {}).get("score", 0)
            if fatigue_score >= 75:
                actions.append({
                    "id": "fatigue_management",
                    "title": "피로 관리 가이드",
                    "description": "높은 피로도 수준입니다. 관리 방법을 확인하세요",
                    "icon": "alert-triangle",
                    "priority": "high"
                })
        
        # 카페인 관련 액션
        if caffeine_data and caffeine_data.get("status") == "available":
            actions.append({
                "id": "caffeine_timer",
                "title": "카페인 타이머 설정",
                "description": "카페인 마감시간 알림을 설정하세요",
                "icon": "coffee",
                "priority": "low"
            })
        
        # AI 상담 액션
        actions.append({
            "id": "ai_consultation",
            "title": "AI 수면 상담",
            "description": "교대근무 수면 전문가와 상담하세요",
            "icon": "message-circle",
            "priority": "medium"
        })
        
        # 우선순위별 정렬
        priority_order = {"high": 1, "medium": 2, "low": 3}
        actions.sort(key=lambda x: priority_order.get(x["priority"], 4))
        
        return actions[:5]  # 최대 5개만 반환
    
    async def get_jumpstart_checklist(
        self, 
        user_id: str, 
        correlation_id: str
    ) -> JumpstartChecklistResponse:
        """
        점프스타트 체크리스트 조회
        
        Args:
            user_id: 사용자 ID
            correlation_id: 요청 추적 ID
            
        Returns:
            점프스타트 체크리스트 응답
        """
        try:
            logger.info("점프스타트 체크리스트 조회 시작", {"userId": user_id})
            
            # 사용자 체크리스트 상태 조회
            checklist_data = await self._get_user_checklist_data(user_id)
            
            # 기본 체크리스트 항목 생성
            items = await self._generate_checklist_items(user_id, checklist_data)
            
            # 완료율 계산
            total_items = len(items)
            completed_items = sum(1 for item in items if item.completed)
            completion_rate = (completed_items / total_items * 100) if total_items > 0 else 0
            
            # 남은 예상 시간 계산
            remaining_items = [item for item in items if not item.completed]
            estimated_time_remaining = sum(item.estimatedMinutes for item in remaining_items)
            
            # 다음 권장 액션
            next_action = self._get_next_recommended_action(remaining_items)
            
            response = JumpstartChecklistResponse(
                items=items,
                completionRate=round(completion_rate, 1),
                totalItems=total_items,
                completedItems=completed_items,
                estimatedTimeRemaining=estimated_time_remaining,
                nextRecommendedAction=next_action,
                generatedAt=TimeUtils.format_datetime(TimeUtils.now_kst()),
                correlationId=correlation_id
            )
            
            logger.info("점프스타트 체크리스트 조회 완료", {
                "userId": user_id,
                "totalItems": total_items,
                "completedItems": completed_items,
                "completionRate": completion_rate
            })
            
            return response
            
        except Exception as e:
            logger.error("점프스타트 체크리스트 조회 실패", e, {"userId": user_id})
            
            # 기본 응답 반환
            return JumpstartChecklistResponse(
                items=[],
                completionRate=0.0,
                totalItems=0,
                completedItems=0,
                estimatedTimeRemaining=0,
                nextRecommendedAction=None,
                generatedAt=TimeUtils.format_datetime(TimeUtils.now_kst()),
                correlationId=correlation_id
            )
    
    async def _get_user_checklist_data(self, user_id: str) -> Dict[str, Any]:
        """사용자 체크리스트 데이터 조회"""
        try:
            # 데이터베이스에서 체크리스트 상태 조회
            query = """
                SELECT item_id, completed, completed_at
                FROM jumpstart_checklists
                WHERE user_id = $1
            """
            
            rows = await self.db.execute_query(query, user_id)
            
            checklist_status = {}
            for row in rows:
                checklist_status[row["item_id"]] = {
                    "completed": row["completed"],
                    "completed_at": row["completed_at"].isoformat() if row["completed_at"] else None
                }
            
            return checklist_status
            
        except Exception as e:
            logger.error("체크리스트 데이터 조회 실패", e, {"userId": user_id})
            return {}
    
    async def _generate_checklist_items(
        self, 
        user_id: str, 
        checklist_data: Dict[str, Any]
    ) -> List[JumpstartChecklistItem]:
        """체크리스트 항목 생성"""
        
        # 기본 체크리스트 항목 정의
        base_items = [
            {
                "itemId": "profile_setup",
                "title": "프로필 설정 완료",
                "description": "교대 유형, 통근 시간 등 기본 정보를 입력하세요",
                "category": "setup",
                "priority": 1,
                "estimatedMinutes": 3
            },
            {
                "itemId": "first_schedule",
                "title": "첫 근무표 입력",
                "description": "이번 주 근무 일정을 입력하여 개인화된 권장사항을 받으세요",
                "category": "schedule",
                "priority": 1,
                "estimatedMinutes": 5
            },
            {
                "itemId": "sleep_environment",
                "title": "수면 환경 체크",
                "description": "암막 커튼, 소음 차단 등 수면 환경을 점검하세요",
                "category": "environment",
                "priority": 2,
                "estimatedMinutes": 10
            },
            {
                "itemId": "caffeine_awareness",
                "title": "카페인 섭취 패턴 파악",
                "description": "평소 카페인 섭취 시간과 양을 파악하세요",
                "category": "lifestyle",
                "priority": 2,
                "estimatedMinutes": 5
            },
            {
                "itemId": "sleep_schedule_plan",
                "title": "수면 스케줄 계획",
                "description": "근무 패턴에 맞는 수면 시간을 계획하세요",
                "category": "planning",
                "priority": 2,
                "estimatedMinutes": 15
            },
            {
                "itemId": "fatigue_monitoring",
                "title": "피로도 모니터링 시작",
                "description": "일주일간 피로도 변화를 관찰하세요",
                "category": "monitoring",
                "priority": 3,
                "estimatedMinutes": 2
            },
            {
                "itemId": "ai_consultation",
                "title": "AI 상담 체험",
                "description": "교대근무 수면 전문 AI와 상담해보세요",
                "category": "consultation",
                "priority": 3,
                "estimatedMinutes": 10
            },
            {
                "itemId": "habit_formation",
                "title": "수면 습관 형성",
                "description": "일관된 수면 루틴을 2주간 실천하세요",
                "category": "habit",
                "priority": 4,
                "estimatedMinutes": 0  # 지속적인 활동
            }
        ]
        
        items = []
        for base_item in base_items:
            item_id = base_item["itemId"]
            status = checklist_data.get(item_id, {"completed": False, "completed_at": None})
            
            item = JumpstartChecklistItem(
                itemId=item_id,
                title=base_item["title"],
                description=base_item["description"],
                category=base_item["category"],
                priority=base_item["priority"],
                completed=status["completed"],
                completedAt=status["completed_at"],
                estimatedMinutes=base_item["estimatedMinutes"]
            )
            
            items.append(item)
        
        return items
    
    def _get_next_recommended_action(
        self, 
        remaining_items: List[JumpstartChecklistItem]
    ) -> Optional[str]:
        """다음 권장 액션 결정"""
        if not remaining_items:
            return "모든 체크리스트를 완료했습니다! 🎉"
        
        # 우선순위가 가장 높은 미완료 항목
        next_item = min(remaining_items, key=lambda x: x.priority)
        
        return f"{next_item.title} - {next_item.description}"
    
    async def update_checklist_item(
        self, 
        user_id: str, 
        item_id: str, 
        completed: bool,
        correlation_id: str
    ) -> Dict[str, Any]:
        """
        체크리스트 항목 업데이트
        
        Args:
            user_id: 사용자 ID
            item_id: 항목 ID
            completed: 완료 여부
            correlation_id: 요청 추적 ID
            
        Returns:
            업데이트 결과
        """
        try:
            logger.info("체크리스트 항목 업데이트", {
                "userId": user_id,
                "itemId": item_id,
                "completed": completed
            })
            
            # 데이터베이스 업데이트
            if completed:
                query = """
                    INSERT INTO jumpstart_checklists (user_id, item_id, completed, completed_at)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT (user_id, item_id)
                    DO UPDATE SET completed = $3, completed_at = NOW()
                """
            else:
                query = """
                    INSERT INTO jumpstart_checklists (user_id, item_id, completed, completed_at)
                    VALUES ($1, $2, $3, NULL)
                    ON CONFLICT (user_id, item_id)
                    DO UPDATE SET completed = $3, completed_at = NULL
                """
            
            await self.db.execute_query(query, user_id, item_id, completed)
            
            # 완료율 재계산
            updated_checklist = await self.get_jumpstart_checklist(user_id, correlation_id)
            
            result = {
                "success": True,
                "itemId": item_id,
                "completed": completed,
                "completionRate": updated_checklist.completionRate,
                "nextRecommendedAction": updated_checklist.nextRecommendedAction
            }
            
            logger.info("체크리스트 항목 업데이트 완료", {
                "userId": user_id,
                "itemId": item_id,
                "newCompletionRate": updated_checklist.completionRate
            })
            
            return result
            
        except Exception as e:
            logger.error("체크리스트 항목 업데이트 실패", e, {
                "userId": user_id,
                "itemId": item_id
            })
            
            return {
                "success": False,
                "error": str(e),
                "itemId": item_id,
                "completed": completed
            }