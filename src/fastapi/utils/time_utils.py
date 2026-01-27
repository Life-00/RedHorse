"""
시간 처리 유틸리티
KST 시간대 기반 시간 변환 및 포맷팅
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
import pytz


class TimeUtils:
    """시간 처리 유틸리티 클래스"""
    
    KST = pytz.timezone('Asia/Seoul')
    UTC = pytz.UTC
    
    @classmethod
    def now_utc(cls) -> datetime:
        """현재 UTC 시간 반환"""
        return datetime.now(cls.UTC)
    
    @classmethod
    def now_kst(cls) -> datetime:
        """현재 KST 시간 반환"""
        return datetime.now(cls.KST)
    
    @classmethod
    def format_datetime(cls, dt: datetime) -> str:
        """datetime을 KST ISO 8601 형식으로 포맷팅"""
        if dt.tzinfo is None:
            # naive datetime은 UTC로 가정
            dt = dt.replace(tzinfo=cls.UTC)
        
        # KST로 변환
        kst_dt = dt.astimezone(cls.KST)
        return kst_dt.isoformat()
    
    @classmethod
    def parse_datetime(cls, dt_str: str) -> datetime:
        """ISO 8601 문자열을 datetime으로 파싱"""
        try:
            # ISO 8601 파싱
            if dt_str.endswith('+09:00'):
                # KST 시간
                dt = datetime.fromisoformat(dt_str.replace('+09:00', ''))
                return cls.KST.localize(dt)
            elif dt_str.endswith('Z'):
                # UTC 시간
                dt = datetime.fromisoformat(dt_str.replace('Z', ''))
                return cls.UTC.localize(dt)
            else:
                # 시간대 정보가 없으면 UTC로 가정
                dt = datetime.fromisoformat(dt_str)
                return cls.UTC.localize(dt)
        except ValueError:
            raise ValueError(f"Invalid datetime format: {dt_str}")
    
    @classmethod
    def to_kst(cls, dt: datetime) -> datetime:
        """datetime을 KST로 변환"""
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=cls.UTC)
        return dt.astimezone(cls.KST)
    
    @classmethod
    def to_utc(cls, dt: datetime) -> datetime:
        """datetime을 UTC로 변환"""
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=cls.KST)
        return dt.astimezone(cls.UTC)
    
    @classmethod
    def add_hours(cls, dt: datetime, hours: float) -> datetime:
        """datetime에 시간 추가"""
        return dt + timedelta(hours=hours)
    
    @classmethod
    def add_minutes(cls, dt: datetime, minutes: int) -> datetime:
        """datetime에 분 추가"""
        return dt + timedelta(minutes=minutes)
    
    @classmethod
    def get_date_range(cls, start_date: str, end_date: str) -> list[str]:
        """시작일과 종료일 사이의 모든 날짜 반환"""
        start = datetime.fromisoformat(start_date).date()
        end = datetime.fromisoformat(end_date).date()
        
        dates = []
        current = start
        while current <= end:
            dates.append(current.isoformat())
            current += timedelta(days=1)
        
        return dates
    
    @classmethod
    def is_same_date(cls, dt1: datetime, dt2: datetime) -> bool:
        """두 datetime이 같은 날짜인지 확인 (KST 기준)"""
        kst_dt1 = cls.to_kst(dt1)
        kst_dt2 = cls.to_kst(dt2)
        return kst_dt1.date() == kst_dt2.date()
    
    @classmethod
    def get_work_duration_hours(cls, start_at: str, end_at: str) -> float:
        """근무 시작/종료 시간으로부터 근무 시간 계산 (시간 단위)"""
        start_dt = cls.parse_datetime(start_at)
        end_dt = cls.parse_datetime(end_at)
        
        # 야간 근무의 경우 다음날로 넘어갈 수 있음
        if end_dt < start_dt:
            end_dt += timedelta(days=1)
        
        duration = end_dt - start_dt
        return duration.total_seconds() / 3600
    
    @classmethod
    def format_time_only(cls, dt: datetime) -> str:
        """시간만 HH:MM 형식으로 포맷팅"""
        kst_dt = cls.to_kst(dt)
        return kst_dt.strftime('%H:%M')
    
    @classmethod
    def format_date_only(cls, dt: datetime) -> str:
        """날짜만 YYYY-MM-DD 형식으로 포맷팅"""
        kst_dt = cls.to_kst(dt)
        return kst_dt.strftime('%Y-%m-%d')
    
    @classmethod
    def create_kst_datetime(cls, date_str: str, time_str: str) -> datetime:
        """날짜 문자열과 시간 문자열로 KST datetime 생성"""
        dt_str = f"{date_str}T{time_str}:00"
        dt = datetime.fromisoformat(dt_str)
        return cls.KST.localize(dt)
    
    @classmethod
    def get_sleep_quality_time_range(cls) -> tuple[int, int]:
        """수면 품질이 좋은 시간대 반환 (22시-06시)"""
        return (22, 6)  # 22:00 - 06:00
    
    @classmethod
    def is_night_shift_time(cls, dt: datetime) -> bool:
        """야간 근무 시간대인지 확인"""
        kst_dt = cls.to_kst(dt)
        hour = kst_dt.hour
        # 22:00 - 06:00을 야간 시간대로 정의
        return hour >= 22 or hour < 6
    
    @classmethod
    def calculate_sleep_debt(cls, target_hours: float, actual_hours: float) -> float:
        """수면 부채 계산"""
        return max(0, target_hours - actual_hours)
    
    @classmethod
    def get_optimal_bedtime(cls, wake_time: datetime, sleep_hours: float) -> datetime:
        """기상 시간과 수면 시간으로부터 최적 취침 시간 계산"""
        return wake_time - timedelta(hours=sleep_hours)
    
    @classmethod
    def get_caffeine_cutoff_time(cls, bedtime: datetime, hours_before: float = 6.0) -> datetime:
        """취침 시간으로부터 카페인 마감 시간 계산"""
        return bedtime - timedelta(hours=hours_before)
    
    @classmethod
    def now_kst(cls) -> datetime:
        """현재 KST 시간 반환"""
        return datetime.now(cls.KST)
    
    @classmethod
    def today_kst(cls) -> str:
        """오늘 날짜 KST 기준 YYYY-MM-DD 형식으로 반환"""
        return cls.now_kst().strftime('%Y-%m-%d')
    
    @classmethod
    def format_datetime(cls, dt: datetime) -> str:
        """datetime을 KST ISO 8601 형식으로 변환"""
        if dt.tzinfo is None:
            # naive datetime은 KST로 가정
            dt = cls.KST.localize(dt)
        elif dt.tzinfo != cls.KST:
            # 다른 시간대는 KST로 변환
            dt = dt.astimezone(cls.KST)
        
        return dt.strftime('%Y-%m-%dT%H:%M:%S+09:00')
    
    @classmethod
    def parse_datetime(cls, dt_str: str) -> datetime:
        """ISO 8601 형식 문자열을 datetime으로 파싱"""
        try:
            # ISO 8601 형식 파싱
            if dt_str.endswith('+09:00'):
                # KST 시간대 정보가 있는 경우
                dt_str_clean = dt_str.replace('+09:00', '')
                dt = datetime.fromisoformat(dt_str_clean)
                return cls.KST.localize(dt)
            elif 'T' in dt_str:
                # 시간대 정보가 없는 ISO 형식
                dt = datetime.fromisoformat(dt_str)
                if dt.tzinfo is None:
                    return cls.KST.localize(dt)
                return dt.astimezone(cls.KST)
            else:
                # 날짜만 있는 경우 (YYYY-MM-DD)
                dt = datetime.strptime(dt_str, '%Y-%m-%d')
                return cls.KST.localize(dt)
        except Exception as e:
            raise ValueError(f"Invalid datetime format: {dt_str}") from e
    
    @classmethod
    def parse_date(cls, date_str: str) -> datetime:
        """YYYY-MM-DD 형식 날짜를 KST datetime으로 변환"""
        try:
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            return cls.KST.localize(dt)
        except Exception as e:
            raise ValueError(f"Invalid date format: {date_str}") from e
    
    @classmethod
    def format_date(cls, dt: datetime) -> str:
        """datetime을 YYYY-MM-DD 형식으로 변환"""
        if dt.tzinfo is None:
            dt = cls.KST.localize(dt)
        elif dt.tzinfo != cls.KST:
            dt = dt.astimezone(cls.KST)
        
        return dt.strftime('%Y-%m-%d')
    
    @classmethod
    def add_days(cls, dt: datetime, days: int) -> datetime:
        """날짜에 일수 추가"""
        return dt + timedelta(days=days)
    
    @classmethod
    def add_hours(cls, dt: datetime, hours: float) -> datetime:
        """시간에 시간 추가"""
        return dt + timedelta(hours=hours)
    
    @classmethod
    def add_minutes(cls, dt: datetime, minutes: int) -> datetime:
        """시간에 분 추가"""
        return dt + timedelta(minutes=minutes)
    
    @classmethod
    def get_date_range(cls, start_date: str, days: int) -> list[str]:
        """시작 날짜부터 지정된 일수만큼의 날짜 목록 반환"""
        start_dt = cls.parse_date(start_date)
        dates = []
        
        for i in range(days):
            date_dt = cls.add_days(start_dt, i)
            dates.append(cls.format_date(date_dt))
        
        return dates
    
    @classmethod
    def is_same_date(cls, dt1: datetime, dt2: datetime) -> bool:
        """두 datetime이 같은 날짜인지 확인 (KST 기준)"""
        if dt1.tzinfo is None:
            dt1 = cls.KST.localize(dt1)
        if dt2.tzinfo is None:
            dt2 = cls.KST.localize(dt2)
        
        dt1_kst = dt1.astimezone(cls.KST)
        dt2_kst = dt2.astimezone(cls.KST)
        
        return dt1_kst.date() == dt2_kst.date()
    
    @classmethod
    def get_hours_between(cls, start_dt: datetime, end_dt: datetime) -> float:
        """두 시간 사이의 시간 차이를 시간 단위로 반환"""
        if start_dt.tzinfo is None:
            start_dt = cls.KST.localize(start_dt)
        if end_dt.tzinfo is None:
            end_dt = cls.KST.localize(end_dt)
        
        delta = end_dt - start_dt
        return delta.total_seconds() / 3600
    
    @classmethod
    def is_night_time(cls, dt: datetime) -> bool:
        """야간 시간대인지 확인 (22:00-06:00)"""
        if dt.tzinfo is None:
            dt = cls.KST.localize(dt)
        elif dt.tzinfo != cls.KST:
            dt = dt.astimezone(cls.KST)
        
        hour = dt.hour
        return hour >= 22 or hour < 6
    
    @classmethod
    def is_day_time(cls, dt: datetime) -> bool:
        """주간 시간대인지 확인 (06:00-18:00)"""
        if dt.tzinfo is None:
            dt = cls.KST.localize(dt)
        elif dt.tzinfo != cls.KST:
            dt = dt.astimezone(cls.KST)
        
        hour = dt.hour
        return 6 <= hour < 18
    
    @classmethod
    def get_sleep_quality_time_score(cls, sleep_start: datetime) -> int:
        """수면 시작 시간에 따른 품질 점수 (1-5)"""
        if sleep_start.tzinfo is None:
            sleep_start = cls.KST.localize(sleep_start)
        elif sleep_start.tzinfo != cls.KST:
            sleep_start = sleep_start.astimezone(cls.KST)
        
        hour = sleep_start.hour
        
        # 밤 10시-새벽 2시: 최고 품질
        if 22 <= hour or hour <= 2:
            return 5
        # 새벽 2시-6시: 좋은 품질
        elif 2 < hour <= 6:
            return 4
        # 오전 6시-9시: 보통 품질
        elif 6 < hour <= 9:
            return 3
        # 오전 9시-오후 2시: 낮은 품질
        elif 9 < hour <= 14:
            return 2
        # 오후 2시-10시: 매우 낮은 품질
        else:
            return 1
    
    @classmethod
    def calculate_optimal_sleep_start(
        cls, 
        wake_up_time: datetime, 
        sleep_duration_hours: float
    ) -> datetime:
        """기상 시간으로부터 최적 수면 시작 시간 계산"""
        sleep_duration = timedelta(hours=sleep_duration_hours)
        return wake_up_time - sleep_duration
    
    @classmethod
    def validate_work_hours(
        cls, 
        start_at: str, 
        end_at: str, 
        min_hours: float = 4.0, 
        max_hours: float = 16.0
    ) -> tuple[bool, str]:
        """근무 시간 유효성 검증"""
        try:
            start_dt = cls.parse_datetime(start_at)
            end_dt = cls.parse_datetime(end_at)
            
            # 시작 시간이 종료 시간보다 늦은 경우
            if start_dt >= end_dt:
                # 야간 근무 (날짜 넘어가는 경우) 확인
                if end_dt.date() == start_dt.date():
                    return False, "시작 시간이 종료 시간보다 늦을 수 없습니다"
                # 다음날로 넘어가는 경우는 허용
            
            # 근무 시간 계산
            work_hours = cls.get_hours_between(start_dt, end_dt)
            
            # 야간 근무로 다음날로 넘어가는 경우 음수가 나올 수 있음
            if work_hours < 0:
                work_hours += 24  # 24시간 추가
            
            # 최소/최대 근무 시간 검증
            if work_hours < min_hours:
                return False, f"최소 근무 시간은 {min_hours}시간입니다"
            
            if work_hours > max_hours:
                return False, f"최대 근무 시간은 {max_hours}시간입니다"
            
            return True, ""
            
        except ValueError as e:
            return False, f"잘못된 시간 형식입니다: {str(e)}"
    
    @classmethod
    def get_next_occurrence(cls, target_time: str, from_date: Optional[str] = None) -> datetime:
        """특정 시간의 다음 발생 시점 계산 (HH:MM 형식)"""
        if from_date:
            base_date = cls.parse_date(from_date)
        else:
            base_date = cls.now_kst().replace(hour=0, minute=0, second=0, microsecond=0)
        
        try:
            hour, minute = map(int, target_time.split(':'))
            target_dt = base_date.replace(hour=hour, minute=minute)
            
            # 현재 시간보다 이전이면 다음날로
            if target_dt <= cls.now_kst():
                target_dt = cls.add_days(target_dt, 1)
            
            return target_dt
            
        except ValueError as e:
            raise ValueError(f"Invalid time format: {target_time}") from e