import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { AuthGuard } from '../services/auth.service';
import { db } from '../services/database.service';
import { cache } from '../services/cache.service';
import { Logger, PerformanceMonitor } from '../services/logger.service';
import { ResponseUtil, ErrorHandler } from '../utils/response.util';
import { ValidationUtil } from '../utils/validation.util';
import { TimeService } from '../services/time.service';
import { ShiftSchedule, PaginatedResponse, PaginationCursor } from '../types/common';

/**
 * 근무표 관리 Lambda 핸들러
 * CRUD 및 커서 기반 페이지네이션 지원
 */

/**
 * 근무표 생성/수정 요청 인터페이스
 */
interface ScheduleRequest {
  date: string; // YYYY-MM-DD
  shiftType: 'DAY' | 'MID' | 'NIGHT' | 'OFF';
  startAt?: string; // ISO 8601, OFF일 때 생략
  endAt?: string;   // ISO 8601, OFF일 때 생략
  commuteMin: number;
  note?: string;
}

/**
 * 대량 가져오기 요청 인터페이스
 */
interface BulkImportRequest {
  schedules: ScheduleRequest[];
  overwrite?: boolean; // 기존 데이터 덮어쓰기 여부
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

      logger.info('Schedule API request received', {
        method,
        path,
        queryParams: event.queryStringParameters
      });

      // CORS 프리플라이트 처리
      if (method === 'OPTIONS') {
        monitor.recordSuccess();
        return ResponseUtil.corsPreflightResponse();
      }

      // 라우팅
      let result: APIGatewayProxyResult;

      if (method === 'GET' && !path.includes('/bulk-import')) {
        result = await handleGetSchedules(event, logger);
      } else if (method === 'POST' && path.includes('/bulk-import')) {
        result = await handleBulkImport(event, logger);
      } else if (method === 'POST') {
        result = await handleCreateSchedule(event, logger);
      } else if (method === 'PUT') {
        result = await handleUpdateSchedule(event, logger);
      } else if (method === 'DELETE') {
        result = await handleDeleteSchedule(event, logger);
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
 * 근무표 목록 조회 (커서 기반 페이지네이션)
 */
async function handleGetSchedules(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  const correlationId = logger['correlationId'];

  try {
    // 인증 확인
    const auth = await AuthGuard.requireUser(event);

    // 쿼리 매개변수 파싱
    const params = event.queryStringParameters || {};
    const fromDate = params.from;
    const toDate = params.to;
    const limit = parseInt(params.limit || '30');
    const cursorDate = params.cursorDate;
    const cursorId = params.cursorId;

    // 매개변수 검증
    const paginationValidation = ValidationUtil.validatePaginationParams({
      limit,
      cursorDate,
      cursorId
    });

    if (!paginationValidation.isValid) {
      return ResponseUtil.validationError(
        '페이지네이션 매개변수가 유효하지 않습니다',
        correlationId,
        { errors: paginationValidation.errors }
      );
    }

    // 날짜 범위 검증
    if (fromDate && toDate) {
      const dateRangeValidation = ValidationUtil.validateDateRange(fromDate, toDate);
      if (!dateRangeValidation.isValid) {
        return ResponseUtil.validationError(
          '날짜 범위가 유효하지 않습니다',
          correlationId,
          { errors: dateRangeValidation.errors }
        );
      }
    }

    logger.info('Schedule list requested', {
      userId: auth.userId.substring(0, 8) + '***',
      fromDate,
      toDate,
      limit,
      hasCursor: !!(cursorDate && cursorId)
    });

    // 쿼리 구성
    const whereConditions = ['user_id = $1'];
    const queryParams = [auth.userId];
    let paramIndex = 2;

    // 날짜 범위 필터
    if (fromDate) {
      whereConditions.push(`date >= $${paramIndex++}`);
      queryParams.push(fromDate);
    }

    if (toDate) {
      whereConditions.push(`date <= $${paramIndex++}`);
      queryParams.push(toDate);
    }

    // 커서 조건
    let cursorCondition: string | null = null;
    if (cursorDate && cursorId) {
      cursorCondition = `(date, schedule_id) > ($${paramIndex}, $${paramIndex + 1})`;
      queryParams.push(cursorDate, cursorId);
    }

    // 쿼리 실행
    const baseQuery = `
      SELECT schedule_id as "scheduleId", user_id as "userId", date, 
             shift_type as "shiftType", start_at as "startAt", end_at as "endAt",
             commute_min as "commuteMin", note, 
             created_at as "createdAt", updated_at as "updatedAt"
      FROM shift_schedules
    `;

    const schedules = await db.queryWithCursor<ShiftSchedule>(
      baseQuery,
      whereConditions,
      cursorCondition,
      'date ASC, schedule_id ASC',
      limit + 1, // 다음 페이지 존재 여부 확인용
      queryParams
    );

    // 페이지네이션 처리
    const hasMore = schedules.length > limit;
    const data = hasMore ? schedules.slice(0, limit) : schedules;

    // 시간 형식 변환
    const formattedData = data.map(schedule => ({
      ...schedule,
      startAt: schedule.startAt ? TimeService.formatToKST(new Date(schedule.startAt)) : undefined,
      endAt: schedule.endAt ? TimeService.formatToKST(new Date(schedule.endAt)) : undefined,
      createdAt: TimeService.formatToKST(new Date(schedule.createdAt)),
      updatedAt: TimeService.formatToKST(new Date(schedule.updatedAt))
    }));

    // 다음 커서 생성
    let nextCursor: PaginationCursor | undefined;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      nextCursor = {
        cursorDate: lastItem.date,
        cursorId: lastItem.scheduleId
      };
    }

    const response: PaginatedResponse<ShiftSchedule> = {
      data: formattedData,
      nextCursor,
      hasMore,
      correlationId
    };

    logger.userActivity(auth.userId, 'schedules_viewed', {
      count: formattedData.length,
      dateRange: fromDate && toDate ? `${fromDate} to ${toDate}` : 'all'
    });

    return ResponseUtil.success(response, correlationId);
  } catch (error) {
    logger.error('Schedule list retrieval failed', error as Error);
    throw error;
  }
}

/**
 * 근무표 생성
 */
async function handleCreateSchedule(
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

    const request: ScheduleRequest = JSON.parse(event.body);

    // 입력 검증
    const validation = ValidationUtil.validateShiftSchedule(request);
    if (!validation.isValid) {
      return ResponseUtil.validationError(
        '근무표 데이터가 유효하지 않습니다',
        correlationId,
        { errors: validation.errors }
      );
    }

    logger.info('Schedule creation requested', {
      userId: auth.userId.substring(0, 8) + '***',
      date: request.date,
      shiftType: request.shiftType
    });

    // 중복 확인
    const existingSchedule = await db.queryOne(
      'SELECT schedule_id FROM shift_schedules WHERE user_id = $1 AND date = $2',
      [auth.userId, request.date]
    );

    if (existingSchedule) {
      return ResponseUtil.conflictError(
        '해당 날짜에 이미 근무표가 존재합니다',
        correlationId,
        { date: request.date }
      );
    }

    // 근무 시간 겹침 검증 (OFF가 아닌 경우)
    if (request.shiftType !== 'OFF' && request.startAt && request.endAt) {
      const hasOverlap = await db.checkScheduleOverlap(
        auth.userId,
        request.date,
        request.startAt,
        request.endAt
      );

      if (hasOverlap) {
        return ResponseUtil.conflictError(
          '근무 시간이 기존 근무표와 겹칩니다',
          correlationId,
          { date: request.date }
        );
      }
    }

    // 근무표 생성
    const result = await db.queryOne<ShiftSchedule>(
      `INSERT INTO shift_schedules (user_id, date, shift_type, start_at, end_at, commute_min, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING schedule_id as "scheduleId", user_id as "userId", date, 
                 shift_type as "shiftType", start_at as "startAt", end_at as "endAt",
                 commute_min as "commuteMin", note, 
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [
        auth.userId,
        request.date,
        request.shiftType,
        request.startAt || null,
        request.endAt || null,
        request.commuteMin,
        request.note || null
      ]
    );

    if (!result) {
      throw new Error('근무표 생성에 실패했습니다');
    }

    // 시간 형식 변환
    const formattedResult = {
      ...result,
      startAt: result.startAt ? TimeService.formatToKST(new Date(result.startAt)) : undefined,
      endAt: result.endAt ? TimeService.formatToKST(new Date(result.endAt)) : undefined,
      createdAt: TimeService.formatToKST(new Date(result.createdAt)),
      updatedAt: TimeService.formatToKST(new Date(result.updatedAt))
    };

    // 캐시 무효화 (해당 날짜 이후)
    await cache.invalidateUserCache(auth.userId, request.date);

    logger.userActivity(auth.userId, 'schedule_created', {
      date: request.date,
      shiftType: request.shiftType
    });

    return ResponseUtil.created(formattedResult, correlationId);
  } catch (error) {
    logger.error('Schedule creation failed', error as Error);
    throw error;
  }
}

/**
 * 근무표 수정
 */
async function handleUpdateSchedule(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  const correlationId = logger['correlationId'];

  try {
    // 인증 확인
    const auth = await AuthGuard.requireUser(event);

    // 날짜 매개변수 추출
    const pathParts = event.path.split('/');
    const date = pathParts[pathParts.length - 1];

    if (!date) {
      return ResponseUtil.validationError('날짜 매개변수가 필요합니다', correlationId);
    }

    // 날짜 형식 검증
    const errors: any[] = [];
    ValidationUtil.validateDate(date, 'date', errors);
    if (errors.length > 0) {
      return ResponseUtil.validationError(
        '날짜 형식이 유효하지 않습니다',
        correlationId,
        { errors }
      );
    }

    // 요청 본문 파싱
    if (!event.body) {
      return ResponseUtil.validationError('요청 본문이 필요합니다', correlationId);
    }

    const request: Partial<ScheduleRequest> = JSON.parse(event.body);

    // 입력 검증
    const validation = ValidationUtil.validateShiftSchedule({ ...request, date });
    if (!validation.isValid) {
      return ResponseUtil.validationError(
        '근무표 데이터가 유효하지 않습니다',
        correlationId,
        { errors: validation.errors }
      );
    }

    logger.info('Schedule update requested', {
      userId: auth.userId.substring(0, 8) + '***',
      date,
      shiftType: request.shiftType
    });

    // 기존 근무표 확인
    const existingSchedule = await db.queryOne(
      'SELECT schedule_id FROM shift_schedules WHERE user_id = $1 AND date = $2',
      [auth.userId, date]
    );

    if (!existingSchedule) {
      return ResponseUtil.notFoundError(
        '해당 날짜의 근무표를 찾을 수 없습니다',
        correlationId
      );
    }

    // 근무 시간 겹침 검증 (OFF가 아닌 경우)
    if (request.shiftType !== 'OFF' && request.startAt && request.endAt) {
      const hasOverlap = await db.checkScheduleOverlap(
        auth.userId,
        date,
        request.startAt,
        request.endAt,
        existingSchedule.schedule_id
      );

      if (hasOverlap) {
        return ResponseUtil.conflictError(
          '근무 시간이 다른 근무표와 겹칩니다',
          correlationId,
          { date }
        );
      }
    }

    // 업데이트 실행
    const result = await db.queryOne<ShiftSchedule>(
      `UPDATE shift_schedules 
       SET shift_type = $3, start_at = $4, end_at = $5, commute_min = $6, note = $7, updated_at = NOW()
       WHERE user_id = $1 AND date = $2
       RETURNING schedule_id as "scheduleId", user_id as "userId", date, 
                 shift_type as "shiftType", start_at as "startAt", end_at as "endAt",
                 commute_min as "commuteMin", note, 
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [
        auth.userId,
        date,
        request.shiftType,
        request.startAt || null,
        request.endAt || null,
        request.commuteMin,
        request.note || null
      ]
    );

    if (!result) {
      throw new Error('근무표 수정에 실패했습니다');
    }

    // 시간 형식 변환
    const formattedResult = {
      ...result,
      startAt: result.startAt ? TimeService.formatToKST(new Date(result.startAt)) : undefined,
      endAt: result.endAt ? TimeService.formatToKST(new Date(result.endAt)) : undefined,
      createdAt: TimeService.formatToKST(new Date(result.createdAt)),
      updatedAt: TimeService.formatToKST(new Date(result.updatedAt))
    };

    // 캐시 무효화 (해당 날짜 이후)
    await cache.invalidateUserCache(auth.userId, date);

    logger.userActivity(auth.userId, 'schedule_updated', {
      date,
      shiftType: request.shiftType
    });

    return ResponseUtil.success(formattedResult, correlationId);
  } catch (error) {
    logger.error('Schedule update failed', error as Error);
    throw error;
  }
}

/**
 * 근무표 삭제
 */
async function handleDeleteSchedule(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  const correlationId = logger['correlationId'];

  try {
    // 인증 확인
    const auth = await AuthGuard.requireUser(event);

    // 날짜 매개변수 추출
    const pathParts = event.path.split('/');
    const date = pathParts[pathParts.length - 1];

    if (!date) {
      return ResponseUtil.validationError('날짜 매개변수가 필요합니다', correlationId);
    }

    logger.info('Schedule deletion requested', {
      userId: auth.userId.substring(0, 8) + '***',
      date
    });

    // 삭제 실행
    const result = await db.query(
      'DELETE FROM shift_schedules WHERE user_id = $1 AND date = $2',
      [auth.userId, date]
    );

    if (result.length === 0) {
      return ResponseUtil.notFoundError(
        '해당 날짜의 근무표를 찾을 수 없습니다',
        correlationId
      );
    }

    // 캐시 무효화 (해당 날짜 이후)
    await cache.invalidateUserCache(auth.userId, date);

    logger.userActivity(auth.userId, 'schedule_deleted', { date });

    return ResponseUtil.deleted(correlationId);
  } catch (error) {
    logger.error('Schedule deletion failed', error as Error);
    throw error;
  }
}

/**
 * 대량 가져오기
 */
async function handleBulkImport(
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

    const request: BulkImportRequest = JSON.parse(event.body);

    if (!request.schedules || !Array.isArray(request.schedules)) {
      return ResponseUtil.validationError('schedules 배열이 필요합니다', correlationId);
    }

    if (request.schedules.length === 0) {
      return ResponseUtil.validationError('최소 1개의 근무표가 필요합니다', correlationId);
    }

    if (request.schedules.length > 100) {
      return ResponseUtil.validationError('한 번에 최대 100개까지 가져올 수 있습니다', correlationId);
    }

    logger.info('Bulk import requested', {
      userId: auth.userId.substring(0, 8) + '***',
      count: request.schedules.length,
      overwrite: request.overwrite || false
    });

    // 각 근무표 검증
    const validationErrors: any[] = [];
    for (let i = 0; i < request.schedules.length; i++) {
      const schedule = request.schedules[i];
      const validation = ValidationUtil.validateShiftSchedule(schedule);
      
      if (!validation.isValid) {
        validationErrors.push({
          index: i,
          date: schedule.date,
          errors: validation.errors
        });
      }
    }

    if (validationErrors.length > 0) {
      return ResponseUtil.validationError(
        '일부 근무표 데이터가 유효하지 않습니다',
        correlationId,
        { validationErrors }
      );
    }

    // 트랜잭션으로 대량 처리
    const results = await db.transaction(async (client) => {
      const importResults = [];

      for (const schedule of request.schedules) {
        try {
          // 기존 데이터 확인
          const existing = await client.query(
            'SELECT schedule_id FROM shift_schedules WHERE user_id = $1 AND date = $2',
            [auth.userId, schedule.date]
          );

          if (existing.rows.length > 0) {
            if (request.overwrite) {
              // 덮어쓰기
              await client.query(
                `UPDATE shift_schedules 
                 SET shift_type = $3, start_at = $4, end_at = $5, commute_min = $6, note = $7, updated_at = NOW()
                 WHERE user_id = $1 AND date = $2`,
                [
                  auth.userId,
                  schedule.date,
                  schedule.shiftType,
                  schedule.startAt || null,
                  schedule.endAt || null,
                  schedule.commuteMin,
                  schedule.note || null
                ]
              );
              importResults.push({ date: schedule.date, action: 'updated' });
            } else {
              // 건너뛰기
              importResults.push({ date: schedule.date, action: 'skipped', reason: 'already_exists' });
            }
          } else {
            // 새로 생성
            await client.query(
              `INSERT INTO shift_schedules (user_id, date, shift_type, start_at, end_at, commute_min, note)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                auth.userId,
                schedule.date,
                schedule.shiftType,
                schedule.startAt || null,
                schedule.endAt || null,
                schedule.commuteMin,
                schedule.note || null
              ]
            );
            importResults.push({ date: schedule.date, action: 'created' });
          }
        } catch (error) {
          importResults.push({ 
            date: schedule.date, 
            action: 'failed', 
            error: (error as Error).message 
          });
        }
      }

      return importResults;
    });

    // 캐시 무효화 (전체 사용자 캐시)
    await cache.invalidateUserCache(auth.userId);

    const summary = {
      total: request.schedules.length,
      created: results.filter(r => r.action === 'created').length,
      updated: results.filter(r => r.action === 'updated').length,
      skipped: results.filter(r => r.action === 'skipped').length,
      failed: results.filter(r => r.action === 'failed').length,
      details: results
    };

    logger.userActivity(auth.userId, 'bulk_import_completed', summary);

    return ResponseUtil.success(summary, correlationId);
  } catch (error) {
    logger.error('Bulk import failed', error as Error);
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
    const cacheHealth = await cache.healthCheck();
    
    const health = {
      service: 'schedule-handler',
      status: dbHealth.status === 'healthy' && cacheHealth.status === 'healthy' ? 'healthy' : 'degraded',
      timestamp: TimeService.nowKST(),
      database: dbHealth.status === 'healthy',
      cache: cacheHealth.status === 'healthy',
      version: process.env.npm_package_version || '1.0.0'
    };

    return ResponseUtil.healthCheck(
      health.status as any,
      correlationId,
      health
    );
  } catch (error) {
    logger.error('Health check failed', error as Error);
    return ResponseUtil.healthCheck('unhealthy', correlationId, {
      service: 'schedule-handler',
      error: (error as Error).message
    });
  }
}