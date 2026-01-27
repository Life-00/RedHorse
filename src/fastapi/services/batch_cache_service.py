"""
배치 작업용 캐시 관리 서비스
활성 사용자 대상 캐시 사전 생성 및 갱신
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from ..services.cache_service import CacheService
from ..services.database_service import DatabaseService
from ..engines.shift_to_sleep import ShiftToSleepEngine
from ..engines.caffeine_cutoff import CaffeineCutoffEngine
from ..engines.fatigue_risk import FatigueRiskEngine
from ..models.common import (
    EngineType, ShiftToSleepRequest, CaffeineCutoffRequest, 
    FatigueRiskRequest, CacheKey
)
from ..utils.time_utils import TimeUtils

logger = logging.getLogger(__name__)


class BatchCacheService:
    """배치 작업용 캐시 관리 서비스"""
    
    def __init__(self, cache_service: CacheService, db_service: DatabaseService):
        self.cache = cache_service
        self.db = db_service
        
        # 엔진 인스턴스
        self.shift_to_sleep_engine = ShiftToSleepEngine(cache_service, db_service)
        self.caffeine_cutoff_engine = CaffeineCutoffEngine(cache_service, db_service)
        self.fatigue_risk_engine = FatigueRiskEngine(cache_service, db_service)
    
    async def refresh_active_user_cache(
        self, 
        days_active_threshold: int = 7,
        target_days_ahead: int = 2
    ) -> Dict[str, Any]:
        """
        활성 사용자 캐시 갱신
        
        Args:
            days_active_threshold: 활성 사용자 기준 (일)
            target_days_ahead: 미리 계산할 일수
            
        Returns:
            배치 작업 결과
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info("활성 사용자 캐시 갱신 시작", {
                "daysActiveThreshold": days_active_threshold,
                "targetDaysAhead": target_days_ahead
            })
            
            # 1. 활성 사용자 목록 조회
            active_users = await self.db.get_active_users(days=days_active_threshold)
            
            if not active_users:
                logger.info("활성 사용자가 없습니다")
                return {
                    "success": True,
                    "processed_users": 0,
                    "total_cache_entries": 0,
                    "errors": [],
                    "duration_seconds": 0
                }
            
            # 2. 대상 날짜 생성 (오늘 + 미래 N일)
            today = datetime.utcnow().date()
            target_dates = [
                (today + timedelta(days=i)).isoformat()
                for i in range(target_days_ahead + 1)
            ]
            
            # 3. 사용자별 캐시 갱신 (병렬 처리)
            results = await self._process_users_in_batches(
                active_users, target_dates, batch_size=10
            )
            
            # 4. 결과 집계
            total_cache_entries = sum(r.get("cache_entries_created", 0) for r in results)
            total_errors = []
            for r in results:
                total_errors.extend(r.get("errors", []))
            
            duration_seconds = (datetime.utcnow() - start_time).total_seconds()
            
            result = {
                "success": True,
                "processed_users": len(active_users),
                "total_cache_entries": total_cache_entries,
                "errors": total_errors,
                "duration_seconds": round(duration_seconds, 2),
                "target_dates": target_dates,
                "batch_details": results
            }
            
            logger.info("활성 사용자 캐시 갱신 완료", {
                "processedUsers": len(active_users),
                "totalCacheEntries": total_cache_entries,
                "totalErrors": len(total_errors),
                "durationSeconds": duration_seconds
            })
            
            return result
            
        except Exception as e:
            duration_seconds = (datetime.utcnow() - start_time).total_seconds()
            
            logger.error("활성 사용자 캐시 갱신 실패", e, {
                "durationSeconds": duration_seconds
            })
            
            return {
                "success": False,
                "error": str(e),
                "processed_users": 0,
                "total_cache_entries": 0,
                "errors": [str(e)],
                "duration_seconds": duration_seconds
            }
    
    async def _process_users_in_batches(
        self, 
        user_ids: List[str], 
        target_dates: List[str],
        batch_size: int = 10
    ) -> List[Dict[str, Any]]:
        """사용자를 배치 단위로 처리"""
        results = []
        
        for i in range(0, len(user_ids), batch_size):
            batch = user_ids[i:i + batch_size]
            
            logger.info(f"배치 처리 시작: {i//batch_size + 1}/{(len(user_ids) + batch_size - 1)//batch_size}", {
                "batchSize": len(batch),
                "userIds": batch
            })
            
            # 배치 내 사용자들을 병렬로 처리
            batch_tasks = [
                self._refresh_user_cache(user_id, target_dates)
                for user_id in batch
            ]
            
            batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            # 예외 처리
            for j, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    error_result = {
                        "user_id": batch[j],
                        "success": False,
                        "error": str(result),
                        "cache_entries_created": 0,
                        "errors": [f"User {batch[j]}: {str(result)}"]
                    }
                    results.append(error_result)
                else:
                    results.append(result)
            
            # 배치 간 잠시 대기 (시스템 부하 방지)
            if i + batch_size < len(user_ids):
                await asyncio.sleep(0.1)
        
        return results
    
    async def _refresh_user_cache(
        self, 
        user_id: str, 
        target_dates: List[str]
    ) -> Dict[str, Any]:
        """개별 사용자 캐시 갱신"""
        try:
            logger.debug(f"사용자 캐시 갱신 시작: {user_id}")
            
            cache_entries_created = 0
            errors = []
            
            for date in target_dates:
                # 각 엔진별로 캐시 생성
                for engine_type in EngineType:
                    try:
                        await self._generate_engine_cache(user_id, date, engine_type)
                        cache_entries_created += 1
                        
                    except Exception as e:
                        error_msg = f"Engine {engine_type.value} failed for {date}: {str(e)}"
                        errors.append(error_msg)
                        logger.warning(error_msg)
            
            result = {
                "user_id": user_id,
                "success": True,
                "cache_entries_created": cache_entries_created,
                "errors": errors,
                "target_dates": target_dates
            }
            
            logger.debug(f"사용자 캐시 갱신 완료: {user_id}", {
                "cacheEntriesCreated": cache_entries_created,
                "errorCount": len(errors)
            })
            
            return result
            
        except Exception as e:
            logger.error(f"사용자 캐시 갱신 실패: {user_id}", e)
            
            return {
                "user_id": user_id,
                "success": False,
                "error": str(e),
                "cache_entries_created": 0,
                "errors": [str(e)]
            }
    
    async def _generate_engine_cache(
        self, 
        user_id: str, 
        target_date: str, 
        engine_type: EngineType
    ) -> None:
        """특정 엔진의 캐시 생성"""
        correlation_id = f"batch-{int(datetime.utcnow().timestamp())}"
        
        try:
            if engine_type == EngineType.SHIFT_TO_SLEEP:
                request = ShiftToSleepRequest(
                    userId=user_id,
                    targetDate=target_date,
                    sleepDurationHours=8.0,
                    bufferMinutes=30,
                    forceRefresh=True  # 배치에서는 항상 새로 계산
                )
                await self.shift_to_sleep_engine.calculate(request, correlation_id)
                
            elif engine_type == EngineType.CAFFEINE_CUTOFF:
                request = CaffeineCutoffRequest(
                    userId=user_id,
                    targetDate=target_date,
                    caffeineAmountMg=100.0,
                    halfLifeHours=5.0,
                    safeThresholdMg=25.0,
                    forceRefresh=True
                )
                await self.caffeine_cutoff_engine.calculate(request, correlation_id)
                
            elif engine_type == EngineType.FATIGUE_RISK:
                request = FatigueRiskRequest(
                    userId=user_id,
                    targetDate=target_date,
                    includeRecommendations=True,
                    includePrediction=False,
                    daysToAnalyze=7,
                    forceRefresh=True
                )
                await self.fatigue_risk_engine.calculate(request, correlation_id)
                
        except Exception as e:
            logger.error(f"엔진 캐시 생성 실패: {engine_type.value}", e, {
                "userId": user_id,
                "targetDate": target_date
            })
            raise
    
    async def cleanup_expired_cache(self) -> Dict[str, Any]:
        """만료된 캐시 정리"""
        try:
            logger.info("만료된 캐시 정리 시작")
            
            start_time = datetime.utcnow()
            cleaned_count = await self.cache.cleanup_expired_cache()
            duration_seconds = (datetime.utcnow() - start_time).total_seconds()
            
            result = {
                "success": True,
                "cleaned_entries": cleaned_count,
                "duration_seconds": round(duration_seconds, 2)
            }
            
            logger.info("만료된 캐시 정리 완료", {
                "cleanedEntries": cleaned_count,
                "durationSeconds": duration_seconds
            })
            
            return result
            
        except Exception as e:
            logger.error("만료된 캐시 정리 실패", e)
            
            return {
                "success": False,
                "error": str(e),
                "cleaned_entries": 0,
                "duration_seconds": 0
            }
    
    async def get_cache_health_report(self) -> Dict[str, Any]:
        """캐시 상태 보고서 생성"""
        try:
            logger.info("캐시 상태 보고서 생성 시작")
            
            # 전체 캐시 통계
            cache_stats = await self.cache.get_cache_stats()
            
            # 메모리 사용량
            memory_usage = await self.cache.get_cache_memory_usage()
            
            # 전체 히트율
            hit_rate = await self.cache.get_cache_hit_rate()
            
            # 활성 사용자 수
            active_users = await self.db.get_active_users(days=7)
            
            report = {
                "timestamp": TimeUtils.format_datetime(TimeUtils.now_kst()),
                "cache_statistics": cache_stats,
                "memory_usage": memory_usage,
                "hit_rate_percentage": round(hit_rate * 100, 2),
                "active_users_count": len(active_users),
                "health_status": "healthy" if hit_rate > 0.5 else "degraded"
            }
            
            logger.info("캐시 상태 보고서 생성 완료", {
                "hitRate": report["hit_rate_percentage"],
                "activeUsers": report["active_users_count"],
                "healthStatus": report["health_status"]
            })
            
            return report
            
        except Exception as e:
            logger.error("캐시 상태 보고서 생성 실패", e)
            
            return {
                "timestamp": TimeUtils.format_datetime(TimeUtils.now_kst()),
                "error": str(e),
                "health_status": "unhealthy"
            }
    
    async def invalidate_user_cache_by_schedule_change(
        self, 
        user_id: str, 
        changed_date: str
    ) -> Dict[str, Any]:
        """근무표 변경 시 관련 캐시 무효화"""
        try:
            logger.info("근무표 변경으로 인한 캐시 무효화", {
                "userId": user_id,
                "changedDate": changed_date
            })
            
            # 변경된 날짜와 그 이후 날짜의 캐시 무효화
            deleted_count = 0
            
            # 모든 엔진 타입에 대해 무효화
            for engine_type in EngineType:
                count = await self.cache.invalidate_engine_cache(
                    user_id=user_id,
                    engine_type=engine_type,
                    target_date=changed_date
                )
                deleted_count += count
            
            # 변경된 날짜 이후의 캐시도 무효화 (영향을 받을 수 있음)
            changed_date_obj = datetime.fromisoformat(changed_date).date()
            future_dates = [
                (changed_date_obj + timedelta(days=i)).isoformat()
                for i in range(1, 8)  # 일주일간
            ]
            
            for future_date in future_dates:
                for engine_type in EngineType:
                    count = await self.cache.invalidate_engine_cache(
                        user_id=user_id,
                        engine_type=engine_type,
                        target_date=future_date
                    )
                    deleted_count += count
            
            result = {
                "success": True,
                "user_id": user_id,
                "changed_date": changed_date,
                "deleted_cache_entries": deleted_count,
                "invalidated_dates": [changed_date] + future_dates
            }
            
            logger.info("근무표 변경 캐시 무효화 완료", {
                "userId": user_id,
                "deletedEntries": deleted_count
            })
            
            return result
            
        except Exception as e:
            logger.error("근무표 변경 캐시 무효화 실패", e, {
                "userId": user_id,
                "changedDate": changed_date
            })
            
            return {
                "success": False,
                "error": str(e),
                "user_id": user_id,
                "changed_date": changed_date,
                "deleted_cache_entries": 0
            }