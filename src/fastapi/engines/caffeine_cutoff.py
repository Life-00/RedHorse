"""
Caffeine Cutoff 엔진
카페인의 반감기를 고려하여 수면에 영향을 주지 않는 카페인 마감시간을 계산
"""

import logging
import math
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from ..models.common import (
    EngineResponse, CaffeineCutoffRequest, CaffeineCutoffResult, 
    UserProfile, ShiftSchedule, CacheKey, EngineType
)
from ..services.cache_service import CacheService
from ..services.database_service import DatabaseService
from ..utils.time_utils import TimeUtils

logger = logging.getLogger(__name__)


class CaffeineCutoffEngine:
    """Caffeine Cutoff 엔진 클래스"""
    
    # 카페인 관련 상수
    DEFAULT_HALF_LIFE_HOURS = 5.0  # 평균 반감기 5시간
    SLEEP_INTERFERENCE_THRESHOLD_MG = 25.0  # 수면 방해 임계값 25mg
    TYPICAL_COFFEE_CAFFEINE_MG = 100.0  # 일반 커피 1잔 카페인 함량
    
    # 카페인 함량 데이터베이스 (mg)
    CAFFEINE_CONTENT = {
        "coffee_regular": 100,      # 일반 커피 (240ml)
        "coffee_espresso": 63,      # 에스프레소 (30ml)
        "coffee_americano": 150,    # 아메리카노 (360ml)
        "coffee_latte": 63,         # 라떼 (360ml)
        "tea_black": 47,            # 홍차 (240ml)
        "tea_green": 28,            # 녹차 (240ml)
        "energy_drink": 80,         # 에너지 드링크 (250ml)
        "cola": 34,                 # 콜라 (355ml)
        "chocolate_dark": 12,       # 다크 초콜릿 (28g)
        "pre_workout": 200          # 프리워크아웃 보충제
    }
    
    def __init__(self, cache_service: CacheService, db_service: DatabaseService):
        self.cache = cache_service
        self.db = db_service
    
    async def calculate(
        self, 
        request: CaffeineCutoffRequest, 
        correlation_id: str
    ) -> EngineResponse:
        """카페인 마감시간 계산"""
        try:
            logger.info(f"Caffeine Cutoff 계산 시작: user_id={request.userId}")
            
            # 1. 캐시 확인
            if not request.forceRefresh:
                cached_result = await self._get_cached_result(request)
                if cached_result:
                    logger.info(f"캐시에서 결과 반환: user_id={request.userId}")
                    return EngineResponse(
                        result=cached_result,
                        generatedAt=TimeUtils.now_kst(),
                        correlationId=correlation_id
                    )
            
            # 2. 입력 데이터 수집 및 검증
            validation_result = await self._validate_and_collect_data(request)
            if not validation_result["is_valid"]:
                return EngineResponse(
                    whyNotShown=validation_result["reason"],
                    dataMissing=validation_result["missing_data"],
                    generatedAt=TimeUtils.now_kst(),
                    correlationId=correlation_id
                )
            
            data = validation_result["data"]
            
            # 3. 카페인 마감시간 계산
            caffeine_result = await self._calculate_caffeine_cutoff(
                data["user_profile"],
                data["target_sleep_time"],
                request.caffeineAmountMg or self.TYPICAL_COFFEE_CAFFEINE_MG,
                request.halfLifeHours or self.DEFAULT_HALF_LIFE_HOURS,
                request.safeThresholdMg or self.SLEEP_INTERFERENCE_THRESHOLD_MG
            )
            
            # 4. 결과 캐시 저장
            await self._cache_result(request, caffeine_result)
            
            logger.info(f"Caffeine Cutoff 계산 완료: user_id={request.userId}")
            
            return EngineResponse(
                result=caffeine_result.dict(),
                generatedAt=TimeUtils.now_kst(),
                correlationId=correlation_id
            )
            
        except Exception as e:
            logger.error(f"Caffeine Cutoff 계산 실패: {e}")
            return EngineResponse(
                whyNotShown="CALCULATION_ERROR",
                dataMissing=[],
                generatedAt=TimeUtils.now_kst(),
                correlationId=correlation_id
            )
    
    async def _get_cached_result(self, request: CaffeineCutoffRequest) -> Optional[Dict[str, Any]]:
        """캐시된 결과 조회"""
        try:
            cache_key = CacheKey(
                engine_type=EngineType.CAFFEINE_CUTOFF,
                user_id=request.userId,
                target_date=request.targetDate,
                parameters_hash=self._generate_params_hash(request)
            )
            
            return await self.cache.get(cache_key)
            
        except Exception as e:
            logger.error(f"캐시 조회 실패: {e}")
            return None
    
    async def _cache_result(self, request: CaffeineCutoffRequest, result: CaffeineCutoffResult):
        """결과 캐시 저장"""
        try:
            cache_key = CacheKey(
                engine_type=EngineType.CAFFEINE_CUTOFF,
                user_id=request.userId,
                target_date=request.targetDate,
                parameters_hash=self._generate_params_hash(request)
            )
            
            await self.cache.set(cache_key, result.dict())
            
        except Exception as e:
            logger.error(f"캐시 저장 실패: {e}")
    
    def _generate_params_hash(self, request: CaffeineCutoffRequest) -> str:
        """매개변수 해시 생성"""
        import hashlib
        
        params = f"{request.targetSleepTime}_{request.caffeineAmountMg}_{request.halfLifeHours}_{request.safeThresholdMg}"
        return hashlib.md5(params.encode()).hexdigest()[:8]
    
    async def _validate_and_collect_data(self, request: CaffeineCutoffRequest) -> Dict[str, Any]:
        """입력 데이터 검증 및 수집"""
        missing_data = []
        
        # 사용자 프로필 조회
        user_profile = await self.db.get_user_profile(request.userId)
        if not user_profile:
            missing_data.append("USER_PROFILE")
        
        # 목표 수면 시간 설정
        target_sleep_time = None
        if request.targetSleepTime:
            try:
                target_sleep_time = TimeUtils.parse_datetime(request.targetSleepTime)
            except ValueError:
                missing_data.append("INVALID_SLEEP_TIME")
        else:
            # 목표 수면 시간이 없으면 근무표에서 추정
            target_date = request.targetDate or TimeUtils.today_kst()
            schedule = await self.db.get_schedule_by_date(request.userId, target_date)
            
            if schedule and schedule.endAt:
                # 근무 종료 후 통근 시간 + 1시간 후를 수면 시작 시간으로 추정
                work_end = TimeUtils.parse_datetime(schedule.endAt)
                commute_buffer = timedelta(minutes=user_profile.commuteMin + 60)
                target_sleep_time = work_end + commute_buffer
            else:
                missing_data.append("TARGET_SLEEP_TIME")
        
        # 검증 결과
        if missing_data:
            return {
                "is_valid": False,
                "reason": "INSUFFICIENT_DATA",
                "missing_data": missing_data,
                "data": None
            }
        
        return {
            "is_valid": True,
            "reason": None,
            "missing_data": [],
            "data": {
                "user_profile": user_profile,
                "target_sleep_time": target_sleep_time
            }
        }
    
    async def _calculate_caffeine_cutoff(
        self,
        user_profile: UserProfile,
        target_sleep_time: datetime,
        caffeine_amount_mg: float,
        half_life_hours: float,
        safe_threshold_mg: float
    ) -> CaffeineCutoffResult:
        """카페인 마감시간 계산 메인 로직"""
        
        # 1. 카페인이 안전 수준까지 떨어지는 시간 계산
        hours_needed = self._calculate_elimination_time(
            caffeine_amount_mg, 
            safe_threshold_mg, 
            half_life_hours
        )
        
        # 2. 카페인 마감시간 계산
        cutoff_time = target_sleep_time - timedelta(hours=hours_needed)
        
        # 3. 반감기 타임라인 생성
        timeline = self._generate_caffeine_timeline(
            caffeine_amount_mg,
            half_life_hours,
            safe_threshold_mg,
            cutoff_time
        )
        
        # 4. 개인화된 권장사항 생성
        recommendations = self._generate_recommendations(
            cutoff_time,
            target_sleep_time,
            caffeine_amount_mg,
            user_profile
        )
        
        # 5. 카페인 종류별 마감시간 계산
        beverage_cutoffs = self._calculate_beverage_cutoffs(
            target_sleep_time,
            half_life_hours,
            safe_threshold_mg
        )
        
        return CaffeineCutoffResult(
            caffeineDeadline=TimeUtils.format_datetime(cutoff_time),
            hoursBeforeSleep=round(hours_needed, 1),
            targetSleepTime=TimeUtils.format_datetime(target_sleep_time),
            halfLifeInfo={
                "halfLifeHours": half_life_hours,
                "timeline": timeline,
                "safeThreshold": safe_threshold_mg,
                "initialAmount": caffeine_amount_mg
            },
            recommendations=recommendations,
            beverageCutoffs=beverage_cutoffs
        )
    
    def _calculate_elimination_time(
        self, 
        initial_amount: float, 
        threshold: float, 
        half_life: float
    ) -> float:
        """카페인 제거 시간 계산"""
        if initial_amount <= threshold:
            return 0.0
        
        # C(t) = C0 * (1/2)^(t/half_life)
        # threshold = initial_amount * (1/2)^(t/half_life)
        # t = half_life * log2(initial_amount / threshold)
        
        elimination_time = half_life * math.log2(initial_amount / threshold)
        return max(0.0, elimination_time)
    
    def _generate_caffeine_timeline(
        self,
        initial_amount: float,
        half_life: float,
        threshold: float,
        cutoff_time: datetime
    ) -> List[Dict[str, Any]]:
        """카페인 농도 변화 타임라인 생성"""
        timeline = []
        current_time = cutoff_time
        current_amount = initial_amount
        hours_elapsed = 0
        
        # 초기 상태
        timeline.append({
            "time": TimeUtils.format_datetime(current_time),
            "hoursElapsed": 0,
            "caffeineAmount": round(current_amount, 1),
            "percentage": 100.0,
            "status": "peak"
        })
        
        # 반감기별 변화 추적 (최대 12시간)
        while current_amount > threshold and len(timeline) < 12:
            hours_elapsed += half_life
            current_time += timedelta(hours=half_life)
            current_amount /= 2
            
            percentage = (current_amount / initial_amount) * 100
            status = "safe" if current_amount <= threshold else "active"
            
            timeline.append({
                "time": TimeUtils.format_datetime(current_time),
                "hoursElapsed": round(hours_elapsed, 1),
                "caffeineAmount": round(current_amount, 1),
                "percentage": round(percentage, 1),
                "status": status
            })
        
        return timeline
    
    def _generate_recommendations(
        self,
        cutoff_time: datetime,
        target_sleep_time: datetime,
        caffeine_amount: float,
        user_profile: UserProfile
    ) -> List[str]:
        """개인화된 권장사항 생성"""
        recommendations = []
        
        # 기본 권장사항
        cutoff_hour = cutoff_time.hour
        if cutoff_hour < 12:
            recommendations.append(f"오전 {cutoff_hour}시 이후로는 카페인 섭취를 피하세요")
        else:
            recommendations.append(f"오후 {cutoff_hour}시 이후로는 카페인 섭취를 피하세요")
        
        # 카페인 양에 따른 권장사항
        if caffeine_amount > 200:
            recommendations.append("카페인 섭취량이 많습니다. 점진적으로 줄여보세요")
        elif caffeine_amount > 400:
            recommendations.append("하루 카페인 섭취량이 권장량(400mg)을 초과합니다")
        
        # 교대근무 특화 권장사항
        if user_profile.shiftType in ["THREE_SHIFT", "IRREGULAR"]:
            recommendations.append("교대근무 시에는 카페인 의존도를 줄이는 것이 중요합니다")
            recommendations.append("근무 시작 전 30분에 소량의 카페인을 섭취하는 것이 효과적입니다")
        
        # 야간근무 권장사항
        sleep_hour = target_sleep_time.hour
        if 6 <= sleep_hour <= 14:  # 낮잠 시간대
            recommendations.append("낮잠 전에는 카페인 대신 짧은 명상이나 스트레칭을 권장합니다")
        
        # 대안 제안
        recommendations.append("카페인 대신 충분한 수분 섭취와 자연광 노출을 늘려보세요")
        
        return recommendations
    
    def _calculate_beverage_cutoffs(
        self,
        target_sleep_time: datetime,
        half_life: float,
        threshold: float
    ) -> Dict[str, str]:
        """음료별 마감시간 계산"""
        beverage_cutoffs = {}
        
        for beverage, caffeine_mg in self.CAFFEINE_CONTENT.items():
            hours_needed = self._calculate_elimination_time(
                caffeine_mg, 
                threshold, 
                half_life
            )
            cutoff_time = target_sleep_time - timedelta(hours=hours_needed)
            
            beverage_cutoffs[beverage] = TimeUtils.format_datetime(cutoff_time)
        
        return beverage_cutoffs
    
    def get_caffeine_content_info(self) -> Dict[str, Dict[str, Any]]:
        """카페인 함량 정보 제공"""
        caffeine_info = {}
        
        for beverage, caffeine_mg in self.CAFFEINE_CONTENT.items():
            # 음료명을 한국어로 변환
            korean_names = {
                "coffee_regular": "일반 커피",
                "coffee_espresso": "에스프레소",
                "coffee_americano": "아메리카노",
                "coffee_latte": "라떼",
                "tea_black": "홍차",
                "tea_green": "녹차",
                "energy_drink": "에너지 드링크",
                "cola": "콜라",
                "chocolate_dark": "다크 초콜릿",
                "pre_workout": "프리워크아웃"
            }
            
            caffeine_info[beverage] = {
                "name": korean_names.get(beverage, beverage),
                "caffeineMg": caffeine_mg,
                "category": self._get_beverage_category(beverage)
            }
        
        return caffeine_info
    
    def _get_beverage_category(self, beverage: str) -> str:
        """음료 카테고리 분류"""
        if beverage.startswith("coffee_"):
            return "coffee"
        elif beverage.startswith("tea_"):
            return "tea"
        elif beverage in ["energy_drink", "pre_workout"]:
            return "supplement"
        elif beverage == "cola":
            return "soft_drink"
        elif beverage.startswith("chocolate_"):
            return "food"
        else:
            return "other"
    
    def calculate_optimal_caffeine_timing(
        self,
        work_start: datetime,
        work_duration_hours: float,
        target_alertness_hours: List[float]
    ) -> List[Dict[str, Any]]:
        """최적 카페인 섭취 타이밍 계산"""
        optimal_timings = []
        
        for alertness_hour in target_alertness_hours:
            # 각성 효과가 필요한 시점에서 역산
            target_time = work_start + timedelta(hours=alertness_hour)
            
            # 카페인 효과 시작까지 30분, 최대 효과까지 1시간 고려
            optimal_intake_time = target_time - timedelta(minutes=30)
            
            optimal_timings.append({
                "intakeTime": TimeUtils.format_datetime(optimal_intake_time),
                "targetAlertness": TimeUtils.format_datetime(target_time),
                "recommendedAmount": "50-100mg",  # 적정량
                "notes": f"근무 시작 후 {alertness_hour}시간째 각성 효과"
            })
        
        return optimal_timings