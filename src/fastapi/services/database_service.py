"""
PostgreSQL 데이터베이스 연결 및 쿼리 서비스
asyncpg를 사용한 비동기 데이터베이스 작업
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
import asyncpg
import logging
from ..config import settings
from ..models.common import UserProfile, ShiftSchedule, UserShiftType, ShiftType

logger = logging.getLogger(__name__)


class DatabaseService:
    """PostgreSQL 데이터베이스 서비스"""
    
    def __init__(self):
        self.connection_pool: Optional[asyncpg.Pool] = None
        self.is_connected = False
    
    async def initialize(self):
        """데이터베이스 연결 풀 초기화"""
        try:
            self.connection_pool = await asyncpg.create_pool(
                settings.DATABASE_URL,
                min_size=5,
                max_size=settings.DATABASE_POOL_SIZE,
                command_timeout=30,
                server_settings={
                    'application_name': 'fastapi-engine-service',
                    'timezone': 'UTC'
                }
            )
            
            # 연결 테스트
            async with self.connection_pool.acquire() as conn:
                await conn.execute('SELECT 1')
            
            self.is_connected = True
            logger.info("데이터베이스 연결 풀이 성공적으로 초기화되었습니다")
            
        except Exception as e:
            logger.error(f"데이터베이스 연결 실패: {e}")
            self.is_connected = False
            raise
    
    async def close(self):
        """연결 풀 종료"""
        try:
            if self.connection_pool:
                await self.connection_pool.close()
            
            self.is_connected = False
            logger.info("데이터베이스 연결 풀이 종료되었습니다")
            
        except Exception as e:
            logger.error(f"데이터베이스 연결 종료 중 오류: {e}")
    
    async def health_check(self) -> Dict[str, Any]:
        """데이터베이스 헬스 체크"""
        try:
            if not self.is_connected or not self.connection_pool:
                return {
                    "healthy": False,
                    "latency_ms": None,
                    "details": {"error": "연결되지 않음"}
                }
            
            start_time = datetime.utcnow()
            
            async with self.connection_pool.acquire() as conn:
                await conn.execute('SELECT 1')
                
                # 연결 풀 상태 확인
                pool_size = self.connection_pool.get_size()
                pool_idle = self.connection_pool.get_idle_size()
                
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            return {
                "healthy": True,
                "latency_ms": round(latency, 2),
                "details": {
                    "pool_size": pool_size,
                    "pool_idle": pool_idle,
                    "pool_used": pool_size - pool_idle
                }
            }
            
        except Exception as e:
            logger.error(f"데이터베이스 헬스 체크 실패: {e}")
            return {
                "healthy": False,
                "latency_ms": None,
                "details": {"error": str(e)}
            }
    
    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """사용자 프로필 조회 (딕셔너리 형태)"""
        if not self.connection_pool:
            return None
        
        try:
            async with self.connection_pool.acquire() as conn:
                row = await conn.fetchrow("""
                    SELECT user_id, shift_type, commute_min, wearable_connected, org_id
                    FROM users 
                    WHERE user_id = $1
                """, user_id)
                
                if row:
                    return dict(row)
                
                return None
                
        except Exception as e:
            logger.error(f"사용자 프로필 조회 실패: {e}")
            return None
    
    async def get_user_profile_model(self, user_id: str) -> Optional[UserProfile]:
    async def get_user_profile_model(self, user_id: str) -> Optional[UserProfile]:
        """사용자 프로필 조회 (모델 형태)"""
        profile_dict = await self.get_user_profile(user_id)
        
        if profile_dict:
            return UserProfile(
                userId=profile_dict['user_id'],
                shiftType=UserShiftType(profile_dict['shift_type']),
                commuteMin=profile_dict['commute_min'],
                wearableConnected=profile_dict['wearable_connected'],
                orgId=profile_dict['org_id']
            )
        
        return None
    
    async def get_user_schedules(
        self, 
        user_id: str, 
        from_date: str, 
        to_date: str
    ) -> List[ShiftSchedule]:
        """사용자 근무표 조회"""
        if not self.connection_pool:
            return []
        
        try:
            async with self.connection_pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT schedule_id, user_id, date, shift_type, 
                           start_at, end_at, commute_min, note
                    FROM shift_schedules 
                    WHERE user_id = $1 AND date BETWEEN $2 AND $3
                    ORDER BY date ASC
                """, user_id, from_date, to_date)
                
                schedules = []
                for row in rows:
                    schedule = ShiftSchedule(
                        scheduleId=row['schedule_id'],
                        userId=row['user_id'],
                        date=row['date'].isoformat(),
                        shiftType=ShiftType(row['shift_type']),
                        startAt=row['start_at'].isoformat() + "+09:00" if row['start_at'] else None,
                        endAt=row['end_at'].isoformat() + "+09:00" if row['end_at'] else None,
                        commuteMin=row['commute_min'],
                        note=row['note']
                    )
                    schedules.append(schedule)
                
                return schedules
                
        except Exception as e:
            logger.error(f"근무표 조회 실패: {e}")
            return []
    
    async def get_schedule_by_date(self, user_id: str, date: str) -> Optional[ShiftSchedule]:
        """특정 날짜 근무표 조회"""
        if not self.connection_pool:
            return None
        
        try:
            async with self.connection_pool.acquire() as conn:
                row = await conn.fetchrow("""
                    SELECT schedule_id, user_id, date, shift_type, 
                           start_at, end_at, commute_min, note
                    FROM shift_schedules 
                    WHERE user_id = $1 AND date = $2
                """, user_id, date)
                
                if row:
                    return ShiftSchedule(
                        scheduleId=row['schedule_id'],
                        userId=row['user_id'],
                        date=row['date'].isoformat(),
                        shiftType=ShiftType(row['shift_type']),
                        startAt=row['start_at'].isoformat() + "+09:00" if row['start_at'] else None,
                        endAt=row['end_at'].isoformat() + "+09:00" if row['end_at'] else None,
                        commuteMin=row['commute_min'],
                        note=row['note']
                    )
                
                return None
                
        except Exception as e:
            logger.error(f"날짜별 근무표 조회 실패: {e}")
            return None
    
    async def get_recent_schedules(self, user_id: str, days: int = 7) -> List[ShiftSchedule]:
        """최근 근무표 조회"""
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        
        return await self.get_user_schedules(
            user_id, 
            start_date.isoformat(), 
            end_date.isoformat()
        )
    
    async def get_upcoming_schedules(self, user_id: str, days: int = 7) -> List[ShiftSchedule]:
        """향후 근무표 조회"""
        start_date = datetime.utcnow().date()
        end_date = start_date + timedelta(days=days)
        
        return await self.get_user_schedules(
            user_id, 
            start_date.isoformat(), 
            end_date.isoformat()
        )
    
    async def check_schedule_conflicts(
        self, 
        user_id: str, 
        start_at: datetime, 
        end_at: datetime,
        exclude_date: Optional[str] = None
    ) -> List[ShiftSchedule]:
        """근무표 충돌 확인"""
        if not self.connection_pool:
            return []
        
        try:
            async with self.connection_pool.acquire() as conn:
                query = """
                    SELECT schedule_id, user_id, date, shift_type, 
                           start_at, end_at, commute_min, note
                    FROM shift_schedules 
                    WHERE user_id = $1 
                      AND shift_type != 'OFF'
                      AND (start_at, end_at) OVERLAPS ($2, $3)
                """
                params = [user_id, start_at, end_at]
                
                if exclude_date:
                    query += " AND date != $4"
                    params.append(exclude_date)
                
                rows = await conn.fetch(query, *params)
                
                conflicts = []
                for row in rows:
                    schedule = ShiftSchedule(
                        scheduleId=row['schedule_id'],
                        userId=row['user_id'],
                        date=row['date'].isoformat(),
                        shiftType=ShiftType(row['shift_type']),
                        startAt=row['start_at'].isoformat() + "+09:00" if row['start_at'] else None,
                        endAt=row['end_at'].isoformat() + "+09:00" if row['end_at'] else None,
                        commuteMin=row['commute_min'],
                        note=row['note']
                    )
                    conflicts.append(schedule)
                
                return conflicts
                
        except Exception as e:
            logger.error(f"근무표 충돌 확인 실패: {e}")
            return []
    
    async def get_work_pattern_analysis(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """근무 패턴 분석"""
        if not self.connection_pool:
            return {}
        
        try:
            async with self.connection_pool.acquire() as conn:
                # 최근 30일 근무 패턴 분석
                end_date = datetime.utcnow().date()
                start_date = end_date - timedelta(days=days)
                
                rows = await conn.fetch("""
                    SELECT shift_type, COUNT(*) as count,
                           AVG(EXTRACT(EPOCH FROM (end_at - start_at))/3600) as avg_hours
                    FROM shift_schedules 
                    WHERE user_id = $1 
                      AND date BETWEEN $2 AND $3
                      AND shift_type != 'OFF'
                    GROUP BY shift_type
                """, user_id, start_date, end_date)
                
                pattern = {}
                total_work_days = 0
                
                for row in rows:
                    shift_type = row['shift_type']
                    count = row['count']
                    avg_hours = float(row['avg_hours']) if row['avg_hours'] else 0
                    
                    pattern[shift_type] = {
                        "count": count,
                        "percentage": 0,  # 나중에 계산
                        "avg_hours": round(avg_hours, 1)
                    }
                    total_work_days += count
                
                # 비율 계산
                for shift_type in pattern:
                    pattern[shift_type]["percentage"] = round(
                        (pattern[shift_type]["count"] / total_work_days) * 100, 1
                    ) if total_work_days > 0 else 0
                
                # 연속 근무 분석
                consecutive_work = await conn.fetchval("""
                    WITH work_days AS (
                        SELECT date, 
                               date - ROW_NUMBER() OVER (ORDER BY date)::int * INTERVAL '1 day' as grp
                        FROM shift_schedules 
                        WHERE user_id = $1 
                          AND date BETWEEN $2 AND $3
                          AND shift_type != 'OFF'
                        ORDER BY date
                    )
                    SELECT MAX(COUNT(*)) as max_consecutive
                    FROM work_days
                    GROUP BY grp
                """, user_id, start_date, end_date)
                
                return {
                    "analysis_period_days": days,
                    "total_work_days": total_work_days,
                    "shift_distribution": pattern,
                    "max_consecutive_work_days": consecutive_work or 0,
                    "work_frequency": round(total_work_days / days, 2) if days > 0 else 0
                }
                
        except Exception as e:
            logger.error(f"근무 패턴 분석 실패: {e}")
            return {}
    
    async def update_user_activity(self, user_id: str):
        """사용자 활동 시간 업데이트"""
        if not self.connection_pool:
            return
        
        try:
            async with self.connection_pool.acquire() as conn:
                await conn.execute("""
                    UPDATE users 
                    SET last_active_at = NOW() 
                    WHERE user_id = $1
                """, user_id)
                
        except Exception as e:
            logger.error(f"사용자 활동 시간 업데이트 실패: {e}")
    
    async def get_active_users(self, days: int = 7) -> List[str]:
        """활성 사용자 목록 조회"""
        if not self.connection_pool:
            return []
        
        try:
            async with self.connection_pool.acquire() as conn:
                threshold = datetime.utcnow() - timedelta(days=days)
                
                rows = await conn.fetch("""
                    SELECT user_id 
                    FROM users 
                    WHERE last_active_at >= $1
                    ORDER BY last_active_at DESC
                """, threshold)
                
                return [row['user_id'] for row in rows]
                
        except Exception as e:
            logger.error(f"활성 사용자 조회 실패: {e}")
            return []
    
    async def execute_query(self, query: str, *params) -> List[Dict[str, Any]]:
        """일반 쿼리 실행"""
        if not self.connection_pool:
            return []
        
        try:
            async with self.connection_pool.acquire() as conn:
                rows = await conn.fetch(query, *params)
                return [dict(row) for row in rows]
                
        except Exception as e:
            logger.error(f"쿼리 실행 실패: {e}")
            return []
    
    async def execute_query_one(self, query: str, *params) -> Optional[Dict[str, Any]]:
        """단일 결과 쿼리 실행"""
        if not self.connection_pool:
            return None
        
        try:
            async with self.connection_pool.acquire() as conn:
                row = await conn.fetchrow(query, *params)
                return dict(row) if row else None
                
        except Exception as e:
            logger.error(f"단일 쿼리 실행 실패: {e}")
            return None