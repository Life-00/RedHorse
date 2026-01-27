"""
수면 계산 유틸리티
수면 패턴 분석 및 최적화 알고리즘
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from enum import Enum
import math


class SleepPhase(Enum):
    """수면 단계"""
    LIGHT = "light"
    DEEP = "deep"
    REM = "rem"


class CircadianRhythm(Enum):
    """일주기 리듬 타입"""
    MORNING = "morning"  # 아침형
    EVENING = "evening"  # 저녁형
    INTERMEDIATE = "intermediate"  # 중간형


class SleepCalculator:
    """수면 계산기 클래스"""
    
    # 수면 단계별 주기 (분)
    SLEEP_CYCLE_MINUTES = 90
    LIGHT_SLEEP_MINUTES = 45
    DEEP_SLEEP_MINUTES = 30
    REM_SLEEP_MINUTES = 15
    
    # 최적 수면 시간대 (시간)
    OPTIMAL_SLEEP_HOURS = {
        CircadianRhythm.MORNING: (21, 5),    # 21:00-05:00
        CircadianRhythm.INTERMEDIATE: (22, 6),  # 22:00-06:00
        CircadianRhythm.EVENING: (23, 7)     # 23:00-07:00
    }
    
    # 권장 수면 시간 (시간)
    RECOMMENDED_SLEEP_HOURS = {
        "adult": (7, 9),
        "shift_worker": (7, 8.5)
    }
    
    def __init__(self):
        pass
    
    def calculate_optimal_sleep_cycles(self, target_sleep_hours: float) -> int:
        """목표 수면 시간에 맞는 최적 수면 주기 수 계산"""
        target_minutes = target_sleep_hours * 60
        cycles = round(target_minutes / self.SLEEP_CYCLE_MINUTES)
        
        # 최소 3주기, 최대 6주기
        return max(3, min(6, cycles))
    
    def calculate_sleep_duration_from_cycles(self, cycles: int) -> float:
        """수면 주기 수로부터 총 수면 시간 계산"""
        total_minutes = cycles * self.SLEEP_CYCLE_MINUTES
        return total_minutes / 60
    
    def find_optimal_wake_times(
        self, 
        sleep_start: datetime, 
        min_sleep_hours: float = 6.0,
        max_sleep_hours: float = 9.0
    ) -> List[Tuple[datetime, int, str]]:
        """최적 기상 시간 목록 계산 (수면 주기 고려)"""
        wake_times = []
        
        min_cycles = math.ceil(min_sleep_hours * 60 / self.SLEEP_CYCLE_MINUTES)
        max_cycles = math.floor(max_sleep_hours * 60 / self.SLEEP_CYCLE_MINUTES)
        
        for cycles in range(min_cycles, max_cycles + 1):
            wake_time = sleep_start + timedelta(minutes=cycles * self.SLEEP_CYCLE_MINUTES)
            sleep_hours = cycles * self.SLEEP_CYCLE_MINUTES / 60
            
            # 수면 품질 평가
            if cycles >= 5:
                quality = "excellent"
            elif cycles >= 4:
                quality = "good"
            else:
                quality = "fair"
            
            wake_times.append((wake_time, cycles, quality))
        
        return wake_times
    
    def calculate_sleep_debt(
        self, 
        recent_sleep_hours: List[float], 
        target_sleep_hours: float = 8.0
    ) -> Dict[str, float]:
        """수면 부채 계산"""
        if not recent_sleep_hours:
            return {
                "total_debt": 0.0,
                "average_sleep": 0.0,
                "daily_deficit": 0.0,
                "recovery_days": 0
            }
        
        total_sleep = sum(recent_sleep_hours)
        days = len(recent_sleep_hours)
        average_sleep = total_sleep / days
        
        # 총 수면 부채
        target_total = target_sleep_hours * days
        total_debt = max(0, target_total - total_sleep)
        
        # 일일 평균 부족분
        daily_deficit = max(0, target_sleep_hours - average_sleep)
        
        # 회복에 필요한 일수 (하루 1시간씩 추가 수면으로 회복)
        recovery_days = math.ceil(total_debt) if total_debt > 0 else 0
        
        return {
            "total_debt": round(total_debt, 1),
            "average_sleep": round(average_sleep, 1),
            "daily_deficit": round(daily_deficit, 1),
            "recovery_days": recovery_days
        }
    
    def calculate_nap_recommendation(
        self,
        current_time: datetime,
        last_sleep_end: datetime,
        next_sleep_start: datetime,
        sleep_debt: float = 0.0
    ) -> Optional[Dict[str, any]]:
        """파워냅 권장사항 계산"""
        
        # 마지막 수면 종료 후 경과 시간
        hours_since_sleep = (current_time - last_sleep_end).total_seconds() / 3600
        
        # 다음 수면까지 남은 시간
        hours_until_sleep = (next_sleep_start - current_time).total_seconds() / 3600
        
        # 파워냅 권장 조건
        should_nap = (
            hours_since_sleep >= 6 and  # 마지막 수면 후 6시간 이상
            hours_until_sleep >= 6 and  # 다음 수면까지 6시간 이상
            hours_since_sleep <= 12     # 마지막 수면 후 12시간 이내
        )
        
        if not should_nap:
            return None
        
        # 파워냅 시간 계산
        if sleep_debt > 2:
            # 수면 부채가 많으면 긴 낮잠 (60-90분)
            nap_duration = 90
            nap_type = "recovery_nap"
        elif hours_since_sleep >= 10:
            # 오랜 시간 깨어있었으면 중간 낮잠 (30-45분)
            nap_duration = 30
            nap_type = "maintenance_nap"
        else:
            # 일반적인 파워냅 (15-20분)
            nap_duration = 20
            nap_type = "power_nap"
        
        # 최적 낮잠 시작 시간 (현재 시간 기준)
        optimal_nap_start = current_time + timedelta(minutes=30)  # 30분 후
        nap_end = optimal_nap_start + timedelta(minutes=nap_duration)
        
        return {
            "start_time": optimal_nap_start,
            "end_time": nap_end,
            "duration_minutes": nap_duration,
            "type": nap_type,
            "reason": self._get_nap_reason(hours_since_sleep, sleep_debt)
        }
    
    def _get_nap_reason(self, hours_awake: float, sleep_debt: float) -> str:
        """파워냅 권장 이유"""
        if sleep_debt > 2:
            return "수면 부채 회복을 위한 회복 낮잠"
        elif hours_awake >= 10:
            return "장시간 각성으로 인한 피로 해소"
        else:
            return "각성 유지 및 인지 기능 향상"
    
    def calculate_caffeine_timing(
        self,
        target_sleep_time: datetime,
        caffeine_half_life_hours: float = 5.0,
        safe_threshold_mg: float = 25.0,
        typical_dose_mg: float = 100.0
    ) -> Dict[str, any]:
        """카페인 섭취 마감 시간 계산"""
        
        # 카페인이 안전 수준까지 떨어지는 시간 계산
        # C(t) = C0 * (1/2)^(t/half_life)
        # safe_threshold = typical_dose * (1/2)^(t/half_life)
        # t = half_life * log2(typical_dose / safe_threshold)
        
        if typical_dose_mg <= safe_threshold_mg:
            hours_needed = 0
        else:
            hours_needed = caffeine_half_life_hours * math.log2(typical_dose_mg / safe_threshold_mg)
        
        # 카페인 마감 시간
        cutoff_time = target_sleep_time - timedelta(hours=hours_needed)
        
        # 카페인 농도 변화 타임라인
        timeline = []
        current_time = cutoff_time
        current_amount = typical_dose_mg
        
        while current_amount > safe_threshold_mg and len(timeline) < 12:
            timeline.append({
                "time": current_time,
                "caffeine_mg": round(current_amount, 1),
                "percentage": round((current_amount / typical_dose_mg) * 100, 1)
            })
            
            current_time += timedelta(hours=caffeine_half_life_hours)
            current_amount /= 2
        
        return {
            "cutoff_time": cutoff_time,
            "hours_before_sleep": round(hours_needed, 1),
            "half_life_hours": caffeine_half_life_hours,
            "safe_threshold_mg": safe_threshold_mg,
            "timeline": timeline
        }
    
    def evaluate_sleep_environment_score(
        self,
        sleep_start_hour: int,
        noise_level: str = "moderate",
        light_level: str = "moderate",
        temperature_celsius: Optional[float] = None
    ) -> Dict[str, any]:
        """수면 환경 점수 평가"""
        
        score = 0
        max_score = 100
        factors = []
        
        # 시간대 점수 (40점 만점)
        time_score = self._calculate_time_score(sleep_start_hour)
        score += time_score
        factors.append({
            "factor": "sleep_timing",
            "score": time_score,
            "max_score": 40,
            "description": f"{sleep_start_hour}시 수면 시작"
        })
        
        # 소음 점수 (20점 만점)
        noise_scores = {"quiet": 20, "moderate": 15, "noisy": 5}
        noise_score = noise_scores.get(noise_level, 10)
        score += noise_score
        factors.append({
            "factor": "noise_level",
            "score": noise_score,
            "max_score": 20,
            "description": f"소음 수준: {noise_level}"
        })
        
        # 조명 점수 (20점 만점)
        light_scores = {"dark": 20, "dim": 15, "moderate": 10, "bright": 0}
        light_score = light_scores.get(light_level, 10)
        score += light_score
        factors.append({
            "factor": "light_level",
            "score": light_score,
            "max_score": 20,
            "description": f"조명 수준: {light_level}"
        })
        
        # 온도 점수 (20점 만점)
        temp_score = self._calculate_temperature_score(temperature_celsius)
        score += temp_score
        factors.append({
            "factor": "temperature",
            "score": temp_score,
            "max_score": 20,
            "description": f"온도: {temperature_celsius}°C" if temperature_celsius else "온도 정보 없음"
        })
        
        # 등급 결정
        percentage = (score / max_score) * 100
        if percentage >= 90:
            grade = "excellent"
        elif percentage >= 75:
            grade = "good"
        elif percentage >= 60:
            grade = "fair"
        else:
            grade = "poor"
        
        return {
            "total_score": score,
            "max_score": max_score,
            "percentage": round(percentage, 1),
            "grade": grade,
            "factors": factors,
            "recommendations": self._get_environment_recommendations(factors)
        }
    
    def _calculate_time_score(self, sleep_start_hour: int) -> int:
        """수면 시작 시간 점수 계산"""
        # 22:00-02:00: 최고 점수 (40점)
        if 22 <= sleep_start_hour or sleep_start_hour <= 2:
            return 40
        # 02:00-06:00: 좋은 점수 (30점)
        elif 2 < sleep_start_hour <= 6:
            return 30
        # 06:00-10:00: 보통 점수 (20점)
        elif 6 < sleep_start_hour <= 10:
            return 20
        # 10:00-14:00: 낮은 점수 (10점)
        elif 10 < sleep_start_hour <= 14:
            return 10
        # 14:00-22:00: 매우 낮은 점수 (5점)
        else:
            return 5
    
    def _calculate_temperature_score(self, temp_celsius: Optional[float]) -> int:
        """온도 점수 계산"""
        if temp_celsius is None:
            return 10  # 기본 점수
        
        # 최적 수면 온도: 16-19°C
        if 16 <= temp_celsius <= 19:
            return 20
        elif 14 <= temp_celsius < 16 or 19 < temp_celsius <= 22:
            return 15
        elif 12 <= temp_celsius < 14 or 22 < temp_celsius <= 25:
            return 10
        else:
            return 5
    
    def _get_environment_recommendations(self, factors: List[Dict]) -> List[str]:
        """환경 개선 권장사항"""
        recommendations = []
        
        for factor in factors:
            if factor["score"] < factor["max_score"] * 0.7:  # 70% 미만인 경우
                if factor["factor"] == "sleep_timing":
                    recommendations.append("가능하다면 밤 10시-새벽 2시 사이에 수면을 시작하세요")
                elif factor["factor"] == "noise_level":
                    recommendations.append("귀마개나 백색소음을 사용하여 소음을 차단하세요")
                elif factor["factor"] == "light_level":
                    recommendations.append("암막 커튼이나 수면 안대를 사용하여 빛을 차단하세요")
                elif factor["factor"] == "temperature":
                    recommendations.append("실내 온도를 16-19°C로 유지하세요")
        
        return recommendations
    
    def calculate_sleep_efficiency(
        self,
        time_in_bed_minutes: int,
        actual_sleep_minutes: int,
        wake_episodes: int = 0
    ) -> Dict[str, any]:
        """수면 효율성 계산"""
        
        if time_in_bed_minutes <= 0:
            return {
                "efficiency_percentage": 0,
                "grade": "poor",
                "sleep_latency_estimated": 0,
                "wake_time_estimated": 0
            }
        
        # 수면 효율성 = (실제 수면 시간 / 침대에 있던 시간) * 100
        efficiency = (actual_sleep_minutes / time_in_bed_minutes) * 100
        
        # 수면 잠복기 추정 (침대에 누워서 잠들기까지의 시간)
        sleep_latency = time_in_bed_minutes - actual_sleep_minutes - (wake_episodes * 5)
        sleep_latency = max(0, sleep_latency)
        
        # 중간 각성 시간 추정
        wake_time = wake_episodes * 5  # 각성당 평균 5분
        
        # 등급 결정
        if efficiency >= 90:
            grade = "excellent"
        elif efficiency >= 85:
            grade = "good"
        elif efficiency >= 75:
            grade = "fair"
        else:
            grade = "poor"
        
        return {
            "efficiency_percentage": round(efficiency, 1),
            "grade": grade,
            "sleep_latency_estimated": sleep_latency,
            "wake_time_estimated": wake_time,
            "recommendations": self._get_efficiency_recommendations(efficiency, sleep_latency, wake_episodes)
        }
    
    def _get_efficiency_recommendations(
        self, 
        efficiency: float, 
        sleep_latency: int, 
        wake_episodes: int
    ) -> List[str]:
        """수면 효율성 개선 권장사항"""
        recommendations = []
        
        if efficiency < 85:
            recommendations.append("수면 효율성이 낮습니다. 침대는 오직 수면을 위해서만 사용하세요")
        
        if sleep_latency > 30:
            recommendations.append("잠들기까지 시간이 오래 걸립니다. 수면 전 이완 기법을 시도해보세요")
        
        if wake_episodes > 2:
            recommendations.append("야간 각성이 빈번합니다. 수면 환경을 점검하고 스트레스 관리를 해보세요")
        
        return recommendations