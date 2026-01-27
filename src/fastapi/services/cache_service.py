"""
ElastiCache Serverless 연결 및 캐시 관리 서비스
Redis 클라이언트를 사용한 캐시 작업 처리
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import redis.asyncio as redis
import logging
from ..config import settings
from ..models.common import CacheKey, CacheEntry, EngineType

logger = logging.getLogger(__name__)


class CacheService:
    """ElastiCache 서비스 클래스"""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.connection_pool: Optional[redis.ConnectionPool] = None
        self.is_connected = False
        
    async def initialize(self):
        """Redis 연결 초기화"""
        try:
            # 연결 풀 생성
            self.connection_pool = redis.ConnectionPool.from_url(
                settings.REDIS_URL,
                max_connections=settings.REDIS_POOL_SIZE,
                retry_on_timeout=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            
            # Redis 클라이언트 생성
            self.redis_client = redis.Redis(
                connection_pool=self.connection_pool,
                decode_responses=True
            )
            
            # 연결 테스트
            await self.redis_client.ping()
            self.is_connected = True
            
            logger.info("ElastiCache 연결이 성공적으로 초기화되었습니다")
            
        except Exception as e:
            logger.error(f"ElastiCache 연결 실패: {e}")
            self.is_connected = False
            raise
    
    async def close(self):
        """연결 종료"""
        try:
            if self.redis_client:
                await self.redis_client.close()
            
            if self.connection_pool:
                await self.connection_pool.disconnect()
            
            self.is_connected = False
            logger.info("ElastiCache 연결이 종료되었습니다")
            
        except Exception as e:
            logger.error(f"ElastiCache 연결 종료 중 오류: {e}")
    
    async def health_check(self) -> Dict[str, Any]:
        """헬스 체크"""
        try:
            if not self.is_connected or not self.redis_client:
                return {
                    "healthy": False,
                    "latency_ms": None,
                    "details": {"error": "연결되지 않음"}
                }
            
            start_time = datetime.utcnow()
            await self.redis_client.ping()
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            # 메모리 사용량 확인
            info = await self.redis_client.info("memory")
            used_memory = info.get("used_memory", 0)
            max_memory = info.get("maxmemory", 0)
            
            return {
                "healthy": True,
                "latency_ms": round(latency, 2),
                "details": {
                    "used_memory_mb": round(used_memory / 1024 / 1024, 2),
                    "max_memory_mb": round(max_memory / 1024 / 1024, 2) if max_memory > 0 else "unlimited"
                }
            }
            
        except Exception as e:
            logger.error(f"캐시 헬스 체크 실패: {e}")
            return {
                "healthy": False,
                "latency_ms": None,
                "details": {"error": str(e)}
            }
    
    def _generate_cache_key(self, cache_key: CacheKey) -> str:
        """캐시 키 생성"""
        return cache_key.generate_key()
    
    async def get(self, cache_key: CacheKey) -> Optional[Dict[str, Any]]:
        """캐시에서 데이터 조회"""
        if not self.is_connected or not self.redis_client:
            logger.warning("캐시 서비스가 연결되지 않음")
            return None
        
        try:
            key = self._generate_cache_key(cache_key)
            data = await self.redis_client.get(key)
            
            if data:
                # 히트 카운트 증가
                await self.redis_client.hincrby(f"{key}:meta", "hit_count", 1)
                
                # JSON 파싱
                result = json.loads(data)
                logger.debug(f"캐시 히트: {key}")
                return result
            
            logger.debug(f"캐시 미스: {key}")
            return None
            
        except Exception as e:
            logger.error(f"캐시 조회 실패: {e}")
            return None
    
    async def set(
        self, 
        cache_key: CacheKey, 
        data: Dict[str, Any], 
        ttl_seconds: Optional[int] = None
    ) -> bool:
        """캐시에 데이터 저장"""
        if not self.is_connected or not self.redis_client:
            logger.warning("캐시 서비스가 연결되지 않음")
            return False
        
        try:
            key = self._generate_cache_key(cache_key)
            ttl = ttl_seconds or settings.CACHE_TTL_SECONDS
            
            # 데이터 저장
            json_data = json.dumps(data, ensure_ascii=False, default=str)
            await self.redis_client.setex(key, ttl, json_data)
            
            # 메타데이터 저장
            now = datetime.utcnow()
            expires_at = now + timedelta(seconds=ttl)
            
            meta_data = {
                "created_at": now.isoformat(),
                "expires_at": expires_at.isoformat(),
                "hit_count": "0",  # Redis hash는 문자열만 지원
                "engine_type": cache_key.engine_type.value,
                "user_id": cache_key.user_id
            }
            
            # hmset 대신 hset 사용 (Redis 4.0+)
            await self.redis_client.hset(f"{key}:meta", mapping=meta_data)
            await self.redis_client.expire(f"{key}:meta", ttl)
            
            logger.debug(f"캐시 저장: {key} (TTL: {ttl}초)")
            return True
            
        except Exception as e:
            logger.error(f"캐시 저장 실패: {e}")
            return False
    
    async def delete(self, cache_key: CacheKey) -> bool:
        """캐시에서 데이터 삭제"""
        if not self.is_connected or not self.redis_client:
            logger.warning("캐시 서비스가 연결되지 않음")
            return False
        
        try:
            key = self._generate_cache_key(cache_key)
            
            # 데이터와 메타데이터 모두 삭제
            deleted = await self.redis_client.delete(key, f"{key}:meta")
            
            logger.debug(f"캐시 삭제: {key} (삭제된 키: {deleted}개)")
            return deleted > 0
            
        except Exception as e:
            logger.error(f"캐시 삭제 실패: {e}")
            return False
    
    async def invalidate_user_cache(self, user_id: str, date_from: Optional[str] = None) -> int:
        """사용자 캐시 무효화"""
        if not self.is_connected or not self.redis_client:
            logger.warning("캐시 서비스가 연결되지 않음")
            return 0
        
        try:
            # 사용자 관련 모든 캐시 키 패턴
            patterns = [
                f"engine#*:user#{user_id}*",
                f"user#{user_id}:*"
            ]
            
            deleted_count = 0
            
            for pattern in patterns:
                keys = await self.redis_client.keys(pattern)
                
                if keys:
                    # 날짜 필터링 (지정된 날짜 이후만 삭제)
                    if date_from:
                        filtered_keys = []
                        for key in keys:
                            if f"date#{date_from}" in key or not "date#" in key:
                                filtered_keys.append(key)
                        keys = filtered_keys
                    
                    if keys:
                        # 메타데이터 키도 함께 삭제
                        all_keys = []
                        for key in keys:
                            all_keys.append(key)
                            all_keys.append(f"{key}:meta")
                        
                        deleted = await self.redis_client.delete(*all_keys)
                        deleted_count += deleted
            
            logger.info(f"사용자 캐시 무효화 완료: user_id={user_id}, 삭제된 키={deleted_count}개")
            return deleted_count
            
        except Exception as e:
            logger.error(f"사용자 캐시 무효화 실패: {e}")
            return 0
    
    async def get_cache_stats(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """캐시 통계 조회"""
        if not self.is_connected or not self.redis_client:
            return {"error": "캐시 서비스가 연결되지 않음"}
        
        try:
            # 전체 통계
            info = await self.redis_client.info()
            
            stats = {
                "total_keys": info.get("db0", {}).get("keys", 0),
                "used_memory_mb": round(info.get("used_memory", 0) / 1024 / 1024, 2),
                "hit_rate": info.get("keyspace_hits", 0) / max(info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0), 1),
                "connected_clients": info.get("connected_clients", 0)
            }
            
            # 사용자별 통계
            if user_id:
                user_keys = await self.redis_client.keys(f"*user#{user_id}*")
                stats["user_cache_keys"] = len(user_keys)
                
                # 엔진별 캐시 수
                engine_counts = {}
                for engine_type in EngineType:
                    pattern = f"engine#{engine_type.value}:user#{user_id}*"
                    keys = await self.redis_client.keys(pattern)
                    engine_counts[engine_type.value] = len(keys)
                
                stats["engine_cache_counts"] = engine_counts
            
            return stats
            
        except Exception as e:
            logger.error(f"캐시 통계 조회 실패: {e}")
            return {"error": str(e)}
    
    async def cleanup_expired_cache(self) -> int:
        """만료된 캐시 정리"""
        if not self.is_connected or not self.redis_client:
            logger.warning("캐시 서비스가 연결되지 않음")
            return 0
        
        try:
            # Redis는 자동으로 만료된 키를 삭제하므로
            # 여기서는 메타데이터 정리만 수행
            meta_keys = await self.redis_client.keys("*:meta")
            cleaned_count = 0
            
            for meta_key in meta_keys:
                # 원본 키가 존재하지 않으면 메타데이터 삭제
                original_key = meta_key.replace(":meta", "")
                if not await self.redis_client.exists(original_key):
                    await self.redis_client.delete(meta_key)
                    cleaned_count += 1
            
            logger.info(f"만료된 캐시 메타데이터 정리 완료: {cleaned_count}개")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"캐시 정리 실패: {e}")
            return 0
    
    async def warm_up_cache(self, user_ids: List[str]) -> Dict[str, int]:
        """캐시 워밍업 (배치 작업용)"""
        if not self.is_connected:
            return {"error": "캐시 서비스가 연결되지 않음"}
        
        try:
            # 실제 구현에서는 각 엔진을 호출하여 캐시를 미리 생성
            # 여기서는 플레이스홀더만 제공
            results = {
                "processed_users": len(user_ids),
                "cache_entries_created": 0,
                "errors": 0
            }
            
            logger.info(f"캐시 워밍업 완료: {results}")
            return results
            
        except Exception as e:
            logger.error(f"캐시 워밍업 실패: {e}")
            return {"error": str(e)}
    
    async def invalidate_engine_cache(
        self, 
        user_id: str, 
        engine_type: Optional[EngineType] = None,
        target_date: Optional[str] = None
    ) -> int:
        """엔진별 캐시 무효화"""
        if not self.is_connected or not self.redis_client:
            logger.warning("캐시 서비스가 연결되지 않음")
            return 0
        
        try:
            patterns = []
            
            if engine_type:
                # 특정 엔진의 캐시만 무효화
                if target_date:
                    patterns.append(f"engine#{engine_type.value}:user#{user_id}:date#{target_date}*")
                else:
                    patterns.append(f"engine#{engine_type.value}:user#{user_id}*")
            else:
                # 모든 엔진 캐시 무효화
                if target_date:
                    patterns.append(f"engine#*:user#{user_id}:date#{target_date}*")
                else:
                    patterns.append(f"engine#*:user#{user_id}*")
            
            deleted_count = 0
            
            for pattern in patterns:
                keys = await self.redis_client.keys(pattern)
                
                if keys:
                    # 메타데이터 키도 함께 삭제
                    all_keys = []
                    for key in keys:
                        all_keys.append(key)
                        all_keys.append(f"{key}:meta")
                    
                    deleted = await self.redis_client.delete(*all_keys)
                    deleted_count += deleted
            
            logger.info(f"엔진 캐시 무효화 완료: user_id={user_id}, engine={engine_type}, 삭제된 키={deleted_count}개")
            return deleted_count
            
        except Exception as e:
            logger.error(f"엔진 캐시 무효화 실패: {e}")
            return 0
    
    async def get_cache_hit_rate(self, user_id: Optional[str] = None) -> float:
        """캐시 히트율 계산"""
        if not self.is_connected or not self.redis_client:
            return 0.0
        
        try:
            if user_id:
                # 사용자별 히트율 계산
                meta_keys = await self.redis_client.keys(f"*user#{user_id}*:meta")
            else:
                # 전체 히트율 계산
                meta_keys = await self.redis_client.keys("*:meta")
            
            total_hits = 0
            total_keys = len(meta_keys)
            
            if total_keys == 0:
                return 0.0
            
            for meta_key in meta_keys:
                hit_count = await self.redis_client.hget(meta_key, "hit_count")
                if hit_count:
                    total_hits += int(hit_count)
            
            # 히트율 = 총 히트 수 / (총 키 수 * 평균 예상 접근 횟수)
            # 간단한 계산을 위해 총 히트 수 / 총 키 수 사용
            hit_rate = total_hits / total_keys if total_keys > 0 else 0.0
            return min(hit_rate, 1.0)  # 최대 100%
            
        except Exception as e:
            logger.error(f"캐시 히트율 계산 실패: {e}")
            return 0.0
    
    async def preload_user_cache(
        self, 
        user_id: str, 
        target_dates: List[str],
        engine_types: List[EngineType]
    ) -> Dict[str, Any]:
        """사용자 캐시 사전 로딩 (배치 작업용)"""
        if not self.is_connected:
            return {"error": "캐시 서비스가 연결되지 않음"}
        
        try:
            results = {
                "user_id": user_id,
                "target_dates": target_dates,
                "engine_types": [e.value for e in engine_types],
                "cache_entries_created": 0,
                "cache_entries_updated": 0,
                "errors": []
            }
            
            # 실제 구현에서는 각 엔진을 호출하여 캐시를 미리 생성
            # 현재는 플레이스홀더만 제공
            
            for date in target_dates:
                for engine_type in engine_types:
                    try:
                        # TODO: 실제 엔진 호출 및 캐시 생성
                        # engine_result = await engine.calculate(user_id, date)
                        # await self.set(cache_key, engine_result)
                        
                        results["cache_entries_created"] += 1
                        
                    except Exception as e:
                        error_msg = f"Failed to preload {engine_type.value} for {date}: {str(e)}"
                        results["errors"].append(error_msg)
                        logger.error(error_msg)
            
            logger.info(f"사용자 캐시 사전 로딩 완료: {results}")
            return results
            
        except Exception as e:
            logger.error(f"사용자 캐시 사전 로딩 실패: {e}")
            return {"error": str(e)}
    
    async def get_cache_memory_usage(self) -> Dict[str, Any]:
        """캐시 메모리 사용량 상세 조회"""
        if not self.is_connected or not self.redis_client:
            return {"error": "캐시 서비스가 연결되지 않음"}
        
        try:
            info = await self.redis_client.info("memory")
            
            memory_stats = {
                "used_memory_bytes": info.get("used_memory", 0),
                "used_memory_mb": round(info.get("used_memory", 0) / 1024 / 1024, 2),
                "used_memory_peak_mb": round(info.get("used_memory_peak", 0) / 1024 / 1024, 2),
                "used_memory_rss_mb": round(info.get("used_memory_rss", 0) / 1024 / 1024, 2),
                "mem_fragmentation_ratio": info.get("mem_fragmentation_ratio", 0),
                "maxmemory_mb": round(info.get("maxmemory", 0) / 1024 / 1024, 2) if info.get("maxmemory", 0) > 0 else "unlimited"
            }
            
            # 키 공간 정보
            keyspace_info = await self.redis_client.info("keyspace")
            if "db0" in keyspace_info:
                db_info = keyspace_info["db0"]
                memory_stats.update({
                    "total_keys": db_info.get("keys", 0),
                    "keys_with_expiry": db_info.get("expires", 0)
                })
            
            return memory_stats
            
        except Exception as e:
            logger.error(f"캐시 메모리 사용량 조회 실패: {e}")
            return {"error": str(e)}
    
    async def flush_all_cache(self, confirm: bool = False) -> bool:
        """모든 캐시 삭제 (주의: 개발/테스트 환경에서만 사용)"""
        if not confirm:
            logger.warning("flush_all_cache 호출 시 confirm=True 필요")
            return False
        
        if not self.is_connected or not self.redis_client:
            logger.warning("캐시 서비스가 연결되지 않음")
            return False
        
        try:
            await self.redis_client.flushdb()
            logger.warning("모든 캐시가 삭제되었습니다")
            return True
            
        except Exception as e:
            logger.error(f"캐시 전체 삭제 실패: {e}")
            return False