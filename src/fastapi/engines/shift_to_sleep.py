"""
Shift-to-Sleep 엔진
교대근무자의 근무 패턴을 분석하여 최적의 수면창(메인 수면 + 파워냅)을 계산
"""

import logging
from datetime import datetime, timedelta, time
from typing import Optional, Dict, Any, List, Tuple
from ..models.common import (
    EngineResponse, ShiftToSleepRequest, ShiftToSleepResult, 
    SleepWindow, UserProfile, ShiftSchedule, ShiftType, CacheKey, EngineType
)
from ..services.cache_service import CacheService
from ..services.database_service import DatabaseService
from ..utils.time_utils import TimeUtils
from ..utils.sleep_calculator import SleepCalculator

logger = logging.getLogger(__name__)


class ShiftToSleepEngine:
    """Shift-to-Sleep 엔진 클래스"""
    
    def __init__(self, cache_service: CacheService, db_service: DatabaseService):
        self.cache = cache_service
        self.db = db_service
        self.sleep_calculator = SleepCalculator()
    
    async def calculate(
        self, 
        request: ShiftToSleepRequest, 
        correlation_id: str
    ) -> EngineResponse:
        """최적 수면창 계산"""
        try:
            logger.info(f"Shift-to-Sleep 계산 시작: user_id={request.userId}")
            
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
            
            # 3. 수면창 계산
            sleep_result = await self._calculate_sleep_windows(
                data["user_profile"],
                data["current_schedule"],
                data["upcoming_schedules"],
                request.sleepDurationHours or 8.0,
                request.bufferMinutes or 30
            )
            
            # 4. 결과 캐시 저장
            await self._cache_result(request, sleep_result)
            
            logger.info(f"Shift-to-Sleep 계산 완료: user_id={request.userId}")
            
            return EngineResponse(
                result=sleep_result.dict(),
                generatedAt=TimeUtils.now_kst(),
                correlationId=correlation_id
            )
            
        except Exception as e:
            logger.error(f"Shift-to-Sleep 계산 실패: {e}")
            return EngineResponse(
                whyNotShown="CALCULATION_ERROR",
                dataMissing=[],
                generatedAt=TimeUtils.now_kst(),
                correlationId=correlation_id
            )
    
    async def _get_cached_result(self, request: ShiftToSleepRequest) -> Optional[Dict[str, Any]]:
        """캐시된 결과 조회"""
        try:
            cache_key = CacheKey(
                engine_type=EngineType.SHIFT_TO_SLEEP,
                user_id=request.userId,
                target_date=request.targetDate,
                parameters_hash=self._generate_params_hash(request)
            )
            
            return await self.cache.get(cache_key)
            
        except Exception as e:
            logger.error(f"캐시 조회 실패: {e}")
            return None
    
    async def _cache_result(self, request: ShiftToSleepRequest, result: ShiftToSleepResult):
        """결과 캐시 저장"""
        try:
            cache_key = CacheKey(
                engine_type=EngineType.SHIFT_TO_SLEEP,
                user_id=request.userId,
                target_date=request.targetDate,
                parameters_hash=self._generate_params_hash(request)
            )
            
            await self.cache.set(cache_key, result.dict())
            
        except Exception as e:
            logger.error(f"캐시 저장 실패: {e}")
    
    def _generate_params_hash(self, request: ShiftToSleepRequest) -> str:
        """매개변수 해시 생성"""
        import hashlib
        
        params = f"{request.sleepDurationHours}_{request.bufferMinutes}"
        return hashlib.md5(params.encode()).hexdigest()[:8]
    
    async def _validate_and_collect_data(self, request: ShiftToSleepRequest) -> Dict[str, Any]:
        """입력 데이터 검증 및 수집"""
        missing_data = []
        
        # 사용자 프로필 조회
        user_profile = await self.db.get_user_profile(request.userId)
        if not user_profile:
            missing_data.append("USER_PROFILE")
        
        # 대상 날짜 설정 (기본값: 오늘)
        target_date = request.targetDate or TimeUtils.today_kst()
        
        # 현재 근무표 조회
        current_schedule = await self.db.get_schedule_by_date(request.userId, target_date)
        if not current_schedule or current_schedule.shiftType == ShiftType.OFF:
            missing_data.append("SHIFT_SCHEDULE_TODAY")
        
        # 향후 근무표 조회 (다음 3일)
        upcoming_schedules = await self.db.get_upcoming_schedules(request.userId, 3)
        
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
                "current_schedule": current_schedule,
                "upcoming_schedules": upcoming_schedules,
                "target_date": target_date
            }
        }
    
    async def _calculate_sleep_windows(
        self,
        user_profile: UserProfile,
        current_schedule: ShiftSchedule,
        upcoming_schedules: List[ShiftSchedule],
        sleep_duration_hours: float,
        buffer_minutes: int
    ) -> ShiftToSleepResult:
        """수면창 계산 메인 로직"""
        
        # 1. 근무 패턴 분석
        work_pattern = self._analyze_work_pattern(current_schedule, upcoming_schedules)
        
        # 2. 메인 수면창 계산
        main_sleep = self._calculate_main_sleep_window(
            current_schedule,
            user_profile.commuteMin,
            sleep_duration_hours,
            buffer_minutes,
            work_pattern
        )
        
        # 3. 파워냅 권장사항 계산
        nap_sleep = self._calculate_nap_recommendation(
            current_schedule,
            main_sleep,
            work_pattern
        )
        
        # 4. 권장사항 생성
        recommendations = self._generate_recommendations(
            current_schedule,
            main_sleep,
            nap_sleep,
            work_pattern
        )
        
        # 5. 충돌 경고 확인
        conflict_warnings = self._check_conflicts(
            main_sleep,
            nap_sleep,
            upcoming_schedules,
            user_profile.commuteMin
        )
        
        return ShiftToSleepResult(
            sleepMain=main_sleep,
            sleepNap=nap_sleep,
            recommendations=recommendations,
            conflictWarnings=conflict_warnings
        )
    
    def _analyze_work_pattern(
        self, 
        current_schedule: ShiftSchedule, 
        upcoming_schedules: List[ShiftSchedule]
    ) -> Dict[str, Any]:
        """근무 패턴 분석"""
        
        # 연속 근무 일수 계산
        consecutive_work_days = 1  # 현재 근무일 포함
        for schedule in upcoming_schedules:
            if schedule.shiftType != ShiftType.OFF:
                consecutive_work_days += 1
            else:
                break
        
        # 야간 근무 여부 판단
        is_night_shift = current_schedule.shiftType == ShiftType.NIGHT
        
        # 다음 근무와의 간격 계산
        next_work_gap_hours = None
        if upcoming_schedules:
            next_schedule = upcoming_schedules[0]
            if next_schedule.shiftType != ShiftType.OFF and next_schedule.startAt:
                current_end = TimeUtils.parse_datetime(current_schedule.endAt)
                next_start = TimeUtils.parse_datetime(next_schedule.startAt)
                next_work_gap_hours = (next_start - current_end).total_seconds() / 3600
        
        return {
            "consecutive_work_days": consecutive_work_days,
            "is_night_shift": is_night_shift,
            "next_work_gap_hours": next_work_gap_hours,
            "shift_type": current_schedule.shiftType,
            "has_upcoming_work": len([s for s in upcoming_schedules if s.shiftType != ShiftType.OFF]) > 0
        }
    
    def _calculate_main_sleep_window(
        self,
        current_schedule: ShiftSchedule,
        commute_min: int,
        sleep_duration_hours: float,
        buffer_minutes: int,
        work_pattern: Dict[str, Any]
    ) -> SleepWindow:
        """메인 수면창 계산"""
        
        work_end = TimeUtils.parse_datetime(current_schedule.endAt)
        work_start = TimeUtils.parse_datetime(current_schedule.startAt)
        
        # 퇴근 후 여유 시간 (통근 + 버퍼)
        post_work_buffer = timedelta(minutes=commute_min + buffer_minutes)
        
        # 출근 전 여유 시간 (통근 + 준비 시간)
        pre_work_buffer = timedelta(minutes=commute_min + 60)  # 1시간 준비 시간
        
        # 기본 수면 시작 시간 (퇴근 후)
        sleep_start = work_end + post_work_buffer
        
        # 수면 종료 시간
        sleep_duration = timedelta(hours=sleep_duration_hours)
        sleep_end = sleep_start + sleep_duration
        
        # 야간 근무의 경우 수면 시간 조정
        if work_pattern["is_night_shift"]:
            # 야간 근무 후에는 오전에 수면
            sleep_start = work_end + post_work_buffer
            sleep_end = sleep_start + sleep_duration
        else:
            # 주간 근무의 경우 다음 날 출근 시간을 고려
            if work_pattern["next_work_gap_hours"] and work_pattern["next_work_gap_hours"] < 16:
                # 다음 근무까지 시간이 부족한 경우
                max_sleep_end = work_start - pre_work_buffer + timedelta(days=1)
                if sleep_end > max_sleep_end:
                    sleep_end = max_sleep_end
                    sleep_start = sleep_end - sleep_duration
        
        # 수면 품질 평가
        quality = self._evaluate_sleep_quality(
            sleep_start, 
            sleep_end, 
            work_pattern,
            current_schedule.shiftType
        )
        
        return SleepWindow(
            startAt=TimeUtils.format_datetime(sleep_start),
            endAt=TimeUtils.format_datetime(sleep_end),
            durationHours=round(sleep_duration.total_seconds() / 3600, 1),
            quality=quality
        )
    
    def _calculate_nap_recommendation(
        self,
        current_schedule: ShiftSchedule,
        main_sleep: SleepWindow,
        work_pattern: Dict[str, Any]
    ) -> Optional[SleepWindow]:
        """파워냅 권장사항 계산"""
        
        # 연속 근무 3일 이상이거나 야간 근무인 경우 파워냅 권장
        if work_pattern["consecutive_work_days"] < 3 and not work_pattern["is_night_shift"]:
            return None
        
        work_start = TimeUtils.parse_datetime(current_schedule.startAt)
        work_end = TimeUtils.parse_datetime(current_schedule.endAt)
        main_sleep_end = TimeUtils.parse_datetime(main_sleep.endAt)
        
        # 메인 수면 종료 후 4-6시간 후에 20-30분 파워냅
        nap_start = main_sleep_end + timedelta(hours=5)
        nap_duration = timedelta(minutes=25)  # 25분 파워냅
        nap_end = nap_start + nap_duration
        
        # 근무 시간과 겹치지 않는지 확인
        if (nap_start >= work_start and nap_start < work_end) or \
           (nap_end > work_start and nap_end <= work_end):
            return None
        
        return SleepWindow(
            startAt=TimeUtils.format_datetime(nap_start),
            endAt=TimeUtils.format_datetime(nap_end),
            durationHours=round(nap_duration.total_seconds() / 3600, 1),
            quality="power_nap"
        )
    
    def _evaluate_sleep_quality(
        self,
        sleep_start: datetime,
        sleep_end: datetime,
        work_pattern: Dict[str, Any],
        shift_type: ShiftType
    ) -> str:
        """수면 품질 평가"""
        
        sleep_hour = sleep_start.hour
        duration_hours = (sleep_end - sleep_start).total_seconds() / 3600
        
        # 기본 품질 점수
        quality_score = 0
        
        # 수면 시간대 평가 (밤 10시-새벽 6시가 최적)
        if 22 <= sleep_hour or sleep_hour <= 6:
            quality_score += 3
        elif 7 <= sleep_hour <= 9:
            quality_score += 2
        else:
            quality_score += 1
        
        # 수면 시간 평가
        if 7 <= duration_hours <= 9:
            quality_score += 3
        elif 6 <= duration_hours < 7 or 9 < duration_hours <= 10:
            quality_score += 2
        else:
            quality_score += 1
        
        # 근무 패턴 고려
        if work_pattern["consecutive_work_days"] >= 3:
            quality_score -= 1
        
        if work_pattern["is_night_shift"]:
            quality_score -= 1
        
        # 품질 등급 결정
        if quality_score >= 5:
            return "excellent"
        elif quality_score >= 4:
            return "good"
        elif quality_score >= 3:
            return "fair"
        else:
            return "poor"
    
    def _generate_recommendations(
        self,
        current_schedule: ShiftSchedule,
        main_sleep: SleepWindow,
        nap_sleep: Optional[SleepWindow],
        work_pattern: Dict[str, Any]
    ) -> List[str]:
        """수면 권장사항 생성"""
        
        recommendations = []
        
        # 기본 권장사항
        recommendations.append(f"메인 수면: {main_sleep.startAt}부터 {main_sleep.endAt}까지 ({main_sleep.durationHours}시간)")
        
        if nap_sleep:
            recommendations.append(f"파워냅: {nap_sleep.startAt}부터 {nap_sleep.endAt}까지 (25분)")
        
        # 수면 품질별 권장사항
        if main_sleep.quality == "poor":
            recommendations.append("수면 환경을 어둡고 조용하게 만들어 수면 품질을 높이세요")
            recommendations.append("수면 전 1시간은 스마트폰 사용을 피하세요")
        
        # 야간 근무 권장사항
        if work_pattern["is_night_shift"]:
            recommendations.append("야간 근무 후에는 선글라스를 착용하여 빛 노출을 줄이세요")
            recommendations.append("수면 전 따뜻한 샤워로 체온을 낮추세요")
        
        # 연속 근무 권장사항
        if work_pattern["consecutive_work_days"] >= 3:
            recommendations.append("연속 근무로 인한 피로 누적을 위해 충분한 수면을 취하세요")
            if not nap_sleep:
                recommendations.append("가능하다면 20-30분 파워냅을 고려해보세요")
        
        return recommendations
    
    def _check_conflicts(
        self,
        main_sleep: SleepWindow,
        nap_sleep: Optional[SleepWindow],
        upcoming_schedules: List[ShiftSchedule],
        commute_min: int
    ) -> List[str]:
        """충돌 경고 확인"""
        
        warnings = []
        
        main_start = TimeUtils.parse_datetime(main_sleep.startAt)
        main_end = TimeUtils.parse_datetime(main_sleep.endAt)
        
        # 다음 근무와의 충돌 확인
        for schedule in upcoming_schedules[:2]:  # 다음 2일만 확인
            if schedule.shiftType == ShiftType.OFF or not schedule.startAt:
                continue
            
            work_start = TimeUtils.parse_datetime(schedule.startAt)
            commute_buffer = timedelta(minutes=commute_min + 30)  # 통근 + 준비 시간
            
            # 메인 수면이 다음 근무와 겹치는지 확인
            if main_end + commute_buffer > work_start:
                warnings.append(f"{schedule.date} 근무 시작 전 충분한 준비 시간이 부족할 수 있습니다")
        
        # 파워냅 충돌 확인
        if nap_sleep:
            nap_start = TimeUtils.parse_datetime(nap_sleep.startAt)
            nap_end = TimeUtils.parse_datetime(nap_sleep.endAt)
            
            for schedule in upcoming_schedules[:1]:  # 당일만 확인
                if schedule.shiftType == ShiftType.OFF or not schedule.startAt:
                    continue
                
                work_start = TimeUtils.parse_datetime(schedule.startAt)
                work_end = TimeUtils.parse_datetime(schedule.endAt)
                
                if (nap_start >= work_start and nap_start < work_end) or \
                   (nap_end > work_start and nap_end <= work_end):
                    warnings.append("권장된 파워냅 시간이 근무 시간과 겹칩니다")
        
        return warnings