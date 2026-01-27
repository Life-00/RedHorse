import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { AuthGuard } from '../services/auth.service';
import { db } from '../services/database.service';
import { Logger, PerformanceMonitor } from '../services/logger.service';
import { ResponseUtil, ErrorHandler } from '../utils/response.util';
import { TimeService } from '../services/time.service';
import { DashboardResponse, EngineResponse, JumpstartChecklist } from '../types/common';

/**
 * 대시보드 Lambda 핸들러
 * 홈 대시보드 및 점프스타트 체크리스트 관리
 */

/**
 * 체크리스트 완료 요청 인터페이스
 */
interface CompleteChecklistRequest {
  itemKey: string;
}

/**
 * 메인 핸들러
 */
export const handler = ErrorHandler.asyncHandler(
  async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const correlationId = event.headers['X-Correlation-Id'] || 
                         event.headers['x-correlation-id'] || 
                         `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const logger = new Logger(correlationId, context.functionName);
    const monitor = new PerformanceMonitor(logger, `${event.httpMethod} ${event.path}`);

    try {
      const method = event.httpMethod;
      const path = event.path;

      logger.info('Dashboard API request received', {
        method,
        path
      });

      // CORS 프리플라이트 처리
      if (method === 'OPTIONS') {
        monitor.recordSuccess();
        return ResponseUtil.corsPreflightResponse();
      }

      // 라우팅
      let result: APIGatewayProxyResult;

      if (method === 'GET' && path.includes('/home')) {
        result = await handleHomeDashboard(event, logger);
      } else if (method === 'GET' && path.includes('/jumpstart')) {
        result = await handleGetJumpstart(event, logger);
      } else if (method === 'POST' && path.includes('/jumpstart/complete')) {
        result = await handleCompleteJumpstart(event, logger);
      } else if (method === 'GET' && path.includes('/health')) {
        result = await handleHealthCheck(event, logger);
      } else {
        result = ResponseUtil.notFoundError('API 엔드포인트를 찾을 수 없습니다', correlationId);
      }

      monitor.recordSuccess();
      logger.apiRequest(method, path, result.statusCode, monitor.getElapsedTime());

      return result;
    } catch (error) {
      monitor.recordFailure(error as Error);
      throw error;
    }
  }
);

/**
 * 홈 대시보드 데이터 제공
 */
async function handleHomeDashboard(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  const correlationId = logger['correlationId'];

  try {
    // 인증 확인
    const auth = await AuthGuard.requireUser(event);

    logger.info('Home dashboard requested', {
      userId: auth.userId.substring(0, 8) + '***'
    });

    // 오늘 날짜 (KST 기준)
    const today = TimeService.formatDateKST();

    // 병렬로 데이터 조회
    const [todaySchedule, jumpstartProgress] = await Promise.all([
      getTodaySchedule(auth.userId, today),
      getJumpstartProgress(auth.userId)
    ]);

    // 엔진 결과 조회 (EC2 FastAPI 서비스 호출 시뮬레이션)
    // 실제 구현에서는 EC2 FastAPI 서비스를 호출해야 함
    const [sleepRecommendation, caffeineAdvice, fatigueAssessment] = await Promise.all([
      getEngineResult(auth.userId, 'SHIFT_TO_SLEEP', today, logger),
      getEngineResult(auth.userId, 'CAFFEINE_CUTOFF', today, logger),
      getEngineResult(auth.userId, 'FATIGUE_RISK', today, logger)
    ]);

    // 대시보드 응답 구성
    const dashboardData: DashboardResponse = {
      sleepRecommendation,
      caffeineAdvice,
      fatigueAssessment,
      jumpstartProgress,
      todaySchedule: todaySchedule || undefined,
      disclaimer: 'This is not medical advice. Consult healthcare professionals for medical concerns.' // ADR-008
    };

    logger.userActivity(auth.userId, 'dashboard_viewed', {
      hasSchedule: !!todaySchedule,
      jumpstartProgress: jumpstartProgress.completedItems
    });

    // ADR-008: 의료 진단 면책 헤더 포함
    const response = ResponseUtil.success(dashboardData, correlationId);
    if (response.headers && dashboardData.disclaimer) {
      response.headers['X-Disclaimer'] = dashboardData.disclaimer;
    }

    return response;
  } catch (error) {
    logger.error('Home dashboard failed', error as Error);
    throw error;
  }
}

/**
 * 오늘 근무표 조회
 */
async function getTodaySchedule(userId: string, date: string) {
  const schedule = await db.queryOne<any>(
    `SELECT schedule_id as "scheduleId", date, shift_type as "shiftType", 
            start_at as "startAt", end_at as "endAt", commute_min as "commuteMin", note
     FROM shift_schedules 
     WHERE user_id = $1 AND date = $2`,
    [userId, date]
  );

  if (!schedule) {
    return null;
  }

  return {
    ...schedule,
    userId,
    startAt: schedule.startAt ? TimeService.formatToKST(new Date(schedule.startAt)) : undefined,
    endAt: schedule.endAt ? TimeService.formatToKST(new Date(schedule.endAt)) : undefined,
    createdAt: TimeService.nowKST(),
    updatedAt: TimeService.nowKST()
  };
}

/**
 * 점프스타트 진행률 조회
 */
async function getJumpstartProgress(userId: string) {
  const checklists = await db.query<{ completed: boolean }>(
    'SELECT completed FROM jumpstart_checklists WHERE user_id = $1',
    [userId]
  );

  const totalItems = checklists.length;
  const completedItems = checklists.filter(item => item.completed).length;

  // 다음 액션 결정
  let nextAction: string | undefined;
  if (completedItems < totalItems) {
    const nextItem = await db.queryOne<{ title: string }>(
      `SELECT title FROM jumpstart_checklists 
       WHERE user_id = $1 AND completed = false 
       ORDER BY created_at ASC LIMIT 1`,
      [userId]
    );
    nextAction = nextItem?.title;
  }

  return {
    completedItems,
    totalItems,
    nextAction
  };
}

/**
 * 엔진 결과 조회 (캐시 우선, 실시간 계산 폴백)
 */
async function getEngineResult(
  userId: string,
  engineType: string,
  targetDate: string,
  logger: Logger
): Promise<EngineResponse> {
  try {
    // 캐시에서 결과 조회
    const cachedResult = await db.queryOne<{ result: any }>(
      `SELECT result FROM engine_cache 
       WHERE user_id = $1 AND engine_type = $2 AND target_date = $3 
         AND expires_at > NOW()`,
      [userId, engineType, targetDate]
    );

    if (cachedResult) {
      logger.cacheOperation('get', `${userId}#${engineType}#${targetDate}`, true);
      return {
        ...cachedResult.result,
        generatedAt: TimeService.nowKST()
      };
    }

    logger.cacheOperation('get', `${userId}#${engineType}#${targetDate}`, false);

    // 실시간 계산 (EC2 FastAPI 서비스 호출 시뮬레이션)
    // 실제 구현에서는 process.env.EC2_ENGINE_URL로 HTTP 요청
    const engineResult = await calculateEngineRealtime(userId, engineType, targetDate, logger);

    // 결과 캐시 저장
    if (engineResult.result) {
      await db.query(
        `INSERT INTO engine_cache (user_id, engine_type, target_date, result, expires_at)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '48 hours')
         ON CONFLICT (user_id, engine_type, target_date)
         DO UPDATE SET result = EXCLUDED.result, generated_at = NOW(), expires_at = EXCLUDED.expires_at`,
        [userId, engineType, targetDate, JSON.stringify(engineResult)]
      );

      logger.cacheOperation('set', `${userId}#${engineType}#${targetDate}`);
    }

    return engineResult;
  } catch (error) {
    logger.error(`Engine ${engineType} calculation failed`, error as Error);
    
    // 에러 시 기본 응답
    return {
      whyNotShown: 'CALCULATION_ERROR',
      dataMissing: ['SYSTEM_ERROR'],
      generatedAt: TimeService.nowKST()
    };
  }
}

/**
 * 실시간 엔진 계산 (시뮬레이션)
 * 실제 구현에서는 EC2 FastAPI 서비스 호출
 */
async function calculateEngineRealtime(
  userId: string,
  engineType: string,
  targetDate: string,
  logger: Logger
): Promise<EngineResponse> {
  // 사용자 프로필 및 근무표 조회
  const [userProfile, todaySchedule, recentSchedules] = await Promise.all([
    db.queryOne<any>(
      'SELECT shift_type, commute_min FROM users WHERE user_id = $1',
      [userId]
    ),
    db.queryOne<any>(
      `SELECT shift_type, start_at, end_at, commute_min 
       FROM shift_schedules WHERE user_id = $1 AND date = $2`,
      [userId, targetDate]
    ),
    db.query<any>(
      `SELECT date, shift_type, start_at, end_at 
       FROM shift_schedules 
       WHERE user_id = $1 AND date BETWEEN $2 AND $3 
       ORDER BY date ASC`,
      [userId, TimeService.formatDateKST(TimeService.subtractDays(new Date(), 7)), targetDate]
    )
  ]);

  // 데이터 부족 검사
  if (!userProfile) {
    return {
      whyNotShown: 'INSUFFICIENT_DATA',
      dataMissing: ['USER_PROFILE'],
      generatedAt: TimeService.nowKST()
    };
  }

  if (!todaySchedule) {
    return {
      whyNotShown: 'INSUFFICIENT_DATA',
      dataMissing: ['SHIFT_SCHEDULE_TODAY'],
      generatedAt: TimeService.nowKST()
    };
  }

  // 엔진별 계산 로직 (간단한 시뮬레이션)
  let result: any;

  switch (engineType) {
    case 'SHIFT_TO_SLEEP':
      result = calculateShiftToSleep(todaySchedule, userProfile);
      break;
    case 'CAFFEINE_CUTOFF':
      result = calculateCaffeineDeadline(todaySchedule);
      break;
    case 'FATIGUE_RISK':
      result = calculateFatigueRisk(recentSchedules, userProfile);
      break;
    default:
      throw new Error(`Unknown engine type: ${engineType}`);
  }

  logger.engineCalculation(engineType, true, 100, userId); // 시뮬레이션: 100ms

  return {
    result,
    generatedAt: TimeService.nowKST()
  };
}

/**
 * Shift-to-Sleep 엔진 시뮬레이션
 */
function calculateShiftToSleep(schedule: any, profile: any) {
  const workStart = new Date(schedule.start_at);
  const commuteMin = schedule.commute_min || profile.commute_min;
  
  // 간단한 계산: 근무 시작 8시간 전에 수면 시작
  const sleepStart = TimeService.subtractMinutes(
    TimeService.subtractHours(workStart, 8),
    commuteMin
  );
  const sleepEnd = TimeService.subtractMinutes(workStart, commuteMin);

  return {
    sleepMain: {
      startAt: TimeService.formatToKST(sleepStart),
      endAt: TimeService.formatToKST(sleepEnd)
    }
  };
}

/**
 * Caffeine Cutoff 엔진 시뮬레이션
 */
function calculateCaffeineDeadline(schedule: any) {
  const workStart = new Date(schedule.start_at);
  
  // 간단한 계산: 근무 시작 6시간 전까지 카페인 섭취 가능
  const deadline = TimeService.subtractHours(workStart, 6);

  return {
    caffeineDeadline: TimeService.formatToKST(deadline),
    halfLifeInfo: {
      halfLifeHours: 5,
      timeline: [
        { hours: 0, remainingCaffeine: 100, percentage: 100 },
        { hours: 5, remainingCaffeine: 50, percentage: 50 },
        { hours: 10, remainingCaffeine: 25, percentage: 25 }
      ],
      safeThreshold: 25
    }
  };
}

/**
 * Fatigue Risk Score 엔진 시뮬레이션
 */
function calculateFatigueRisk(recentSchedules: any[], profile: any) {
  // 간단한 계산: 야간 근무 횟수 기반
  const nightShifts = recentSchedules.filter(s => s.shift_type === 'NIGHT').length;
  const fatigueScore = Math.min(nightShifts * 15, 100);
  
  let fatigueLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  if (fatigueScore <= 25) fatigueLevel = 'LOW';
  else if (fatigueScore <= 50) fatigueLevel = 'MEDIUM';
  else if (fatigueScore <= 75) fatigueLevel = 'HIGH';
  else fatigueLevel = 'CRITICAL';

  return {
    fatigueScore,
    fatigueLevel,
    breakdown: {
      sleepDeficit: Math.floor(fatigueScore * 0.4),
      consecutiveNights: Math.floor(fatigueScore * 0.3),
      commute: Math.floor(fatigueScore * 0.2),
      additional: Math.floor(fatigueScore * 0.1)
    },
    recommendations: [
      '충분한 수면을 취하세요',
      '규칙적인 수면 패턴을 유지하세요',
      '카페인 섭취를 조절하세요'
    ]
  };
}

/**
 * 점프스타트 체크리스트 조회
 */
async function handleGetJumpstart(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  const correlationId = logger['correlationId'];

  try {
    // 인증 확인
    const auth = await AuthGuard.requireUser(event);

    logger.info('Jumpstart checklist requested', {
      userId: auth.userId.substring(0, 8) + '***'
    });

    // 체크리스트 조회
    const checklists = await db.query<JumpstartChecklist>(
      `SELECT checklist_id as "checklistId", user_id as "userId", item_key as "itemKey",
              title, description, completed, completed_at as "completedAt", created_at as "createdAt"
       FROM jumpstart_checklists 
       WHERE user_id = $1 
       ORDER BY created_at ASC`,
      [auth.userId]
    );

    // 시간 형식 변환
    const formattedChecklists = checklists.map(item => ({
      ...item,
      completedAt: item.completedAt ? TimeService.formatToKST(new Date(item.completedAt)) : undefined,
      createdAt: TimeService.formatToKST(new Date(item.createdAt))
    }));

    const progress = {
      items: formattedChecklists,
      totalItems: checklists.length,
      completedItems: checklists.filter(item => item.completed).length,
      completionRate: checklists.length > 0 ? 
        Math.round((checklists.filter(item => item.completed).length / checklists.length) * 100) : 0
    };

    logger.userActivity(auth.userId, 'jumpstart_viewed', {
      totalItems: progress.totalItems,
      completedItems: progress.completedItems
    });

    return ResponseUtil.success(progress, correlationId);
  } catch (error) {
    logger.error('Jumpstart checklist retrieval failed', error as Error);
    throw error;
  }
}

/**
 * 점프스타트 체크리스트 완료 처리
 */
async function handleCompleteJumpstart(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  const correlationId = logger['correlationId'];

  try {
    // 인증 확인
    const auth = await AuthGuard.requireUser(event);

    // 요청 본문 파싱
    if (!event.body) {
      return ResponseUtil.validationError('요청 본문이 필요합니다', correlationId);
    }

    const request: CompleteChecklistRequest = JSON.parse(event.body);

    if (!request.itemKey) {
      return ResponseUtil.validationError('itemKey가 필요합니다', correlationId);
    }

    logger.info('Jumpstart item completion requested', {
      userId: auth.userId.substring(0, 8) + '***',
      itemKey: request.itemKey
    });

    // 체크리스트 항목 완료 처리
    const result = await db.queryOne<JumpstartChecklist>(
      `UPDATE jumpstart_checklists 
       SET completed = true, completed_at = NOW()
       WHERE user_id = $1 AND item_key = $2 AND completed = false
       RETURNING checklist_id as "checklistId", user_id as "userId", item_key as "itemKey",
                 title, description, completed, completed_at as "completedAt", created_at as "createdAt"`,
      [auth.userId, request.itemKey]
    );

    if (!result) {
      return ResponseUtil.notFoundError(
        '완료할 수 있는 체크리스트 항목을 찾을 수 없습니다',
        correlationId
      );
    }

    // 시간 형식 변환
    const formattedResult = {
      ...result,
      completedAt: result.completedAt ? TimeService.formatToKST(new Date(result.completedAt)) : undefined,
      createdAt: TimeService.formatToKST(new Date(result.createdAt))
    };

    logger.userActivity(auth.userId, 'jumpstart_completed', {
      itemKey: request.itemKey,
      title: result.title
    });

    return ResponseUtil.success(formattedResult, correlationId);
  } catch (error) {
    logger.error('Jumpstart completion failed', error as Error);
    throw error;
  }
}

/**
 * 헬스 체크
 */
async function handleHealthCheck(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  const correlationId = logger['correlationId'];

  try {
    const dbHealth = await db.healthCheck();
    
    const health = {
      service: 'dashboard-handler',
      status: dbHealth.status,
      timestamp: TimeService.nowKST(),
      database: dbHealth.status === 'healthy',
      engineService: process.env.EC2_ENGINE_URL ? 'configured' : 'not_configured',
      version: process.env.npm_package_version || '1.0.0'
    };

    return ResponseUtil.healthCheck(
      dbHealth.status as any,
      correlationId,
      health
    );
  } catch (error) {
    logger.error('Health check failed', error as Error);
    return ResponseUtil.healthCheck('unhealthy', correlationId, {
      service: 'dashboard-handler',
      error: (error as Error).message
    });
  }
}