import { createClient, RedisClientType } from 'redis';
import { db } from './database.service';

/**
 * ElastiCache Serverless Redis 캐시 서비스
 * 다층 캐싱 구조: 메모리 캐시 (5분) + RDS 캐시 (48시간)
 * ADR-012: ElastiCache Serverless 사용
 */
export class CacheService {
  private static instance: CacheService;
  private redisClient: RedisClientType | null = null;
  private memoryCache: Map<string, { value: any; expiresAt: number }> = new Map();
  private readonly MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5분

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Redis 클라이언트 초기화
   */
  private async initializeRedisClient(): Promise<RedisClientType> {
    if (this.redisClient && this.redisClient.isOpen) {
      return this.redisClient;
    }

    try {
      const endpoint = process.env.ELASTICACHE_ENDPOINT;
      if (!endpoint) {
        throw new Error('ELASTICACHE_ENDPOINT environment variable is required');
      }

      this.redisClient = createClient({
        socket: {
          host: endpoint,
          port: 6379,
          connectTimeout: 5000,
          lazyConnect: true,
        } as any,
        // ElastiCache Serverless는 AUTH 불필요
      });

      this.redisClient.on('error', (err) => {
        console.error('Redis client error:', err);
      });

      this.redisClient.on('connect', () => {
        console.log('Redis client connected');
      });

      this.redisClient.on('ready', () => {
        console.log('Redis client ready');
      });

      await this.redisClient.connect();
      return this.redisClient;
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      // Redis 연결 실패 시에도 RDS 캐시는 사용 가능하므로 에러를 던지지 않음
      return null as any;
    }
  }

  /**
   * 캐시에서 값 조회 (다층 캐싱)
   * 1. 메모리 캐시 확인
   * 2. Redis 캐시 확인 (선택적)
   * 3. RDS 캐시 확인
   * @param cacheKey 캐시 키 (형식: userId#engineType#date)
   * @returns 캐시된 값 또는 null
   */
  async get<T>(cacheKey: string): Promise<T | null> {
    try {
      // 1. 메모리 캐시 확인
      const memoryResult = this.getFromMemory<T>(cacheKey);
      if (memoryResult !== null) {
        return memoryResult;
      }

      // 2. Redis 캐시 확인 (ElastiCache Serverless)
      const redisResult = await this.getFromRedis<T>(cacheKey);
      if (redisResult !== null) {
        // 메모리 캐시에 저장
        this.setInMemory(cacheKey, redisResult);
        return redisResult;
      }

      // 3. RDS 캐시 확인 (Source of Truth)
      const dbResult = await this.getFromDatabase<T>(cacheKey);
      if (dbResult !== null) {
        // 상위 캐시들에 저장
        this.setInMemory(cacheKey, dbResult);
        await this.setInRedis(cacheKey, dbResult, 300); // 5분 TTL
        return dbResult;
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', { cacheKey, error });
      // 캐시 에러 시 null 반환 (실시간 계산으로 폴백)
      return null;
    }
  }

  /**
   * 캐시에 값 저장 (다층 캐싱)
   * @param cacheKey 캐시 키
   * @param value 저장할 값
   * @param ttlSeconds TTL (초, 기본 48시간)
   */
  async set<T>(cacheKey: string, value: T, ttlSeconds: number = 48 * 3600): Promise<void> {
    try {
      // 메모리 캐시에 저장
      this.setInMemory(cacheKey, value);

      // Redis 캐시에 저장 (단기 캐시)
      await this.setInRedis(cacheKey, value, Math.min(ttlSeconds, 300)); // 최대 5분

      // RDS 캐시에 저장 (Source of Truth, 48시간 TTL)
      await this.setInDatabase(cacheKey, value, ttlSeconds);
    } catch (error) {
      console.error('Cache set error:', { cacheKey, error });
      // 캐시 저장 실패는 시스템 동작에 영향을 주지 않음
    }
  }

  /**
   * 캐시 무효화
   * @param pattern 무효화할 키 패턴 (예: userId#*)
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      // 메모리 캐시 무효화
      for (const key of this.memoryCache.keys()) {
        if (this.matchPattern(key, pattern)) {
          this.memoryCache.delete(key);
        }
      }

      // Redis 캐시 무효화
      await this.invalidateRedisPattern(pattern);

      // RDS 캐시 무효화
      await this.invalidateDatabasePattern(pattern);
    } catch (error) {
      console.error('Cache invalidation error:', { pattern, error });
    }
  }

  /**
   * 사용자별 캐시 무효화 (근무표/프로필 변경 시)
   * @param userId 사용자 ID
   * @param fromDate 시작 날짜 (해당 날짜 이후 캐시 무효화)
   */
  async invalidateUserCache(userId: string, fromDate?: string): Promise<void> {
    try {
      if (fromDate) {
        // 특정 날짜 이후 캐시 무효화 (RDS)
        await db.query(
          'DELETE FROM engine_cache WHERE user_id = $1 AND target_date >= $2',
          [userId, fromDate]
        );
      } else {
        // 모든 사용자 캐시 무효화
        await db.query(
          'DELETE FROM engine_cache WHERE user_id = $1',
          [userId]
        );
      }

      // 메모리 및 Redis 캐시 무효화
      await this.invalidate(`${userId}#*`);
    } catch (error) {
      console.error('User cache invalidation error:', { userId, fromDate, error });
    }
  }

  /**
   * 메모리 캐시에서 값 조회
   */
  private getFromMemory<T>(cacheKey: string): T | null {
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    
    // 만료된 캐시 제거
    if (cached) {
      this.memoryCache.delete(cacheKey);
    }
    return null;
  }

  /**
   * 메모리 캐시에 값 저장
   */
  private setInMemory<T>(cacheKey: string, value: T): void {
    this.memoryCache.set(cacheKey, {
      value,
      expiresAt: Date.now() + this.MEMORY_CACHE_TTL
    });

    // 메모리 캐시 크기 제한 (1000개)
    if (this.memoryCache.size > 1000) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }
  }

  /**
   * Redis 캐시에서 값 조회
   */
  private async getFromRedis<T>(cacheKey: string): Promise<T | null> {
    try {
      const client = await this.initializeRedisClient();
      if (!client) return null;

      const cached = await client.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Redis get error:', { cacheKey, error });
      return null;
    }
  }

  /**
   * Redis 캐시에 값 저장
   */
  private async setInRedis<T>(cacheKey: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const client = await this.initializeRedisClient();
      if (!client) return;

      await client.setEx(cacheKey, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', { cacheKey, error });
    }
  }

  /**
   * RDS 캐시에서 값 조회 (Source of Truth)
   */
  private async getFromDatabase<T>(cacheKey: string): Promise<T | null> {
    try {
      // cacheKey 형식: userId#engineType#date
      const [userId, engineType, date] = cacheKey.split('#');
      
      const result = await db.queryOne<{ result: T }>(
        `SELECT result FROM engine_cache 
         WHERE user_id = $1 AND engine_type = $2 AND target_date = $3 
           AND expires_at > NOW()`,
        [userId, engineType, date]
      );
      
      return result?.result || null;
    } catch (error) {
      console.error('Database cache get error:', { cacheKey, error });
      return null;
    }
  }

  /**
   * RDS 캐시에 값 저장 (Source of Truth)
   */
  private async setInDatabase<T>(cacheKey: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      // cacheKey 형식: userId#engineType#date
      const [userId, engineType, date] = cacheKey.split('#');
      
      await db.query(
        `INSERT INTO engine_cache (user_id, engine_type, target_date, result, expires_at)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '${ttlSeconds} seconds')
         ON CONFLICT (user_id, engine_type, target_date)
         DO UPDATE SET 
           result = EXCLUDED.result,
           generated_at = NOW(),
           expires_at = EXCLUDED.expires_at`,
        [userId, engineType, date, JSON.stringify(value)]
      );
    } catch (error) {
      console.error('Database cache set error:', { cacheKey, error });
    }
  }

  /**
   * Redis 패턴 무효화
   */
  private async invalidateRedisPattern(pattern: string): Promise<void> {
    try {
      const client = await this.initializeRedisClient();
      if (!client) return;

      // Redis SCAN을 사용하여 패턴 매칭 키 찾기
      const keys: string[] = [];
      for await (const key of client.scanIterator({
        MATCH: pattern.replace('#*', '*'),
        COUNT: 100
      })) {
        keys.push(key);
      }

      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      console.error('Redis pattern invalidation error:', { pattern, error });
    }
  }

  /**
   * RDS 패턴 무효화
   */
  private async invalidateDatabasePattern(pattern: string): Promise<void> {
    try {
      // 패턴에서 userId 추출
      const userId = pattern.split('#')[0];
      if (userId && userId !== '*') {
        await db.query(
          'DELETE FROM engine_cache WHERE user_id = $1',
          [userId]
        );
      }
    } catch (error) {
      console.error('Database pattern invalidation error:', { pattern, error });
    }
  }

  /**
   * 패턴 매칭 헬퍼
   */
  private matchPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  /**
   * 캐시 통계 조회
   */
  async getStats(): Promise<{
    memorySize: number;
    redisConnected: boolean;
    dbCacheCount: number;
  }> {
    try {
      const dbResult = await db.queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM engine_cache WHERE expires_at > NOW()'
      );

      let redisConnected = false;
      try {
        const client = await this.initializeRedisClient();
        redisConnected = client?.isOpen || false;
      } catch {
        redisConnected = false;
      }

      return {
        memorySize: this.memoryCache.size,
        redisConnected,
        dbCacheCount: parseInt(dbResult?.count || '0')
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        memorySize: this.memoryCache.size,
        redisConnected: false,
        dbCacheCount: 0
      };
    }
  }

  /**
   * 연결 종료 (테스트용)
   */
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }
    this.memoryCache.clear();
  }

  /**
   * 헬스 체크
   */
  async healthCheck(): Promise<{ 
    status: string; 
    redis: boolean; 
    memory: number; 
    database: boolean 
  }> {
    try {
      let redisHealthy = false;
      try {
        const client = await this.initializeRedisClient();
        if (client) {
          await client.ping();
          redisHealthy = true;
        }
      } catch {
        redisHealthy = false;
      }

      let dbHealthy = false;
      try {
        await db.queryOne('SELECT 1');
        dbHealthy = true;
      } catch {
        dbHealthy = false;
      }

      return {
        status: dbHealthy ? 'healthy' : 'degraded',
        redis: redisHealthy,
        memory: this.memoryCache.size,
        database: dbHealthy
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        redis: false,
        memory: this.memoryCache.size,
        database: false
      };
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const cache = CacheService.getInstance();