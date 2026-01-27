import { Context } from 'aws-lambda';
import { db } from '../services/database.service';
import { cache } from '../services/cache.service';
import { Logger, PerformanceMonitor } from '../services/logger.service';
import { TimeService } from '../services/time.service';
import { BatchJobRequest } from '../types/common';

/**
 * 배치 처리 Lambda 핸들러
 * EventBridge 스케줄러에서 호출되는 배치 작업 처리
 * ADR-005: EventBridge Scheduler 사용
 * ADR-009: 활성 사용자 정의 (7일 이내)
 */

/**
 * 배치 작업 결과 인터페이스
 */
interface BatchResult {
  jobType: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  processedCount: number;
  failedCount: number;
  duration: number;
  errors: string[];
  details?: Record<string, any>;
}

/**
 * 메인 핸들러
 */
export const handler = async (
  event: BatchJobRequest,
  context: Context
): Promise<BatchResult> => {
  const correlationId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const logger = new Logger(correlationId, context.functionName);
  const monitor = new PerformanceMonitor(logger, `Batch ${event.jobType}`);

  try {
    logger.info('Batch job started', {
      jobType: event.jobType,
      targetDate: event.targetDate,
      batchSize: event.batchSize,
      source: event.source
    });

    let result: BatchResult;

    switch (event.jobType) {
      case 'DAILY_CACHE_REFRESH':
        result = await executeDailyCacheRefresh(logger, event);
        break;
      case 'WEEKLY_STATS_AGGREGATION':
        result = await executeWeeklyStatsAggregation(logger, event);
        break;
      case 'DATA_CLEANUP':
        result = await executeDataCleanup(logger, event);
        break;
      default:
        throw new Error(`Unknown job type: ${event.jobType}`);
    }

    monitor.recordSuccess();
    logger.info('Batch job completed', result);

    return result;
  } catch (error) {
    monitor.recordFailure(error as Error);
    logger.error('Batch job failed', error as Error);

    return {
      jobType: event.jobType,
      status: 'FAILED',
      processedCount: 0,
      failedCount: 0,
      duration: monitor.getElapsedTime(),
      errors: [(error as Error).message]
    };
  }
};

/**
 * 일일 캐시 갱신 작업
 * 매일 새벽 3시 (KST) 실행
 */
async function executeDailyCacheRefresh(
  logger: Logger,
  event: BatchJobRequest
): Promise<BatchResult> {
  const startTime = Date.now();
  const batchSize = event.batchSize || 100;
  const errors: string[] = [];
  let processedCount = 0;
  let failedCount = 0;

  try {
    // 오늘/내일 날짜 계산 (KST 기준)
    const { today, tomorrow } = TimeService.getBatchDates();
    const targetDates = [today, tomorrow];

    logger.info('Daily cache refresh started', {
      targetDates,
      batchSize
    });

    // 활성 사용자 목록 조회 (ADR-009: 7일 이내 활동)
    const activeUserIds = await db.getActiveUserIds(7);
    
    logger.info('Active users found', {
      count: activeUserIds.length
    });

    if (activeUserIds.length === 0) {
      return {
        jobType: event.jobType,
        status: 'SUCCESS',
        processedCount: 0,
        failedCount: 0,
        duration: Date.now() - startTime,
        errors: [],
        details: { message: 'No active users found' }
      };
    }

    // 배치 단위로 사용자 처리
    for (let i = 0; i < activeUserIds.length; i += batchSize) {
      const userBatch = activeUserIds.slice(i, i + batchSize);
      
      logger.info('Processing user batch', {
        batchIndex: Math.floor(i / batchSize) + 1,
        batchSize: userBatch.length,
        totalBatches: Math.ceil(activeUserIds.length / batchSize)
      });

      // 병렬로 사용자별 캐시 생성
      const batchPromises = userBatch.map(async (userId) => {
        try {
          await generateUserCache(userId, targetDates, logger);
          processedCount++;
        } catch (error) {
          failedCount++;
          const errorMessage = `User ${userId.substring(0, 8)}***: ${(error as Error).message}`;
          errors.push(errorMessage);
          logger.error('User cache generation failed', error as Error, { userId });
        }
      });

      await Promise.all(batchPromises);

      // 배치 간 잠시 대기 (RDS 부하 분산)
      if (i + batchSize < activeUserIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 만료된 캐시 정리
    const cleanedCount = await db.cleanupExpiredCache();
    logger.info('Expired cache cleaned up', { cleanedCount });

    const duration = Date.now() - startTime;
    const status = failedCount === 0 ? 'SUCCESS' : 
                  processedCount > 0 ? 'PARTIAL_SUCCESS' : 'FAILED';

    return {
      jobType: event.jobType,
      status,
      processedCount,
      failedCount,
      duration,
      errors,
      details: {
        targetDates,
        totalUsers: activeUserIds.length,
        cleanedCacheCount: cleanedCount
      }
    };
  } catch (error) {
    logger.error('Daily cache refresh failed', error as Error);
    throw error;
  }
}

/**
 * 사용자별 캐시 생성
 */
async function generateUserCache(
  userId: string,
  targetDates: string[],
  logger: Logger
): Promise<void> {
  const engineTypes = ['SHIFT_TO_SLEEP', 'CAFFEINE_CUTOFF', 'FATIGUE_RISK'];

  for (const date of targetDates) {
    for (const engineType of engineTypes) {
      try {
        // 기존 캐시 확인
        const existingCache = await db.queryOne(
          `SELECT cache_id FROM engine_cache 
           WHERE user_id = $1 AND engine_type = $2 AND target_date = $3 
             AND expires_at > NOW()`,
          [userId, engineType, date]
        );

        if (existingCache) {
          // 이미 유효한 캐시가 있으면 건너뛰기
          continue;
        }

        // 엔진 계산 실행 (EC2 FastAPI 서비스 호출 시뮬레이션)
        const engineResult = await calculateEngineForCache(userId, engineType, date, logger);

        if (engineResult.result) {
          // 캐시 저장 (TTL: 48시간)
          await db.query(
            `INSERT INTO engine_cache (user_id, engine_type, target_date, result, expires_at)
             VALUES ($1, $2, $3, $4, NOW() + INTERVAL '48 hours')
             ON CONFLICT (user_id, engine_type, target_date)
             DO UPDATE SET 
               result = EXCLUDED.result,
               generated_at = NOW(),
               expires_at = EXCLUDED.expires_at`,
            [userId, engineType, date, JSON.stringify(engineResult)]
          );

          logger.debug('Cache generated', {
            userId: userId.substring(0, 8) + '***',
            engineType,
            date
          });
        }
      } catch (error) {
        logger.error('Engine cache generation failed', error as Error, {
          userId: userId.substring(0, 8) + '***',
          engineType,
          date
        });
        // 개별 엔진 실패는 전체 작업을 중단하지 않음
      }
    }
  }
}

/**
 * 캐시용 엔진 계산 (시뮬레이션)
 * 실제 구현에서는 EC2 FastAPI 서비스 호출
 */
async function calculateEngineForCache(
  userId: string,
  engineType: string,
  targetDate: string,
  logger: Logger
): Promise<any> {
  // 사용자 데이터 조회
  const [userProfile, targetSchedule] = await Promise.all([
    db.queryOne(
      'SELECT shift_type, commute_min FROM users WHERE user_id = $1',
      [userId]
    ),
    db.queryOne(
      `SELECT shift_type, start_at, end_at, commute_min 
       FROM shift_schedules WHERE user_id = $1 AND date = $2`,
      [userId, targetDate]
    )
  ]);

  // 데이터 부족 시 처리
  if (!userProfile || !targetSchedule) {
    return {
      whyNotShown: 'INSUFFICIENT_DATA',
      dataMissing: !userProfile ? ['USER_PROFILE'] : ['SHIFT_SCHEDULE_TODAY'],
      generatedAt: TimeService.nowKST()
    };
  }

  // 간단한 엔진 계산 시뮬레이션
  let result: any;

  switch (engineType) {
    case 'SHIFT_TO_SLEEP':
      result = {
        sleepMain: {
          startAt: TimeService.formatToKST(
            TimeService.subtractHours(new Date(targetSchedule.start_at), 8)
          ),
          endAt: TimeService.formatToKST(
            TimeService.subtractMinutes(new Date(targetSchedule.start_at), targetSchedule.commute_min)
          )
        }
      };
      break;

    case 'CAFFEINE_CUTOFF':
      result = {
        caffeineDeadline: TimeService.formatToKST(
          TimeService.subtractHours(new Date(targetSchedule.start_at), 6)
        ),
        halfLifeInfo: {
          halfLifeHours: 5,
          timeline: [
            { hours: 0, remainingCaffeine: 100, percentage: 100 },
            { hours: 5, remainingCaffeine: 50, percentage: 50 }
          ],
          safeThreshold: 25
        }
      };
      break;

    case 'FATIGUE_RISK':
      // 최근 야간 근무 횟수 조회
      const recentNightShifts = await db.query(
        `SELECT COUNT(*) as count FROM shift_schedules 
         WHERE user_id = $1 AND shift_type = 'NIGHT' 
           AND date >= $2 AND date <= $3`,
        [userId, TimeService.formatDateKST(TimeService.subtractDays(new Date(), 7)), targetDate]
      );

      const nightCount = parseInt(recentNightShifts[0]?.count || '0');
      const fatigueScore = Math.min(nightCount * 15, 100);

      result = {
        fatigueScore,
        fatigueLevel: fatigueScore <= 25 ? 'LOW' : 
                     fatigueScore <= 50 ? 'MEDIUM' : 
                     fatigueScore <= 75 ? 'HIGH' : 'CRITICAL',
        breakdown: {
          sleepDeficit: Math.floor(fatigueScore * 0.4),
          consecutiveNights: Math.floor(fatigueScore * 0.3),
          commute: Math.floor(fatigueScore * 0.2),
          additional: Math.floor(fatigueScore * 0.1)
        },
        recommendations: ['충분한 수면을 취하세요', '규칙적인 수면 패턴을 유지하세요']
      };
      break;

    default:
      throw new Error(`Unknown engine type: ${engineType}`);
  }

  return {
    result,
    generatedAt: TimeService.nowKST()
  };
}

/**
 * 주간 통계 집계 작업 (V2)
 */
async function executeWeeklyStatsAggregation(
  logger: Logger,
  event: BatchJobRequest
): Promise<BatchResult> {
  const startTime = Date.now();
  
  logger.info('Weekly stats aggregation started (V2 feature)');

  // V2 기능이므로 현재는 스킵
  return {
    jobType: event.jobType,
    status: 'SUCCESS',
    processedCount: 0,
    failedCount: 0,
    duration: Date.now() - startTime,
    errors: [],
    details: { message: 'V2 feature - not implemented yet' }
  };
}

/**
 * 데이터 정리 작업
 */
async function executeDataCleanup(
  logger: Logger,
  event: BatchJobRequest
): Promise<BatchResult> {
  const startTime = Date.now();
  let processedCount = 0;
  const errors: string[] = [];

  try {
    logger.info('Data cleanup started');

    // 만료된 캐시 정리
    const expiredCacheCount = await db.cleanupExpiredCache();
    processedCount += expiredCacheCount;

    // 오래된 로그 정리 (30일 이상)
    const oldLogsCount = await db.query(
      `DELETE FROM system_logs 
       WHERE created_at < NOW() - INTERVAL '30 days'`
    );
    processedCount += oldLogsCount.length;

    // 실패한 파일 업로드 정리 (7일 이상)
    const failedFilesCount = await db.query(
      `DELETE FROM file_metadata 
       WHERE status = 'FAILED' AND created_at < NOW() - INTERVAL '7 days'`
    );
    processedCount += failedFilesCount.length;

    logger.info('Data cleanup completed', {
      expiredCacheCount,
      oldLogsCount: oldLogsCount.length,
      failedFilesCount: failedFilesCount.length
    });

    return {
      jobType: event.jobType,
      status: 'SUCCESS',
      processedCount,
      failedCount: 0,
      duration: Date.now() - startTime,
      errors,
      details: {
        expiredCacheCount,
        oldLogsCount: oldLogsCount.length,
        failedFilesCount: failedFilesCount.length
      }
    };
  } catch (error) {
    logger.error('Data cleanup failed', error as Error);
    throw error;
  }
}

/**
 * 배치 작업 헬스 체크 (CloudWatch 알람용)
 */
export const healthCheck = async (): Promise<{ status: string; timestamp: string }> => {
  try {
    const dbHealth = await db.healthCheck();
    const cacheHealth = await cache.healthCheck();

    const status = dbHealth.status === 'healthy' && cacheHealth.status === 'healthy' ? 
      'healthy' : 'degraded';

    return {
      status,
      timestamp: TimeService.nowKST()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: TimeService.nowKST()
    };
  }
};