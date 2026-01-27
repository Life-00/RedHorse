"""
Fatigue Risk Score 엔진
평균 수면시간, 연속 야간근무, 통근시간을 종합하여 피로도 위험 점수를 계산
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from ..models.common import (
    EngineResponse, FatigueRiskRequest, FatigueRiskResult, 
    UserProfile, ShiftSchedule, ShiftType, CacheKey, EngineType
)
from ..services.cache_service import CacheService
from ..services.database_service import DatabaseService
from ..utils.time_utils import TimeUtils

logger = logging.getLogger(__name__)


class FatigueRiskEngine:
    """Fatigue Risk Score 엔진 클래스"""
    
    # 피로도 점수 가중치 (총 100점)
    SLEEP_DEFICIT_WEIGHT = 40      # 수면 부족 (40점)
    CONSECUTIVE_NIGHTS_WEIGHT = 30  # 연속 야간근무 (30점)
    COMMUTE_WEIGHT = 20            # 통근 피로 (20점)
    ADDITIONAL_RISK_WEIGHT = 10    # 추가 위험 요소 (10점)
    
    # 수면 시간 기준
    OPTIMAL_SLEEP_HOURS = 8.0
    MINIMUM_SLEEP_HOURS = 6.0
    CRITICAL_SLEEP_HOURS = 4.0
    
    # 위험 레벨 임계값
    RISK_THRESHOLDS = {
        "LOW": 25,
        "MEDIUM": 50,
        "HIGH": 75,
        "CRITICAL": 100
    }
    
    def __init__(self, cache_service: CacheService, db_service: DatabaseService):
        self.cache = cache_service
        self.db = db_service
    
    async def calculate(
        self, 
        request: FatigueRiskRequest, 
        correlation_id: str
    ) -> EngineResponse:
        """피로도 위험 점수 계산"""
        try:
            logger.info(f"Fatigue Risk 계산 시작: user_id={request.userId}")
            
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
            
            # 3. 피로도 위험 점수 계산
            fatigue_result = await self._calculate_fatigue_risk(
                data["user_profile"],
                data["recent_schedules"],
                data["sleep_history"],
                request.includePrediction
            )
            
            # 4. 결과 캐시 저장
            await self._cache_result(request, fatigue_result)
            
            logger.info(f"Fatigue Risk 계산 완료: user_id={request.userId}")
            
            return EngineResponse(
                result=fatigue_result.dict(),
                generatedAt=TimeUtils.now_kst(),
                correlationId=correlation_id
            )
            
        except Exception as e:
            logger.error(f"Fatigue Risk 계산 실패: {e}")
            return EngineResponse(
                whyNotShown="CALCULATION_ERROR",
                dataMissing=[],
                generatedAt=TimeUtils.now_kst(),
                correlationId=correlation_id
            )
    
    async def _get_cached_result(self, request: FatigueRiskRequest) -> Optional[Dict[str, Any]]:
        """캐시된 결과 조회"""
        try:
            cache_key = CacheKey(
                engine_type=EngineType.FATIGUE_RISK,
                user_id=request.userId,
                target_date=request.targetDate,
                parameters_hash=self._generate_params_hash(request)
            )
            
            return await self.cache.get(cache_key)
            
        except Exception as e:
            logger.error(f"캐시 조회 실패: {e}")
            return None
    
    async def _cache_result(self, request: FatigueRiskRequest, result: FatigueRiskResult):
        """결과 캐시 저장"""
        try:
            cache_key = CacheKey(
                engine_type=EngineType.FATIGUE_RISK,
                user_id=request.userId,
                target_date=request.targetDate,
                parameters_hash=self._generate_params_hash(request)
            )
            
            await self.cache.set(cache_key, result.dict())
            
        except Exception as e:
            logger.error(f"캐시 저장 실패: {e}")
    
    def _generate_params_hash(self, request: FatigueRiskRequest) -> str:
        """매개변수 해시 생성"""
        import hashlib
        
        params = f"{request.includePrediction}_{request.daysToAnalyze}"
        return hashlib.md5(params.encode()).hexdigest()[:8]
    
    async def _validate_and_collect_data(self, request: FatigueRiskRequest) -> Dict[str, Any]:
        """입력 데이터 검증 및 수집"""
        missing_data = []
        
        # 사용자 프로필 조회
        user_profile = await self.db.get_user_profile(request.userId)
        if not user_profile:
            missing_data.append("USER_PROFILE")
        
        # 대상 날짜 설정
        target_date = request.targetDate or TimeUtils.today_kst()
        days_to_analyze = request.daysToAnalyze or 7
        
        # 최근 근무표 조회
        start_date = TimeUtils.add_days(
            TimeUtils.parse_date(target_date), 
            -days_to_analyze
        )
        end_date = TimeUtils.parse_date(target_date)
        
        recent_schedules = await self.db.get_schedules_by_date_range(
            request.userId,
            TimeUtils.format_date(start_date),
            TimeUtils.format_date(end_date)
        )
        
        if not recent_schedules:
            missing_data.append("SHIFT_SCHEDULE_RANGE")
        
        # 수면 기록 조회 (웨어러블 데이터 - V2에서 구현)
        sleep_history = []  # TODO: V2에서 웨어러블 데이터 연동
        
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
                "recent_schedules": recent_schedules,
                "sleep_history": sleep_history,
                "target_date": target_date
            }
        }
    
    async def _calculate_fatigue_risk(
        self,
        user_profile: UserProfile,
        recent_schedules: List[ShiftSchedule],
        sleep_history: List[Dict[str, Any]],
        include_prediction: bool = False
    ) -> FatigueRiskResult:
        """피로도 위험 점수 계산 메인 로직"""
        
        # 1. 수면 부족 점수 계산
        sleep_deficit_score = self._calculate_sleep_deficit_score(
            recent_schedules, 
            sleep_history
        )
        
        # 2. 연속 야간근무 점수 계산
        consecutive_nights_score = self._calculate_consecutive_nights_score(
            recent_schedules
        )
        
        # 3. 통근 피로 점수 계산
        commute_score = self._calculate_commute_score(
            user_profile.commuteMin,
            recent_schedules
        )
        
        # 4. 추가 위험 요소 점수 계산
        additional_risk_score = self._calculate_additional_risk_score(
            user_profile,
            recent_schedules
        )
        
        # 5. 총 점수 계산
        total_score = min(100, 
            sleep_deficit_score + 
            consecutive_nights_score + 
            commute_score + 
            additional_risk_score
        )
        
        # 6. 위험 레벨 결정
        risk_level = self._determine_risk_level(total_score)
        
        # 7. 권장사항 생성
        recommendations = self._generate_recommendations(
            risk_level,
            sleep_deficit_score,
            consecutive_nights_score,
            commute_score,
            user_profile
        )
        
        # 8. 예측 분석 (선택적)
        prediction = None
        if include_prediction:
            prediction = await self._generate_fatigue_prediction(
                user_profile,
                recent_schedules,
                total_score
            )
        
        return FatigueRiskResult(
            fatigueScore=total_score,
            fatigueLevel=risk_level,
            breakdown={
                "sleepDeficit": sleep_deficit_score,
                "consecutiveNights": consecutive_nights_score,
                "commute": commute_score,
                "additional": additional_risk_score
            },
            recommendations=recommendations,
            riskFactors=self._identify_risk_factors(
                sleep_deficit_score,
                consecutive_nights_score,
                commute_score,
                additional_risk_score
            ),
            prediction=prediction
        )
    
    def _calculate_sleep_deficit_score(
        self,
        recent_schedules: List[ShiftSchedule],
        sleep_history: List[Dict[str, Any]]
    ) -> int:
        """수면 부족 점수 계산 (0-40점)"""
        
        if sleep_history:
            # 웨어러블 데이터가 있는 경우 실제 수면 시간 사용
            total_sleep = sum(record.get("sleepHours", 0) for record in sleep_history)
            days = len(sleep_history)
        else:
            # 근무표 기반 수면 시간 추정
            total_sleep = 0
            days = 0
            
            for schedule in recent_schedules:
                if schedule.shiftType == ShiftType.OFF:
                    # 휴무일: 8시간 수면 가정
                    total_sleep += 8
                else:
                    # 근무일: 근무 시간에 따른 수면 시간 추정
                    work_hours = self._calculate_work_hours(schedule)
                    estimated_sleep = max(4, 16 - work_hours - 2)  # 최소 4시간
                    total_sleep += estimated_sleep
                days += 1
        
        if days == 0:
            return 0
        
        average_sleep = total_sleep / days
        
        # 수면 부족 점수 계산
        if average_sleep >= self.OPTIMAL_SLEEP_HOURS:
            return 0
        elif average_sleep >= 7:
            return 10
        elif average_sleep >= self.MINIMUM_SLEEP_HOURS:
            return 20
        elif average_sleep >= 5:
            return 30
        else:
            return 40
    
    def _calculate_consecutive_nights_score(
        self,
        recent_schedules: List[ShiftSchedule]
    ) -> int:
        """연속 야간근무 점수 계산 (0-30점)"""
        
        # 최근 일정을 날짜순으로 정렬
        sorted_schedules = sorted(recent_schedules, key=lambda x: x.date)
        
        max_consecutive_nights = 0
        current_consecutive = 0
        
        for schedule in sorted_schedules:
            if schedule.shiftType == ShiftType.NIGHT:
                current_consecutive += 1
                max_consecutive_nights = max(max_consecutive_nights, current_consecutive)
            else:
                current_consecutive = 0
        
        # 연속 야간근무 점수 계산
        if max_consecutive_nights <= 1:
            return 0
        elif max_consecutive_nights <= 2:
            return 10
        elif max_consecutive_nights <= 3:
            return 20
        else:
            return 30
    
    def _calculate_commute_score(
        self,
        commute_min: int,
        recent_schedules: List[ShiftSchedule]
    ) -> int:
        """통근 피로 점수 계산 (0-20점)"""
        
        # 기본 통근 점수
        base_score = min(15, (commute_min // 30) * 5)
        
        # 야간근무 시 통근 가중치 적용
        night_shifts = sum(1 for s in recent_schedules if s.shiftType == ShiftType.NIGHT)
        total_shifts = len([s for s in recent_schedules if s.shiftType != ShiftType.OFF])
        
        if total_shifts > 0:
            night_ratio = night_shifts / total_shifts
            if night_ratio > 0.5:  # 야간근무 비율이 50% 이상
                base_score += 5
        
        return min(20, base_score)
    
    def _calculate_additional_risk_score(
        self,
        user_profile: UserProfile,
        recent_schedules: List[ShiftSchedule]
    ) -> int:
        """추가 위험 요소 점수 계산 (0-10점)"""
        
        additional_score = 0
        
        # 불규칙 교대근무 가중치
        if user_profile.shiftType == "IRREGULAR":
            additional_score += 3
        
        # 근무 패턴 불규칙성 분석
        shift_types = [s.shiftType for s in recent_schedules if s.shiftType != ShiftType.OFF]
        unique_shifts = len(set(shift_types))
        
        if unique_shifts >= 3:  # 3가지 이상 교대 패턴
            additional_score += 2
        
        # 주말 근무 빈도
        weekend_work_count = 0
        for schedule in recent_schedules:
            date_obj = TimeUtils.parse_date(schedule.date)
            if date_obj.weekday() >= 5 and schedule.shiftType != ShiftType.OFF:  # 토, 일
                weekend_work_count += 1
        
        if weekend_work_count >= 2:
            additional_score += 2
        
        # 장시간 근무 빈도
        long_shift_count = 0
        for schedule in recent_schedules:
            if schedule.shiftType != ShiftType.OFF:
                work_hours = self._calculate_work_hours(schedule)
                if work_hours > 10:
                    long_shift_count += 1
        
        if long_shift_count >= 2:
            additional_score += 3
        
        return min(10, additional_score)
    
    def _calculate_work_hours(self, schedule: ShiftSchedule) -> float:
        """근무 시간 계산"""
        if not schedule.startAt or not schedule.endAt:
            return 8.0  # 기본값
        
        start_time = TimeUtils.parse_datetime(schedule.startAt)
        end_time = TimeUtils.parse_datetime(schedule.endAt)
        
        work_hours = TimeUtils.get_hours_between(start_time, end_time)
        
        # 야간 근무로 다음날로 넘어가는 경우 처리
        if work_hours < 0:
            work_hours += 24
        
        return work_hours
    
    def _determine_risk_level(self, total_score: int) -> str:
        """위험 레벨 결정"""
        if total_score <= self.RISK_THRESHOLDS["LOW"]:
            return "LOW"
        elif total_score <= self.RISK_THRESHOLDS["MEDIUM"]:
            return "MEDIUM"
        elif total_score <= self.RISK_THRESHOLDS["HIGH"]:
            return "HIGH"
        else:
            return "CRITICAL"
    
    def _generate_recommendations(
        self,
        risk_level: str,
        sleep_deficit_score: int,
        consecutive_nights_score: int,
        commute_score: int,
        user_profile: UserProfile
    ) -> List[str]:
        """위험도별 권장사항 생성"""
        
        recommendations = []
        
        # 위험 레벨별 기본 권장사항
        if risk_level == "CRITICAL":
            recommendations.append("⚠️ 피로도가 매우 높습니다. 즉시 휴식을 취하고 안전에 주의하세요")
            recommendations.append("가능하다면 당분간 야간근무나 연장근무를 피하세요")
        elif risk_level == "HIGH":
            recommendations.append("피로도가 높은 상태입니다. 충분한 휴식과 수면을 우선시하세요")
        elif risk_level == "MEDIUM":
            recommendations.append("피로 관리에 주의가 필요합니다")
        else:
            recommendations.append("현재 피로도는 양호한 수준입니다")
        
        # 수면 부족 관련 권장사항
        if sleep_deficit_score >= 30:
            recommendations.append("수면 시간을 늘리고 수면 품질 개선에 집중하세요")
            recommendations.append("낮잠을 20-30분 정도 활용해보세요")
        elif sleep_deficit_score >= 20:
            recommendations.append("규칙적인 수면 패턴을 유지하려 노력하세요")
        
        # 연속 야간근무 관련 권장사항
        if consecutive_nights_score >= 20:
            recommendations.append("연속 야간근무로 인한 피로가 누적되었습니다")
            recommendations.append("야간근무 후에는 반드시 충분한 회복 시간을 가지세요")
        
        # 통근 관련 권장사항
        if commute_score >= 15:
            recommendations.append("긴 통근 시간이 피로를 가중시키고 있습니다")
            recommendations.append("대중교통 이용 시 이동 중 휴식을 취하세요")
        
        # 교대근무 유형별 권장사항
        if user_profile.shiftType == "IRREGULAR":
            recommendations.append("불규칙한 근무 패턴으로 인해 생체리듬 관리가 중요합니다")
        elif user_profile.shiftType == "THREE_SHIFT":
            recommendations.append("3교대 근무 시에는 교대 간 충분한 적응 시간을 확보하세요")
        
        return recommendations
    
    def _identify_risk_factors(
        self,
        sleep_deficit_score: int,
        consecutive_nights_score: int,
        commute_score: int,
        additional_risk_score: int
    ) -> List[Dict[str, Any]]:
        """위험 요소 식별"""
        
        risk_factors = []
        
        if sleep_deficit_score >= 20:
            risk_factors.append({
                "factor": "sleep_deficit",
                "severity": "high" if sleep_deficit_score >= 30 else "medium",
                "score": sleep_deficit_score,
                "description": "수면 부족으로 인한 피로 누적"
            })
        
        if consecutive_nights_score >= 10:
            risk_factors.append({
                "factor": "consecutive_nights",
                "severity": "high" if consecutive_nights_score >= 20 else "medium",
                "score": consecutive_nights_score,
                "description": "연속 야간근무로 인한 생체리듬 교란"
            })
        
        if commute_score >= 10:
            risk_factors.append({
                "factor": "commute_fatigue",
                "severity": "high" if commute_score >= 15 else "medium",
                "score": commute_score,
                "description": "장거리 통근으로 인한 추가 피로"
            })
        
        if additional_risk_score >= 5:
            risk_factors.append({
                "factor": "additional_risks",
                "severity": "medium",
                "score": additional_risk_score,
                "description": "불규칙한 근무 패턴 및 기타 위험 요소"
            })
        
        return risk_factors
    
    async def _generate_fatigue_prediction(
        self,
        user_profile: UserProfile,
        recent_schedules: List[ShiftSchedule],
        current_score: int
    ) -> Dict[str, Any]:
        """피로도 예측 분석 (향후 3일)"""
        
        # TODO: 향후 근무 일정을 기반으로 피로도 변화 예측
        # 현재는 기본적인 예측만 제공
        
        prediction_days = []
        base_score = current_score
        
        for i in range(1, 4):  # 향후 3일
            future_date = TimeUtils.add_days(TimeUtils.now_kst(), i)
            
            # 간단한 예측 로직 (실제로는 더 복잡한 모델 필요)
            if base_score > 75:
                # 높은 피로도는 천천히 회복
                predicted_score = max(50, base_score - (i * 5))
            elif base_score > 50:
                # 중간 피로도는 보통 속도로 회복
                predicted_score = max(25, base_score - (i * 8))
            else:
                # 낮은 피로도는 유지 또는 약간 증가
                predicted_score = min(50, base_score + (i * 2))
            
            prediction_days.append({
                "date": TimeUtils.format_date(future_date),
                "predictedScore": predicted_score,
                "predictedLevel": self._determine_risk_level(predicted_score),
                "confidence": "medium"  # 예측 신뢰도
            })
        
        return {
            "predictionDays": prediction_days,
            "trend": "improving" if prediction_days[-1]["predictedScore"] < current_score else "stable",
            "recommendations": [
                "예측은 현재 패턴이 지속된다고 가정한 결과입니다",
                "실제 근무 일정과 수면 패턴에 따라 달라질 수 있습니다"
            ]
        }