import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { AuthGuard } from '../services/auth.service';
import { db } from '../services/database.service';
import { Logger, PerformanceMonitor } from '../services/logger.service';
import { ResponseUtil, ErrorHandler } from '../utils/response.util';
import { ValidationUtil } from '../utils/validation.util';
import { TimeService } from '../services/time.service';
import { UserProfile } from '../types/common';

/**
 * 사용자 관리 Lambda 핸들러
 * 온보딩, 프로필 CRUD 처리
 */

/**
 * 온보딩 요청 인터페이스
 */
interface OnboardingRequest {
  shiftType: 'TWO_SHIFT' | 'THREE_SHIFT' | 'FIXED_NIGHT' | 'IRREGULAR';
  commuteMin: number;
  wearableSettings: {
    enabled: boolean;
    deviceType?: 'APPLE_HEALTH' | 'GOOGLE_FIT';
  };
}

/**
 * 프로필 업데이트 요청 인터페이스
 */
interface ProfileUpdateRequest {
  shiftType?: 'TWO_SHIFT' | 'THREE_SHIFT' | 'FIXED_NIGHT' | 'IRREGULAR';
  commuteMin?: number;
  wearableConnected?: boolean;
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

      logger.info('User API request received', {
        method,
        path,
        userAgent: event.headers['User-Agent']
      });

      // CORS 프리플라이트 처리
      if (method === 'OPTIONS') {
        monitor.recordSuccess();
        return ResponseUtil.corsPreflightResponse();
      }

      // 라우팅
      let result: APIGatewayProxyResult;

      if (method === 'POST' && path.includes('/onboarding')) {
        result = await handleOnboarding(event, logger);
      } else if (method === 'GET' && path.includes('/profile')) {
        result = await handleGetProfile(event, logger);
      } else if (method === 'PUT' && path.includes('/profile')) {
        result = await handleUpdateProfile(event, logger);
      } else if (method === 'DELETE' && path.includes('/profile')) {
        result = await handleDeleteProfile(event, logger);
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
      throw error; // ErrorHandler.asyncHandler가 처리
    }
  }
);

/**
 * 사용자 온보딩 처리
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
async function handleOnboarding(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  const correlationId = logger['correlationId'];

  try {
    // 요청 본문 파싱
    if (!event.body) {
      return ResponseUtil.validationError('요청 본문이 필요합니다', correlationId);
    }

    const request: OnboardingRequest = JSON.parse(event.body);

    // 입력 검증
    const validation = ValidationUtil.validateOnboardingRequest(request);
    if (!validation.isValid) {
      return ResponseUtil.validationError(
        '입력 데이터가 유효하지 않습니다',
        correlationId,
        { errors: validation.errors }
      );
    }

    // 인증 정보 추출 (온보딩은 특별 처리)
    const claims = event.requestContext.authorizer?.claims;
    if (!claims?.sub) {
      return ResponseUtil.authenticationError('인증 정보가 없습니다', correlationId);
    }

    const cognitoSub = claims.sub;
    const email = claims.email || '';

    logger.info('User onboarding started', {
      cognitoSub: cognitoSub.substring(0, 8) + '***',
      shiftType: request.shiftType,
      email: email ? email.substring(0, 3) + '***@' + email.split('@')[1] : undefined
    });

    // 트랜잭션으로 사용자 생성
    const result = await db.transaction(async (client) => {
      // 기존 사용자 확인
      const existingUser = await client.query(
        'SELECT user_id FROM users WHERE cognito_sub = $1',
        [cognitoSub]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('이미 온보딩이 완료된 사용자입니다');
      }

      // 새 사용자 생성
      const userResult = await client.query(
        `INSERT INTO users (cognito_sub, shift_type, commute_min, wearable_connected, last_active_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING user_id, created_at`,
        [cognitoSub, request.shiftType, request.commuteMin, request.wearableSettings.enabled]
      );

      const userId = userResult.rows[0].user_id;
      const createdAt = userResult.rows[0].created_at;

      // 기본 점프스타트 체크리스트 생성
      const checklistItems = [
        { 
          key: 'setup_profile', 
          title: '프로필 설정 완료', 
          description: '교대 유형과 통근 시간을 설정해보세요',
          completed: true // 온보딩 완료 시 자동으로 체크
        },
        { 
          key: 'first_schedule', 
          title: '첫 근무표 입력', 
          description: '이번 주 근무 일정을 입력해보세요',
          completed: false
        },
        { 
          key: 'sleep_recommendation', 
          title: '수면 권장사항 확인', 
          description: '개인화된 수면 권장사항을 확인해보세요',
          completed: false
        },
        { 
          key: 'caffeine_timing', 
          title: '카페인 타이밍 확인', 
          description: '최적의 카페인 섭취 시간을 확인해보세요',
          completed: false
        },
        { 
          key: 'fatigue_assessment', 
          title: '피로도 평가', 
          description: '현재 피로도 상태를 확인해보세요',
          completed: false
        }
      ];

      for (const item of checklistItems) {
        await client.query(
          `INSERT INTO jumpstart_checklists (user_id, item_key, title, description, completed, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            userId, 
            item.key, 
            item.title, 
            item.description, 
            item.completed,
            item.completed ? new Date() : null
          ]
        );
      }

      return {
        userId,
        cognitoSub,
        shiftType: request.shiftType,
        commuteMin: request.commuteMin,
        wearableConnected: request.wearableSettings.enabled,
        createdAt: TimeService.formatToKST(new Date(createdAt))
      };
    });

    logger.info('User onboarding completed successfully', {
      userId: result.userId.substring(0, 8) + '***',
      shiftType: request.shiftType,
      wearableEnabled: request.wearableSettings.enabled
    });

    return ResponseUtil.created(result, correlationId);
  } catch (error) {
    logger.error('Onboarding failed', error as Error, {
      cognitoSub: event.requestContext.authorizer?.claims?.sub?.substring(0, 8) + '***'
    });
    
    if ((error as Error).message.includes('이미 온보딩이 완료된')) {
      return ResponseUtil.conflictError((error as Error).message, correlationId);
    }
    
    throw error;
  }
}

/**
 * 사용자 프로필 조회
 * Requirements: 1.5
 */
async function handleGetProfile(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  const correlationId = logger['correlationId'];

  try {
    // 인증 확인
    const auth = await AuthGuard.requireUser(event);
    
    logger.info('Profile retrieval requested', {
      userId: auth.userId.substring(0, 8) + '***'
    });

    // 프로필 조회
    const profile = await db.queryOne<UserProfile>(
      `SELECT user_id as "userId", cognito_sub as "cognitoSub", shift_type as "shiftType", 
              commute_min as "commuteMin", wearable_connected as "wearableConnected", 
              org_id as "orgId", last_active_at as "lastActiveAt", 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM users WHERE user_id = $1`,
      [auth.userId]
    );

    if (!profile) {
      return ResponseUtil.notFoundError('사용자 프로필을 찾을 수 없습니다', correlationId);
    }

    // 시간 형식 변환
    const formattedProfile = {
      ...profile,
      lastActiveAt: TimeService.formatToKST(new Date(profile.lastActiveAt)),
      createdAt: TimeService.formatToKST(new Date(profile.createdAt)),
      updatedAt: TimeService.formatToKST(new Date(profile.updatedAt))
    };

    logger.info('Profile retrieved successfully', {
      userId: auth.userId.substring(0, 8) + '***'
    });

    return ResponseUtil.success(formattedProfile, correlationId);
  } catch (error) {
    logger.error('Profile retrieval failed', error as Error);
    throw error;
  }
}

/**
 * 사용자 프로필 업데이트
 */
async function handleUpdateProfile(
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

    const request: ProfileUpdateRequest = JSON.parse(event.body);

    // 입력 검증
    const validation = ValidationUtil.validateUserProfile(request);
    if (!validation.isValid) {
      return ResponseUtil.validationError(
        '입력 데이터가 유효하지 않습니다',
        correlationId,
        { errors: validation.errors }
      );
    }

    logger.info('Profile update requested', {
      userId: auth.userId.substring(0, 8) + '***',
      fields: Object.keys(request)
    });

    // 업데이트할 필드 구성
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (request.shiftType !== undefined) {
      updateFields.push(`shift_type = $${paramIndex++}`);
      updateValues.push(request.shiftType);
    }

    if (request.commuteMin !== undefined) {
      updateFields.push(`commute_min = $${paramIndex++}`);
      updateValues.push(request.commuteMin);
    }

    if (request.wearableConnected !== undefined) {
      updateFields.push(`wearable_connected = $${paramIndex++}`);
      updateValues.push(request.wearableConnected);
    }

    if (updateFields.length === 0) {
      return ResponseUtil.validationError('업데이트할 필드가 없습니다', correlationId);
    }

    // 업데이트 실행
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(auth.userId);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING user_id as "userId", shift_type as "shiftType", 
                commute_min as "commuteMin", wearable_connected as "wearableConnected",
                updated_at as "updatedAt"
    `;

    const result = await db.queryOne(query, updateValues);

    if (!result) {
      return ResponseUtil.notFoundError('사용자를 찾을 수 없습니다', correlationId);
    }

    // 캐시 무효화
    await db.invalidateUserCache(auth.userId);

    // 시간 형식 변환
    const formattedResult = {
      ...result,
      updatedAt: TimeService.formatToKST(new Date(result.updatedAt))
    };

    logger.info('Profile updated successfully', {
      userId: auth.userId.substring(0, 8) + '***',
      updatedFields: Object.keys(request)
    });

    return ResponseUtil.success(formattedResult, correlationId);
  } catch (error) {
    logger.error('Profile update failed', error as Error);
    throw error;
  }
}

/**
 * 사용자 프로필 삭제 (계정 탈퇴)
 */
async function handleDeleteProfile(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  const correlationId = logger['correlationId'];

  try {
    // 인증 확인
    const auth = await AuthGuard.requireUser(event);

    logger.info('Profile deletion requested', {
      userId: auth.userId.substring(0, 8) + '***'
    });

    // 사용자 데이터 삭제 (CASCADE로 관련 데이터 자동 삭제)
    const result = await db.query(
      'DELETE FROM users WHERE user_id = $1 RETURNING user_id',
      [auth.userId]
    );

    if (result.length === 0) {
      return ResponseUtil.notFoundError('사용자를 찾을 수 없습니다', correlationId);
    }

    logger.info('Profile deleted successfully', {
      userId: auth.userId.substring(0, 8) + '***'
    });

    return ResponseUtil.deleted(correlationId);
  } catch (error) {
    logger.error('Profile deletion failed', error as Error);
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
    // 데이터베이스 연결 확인
    const dbHealth = await db.healthCheck();
    
    const health = {
      service: 'user-handler',
      status: dbHealth.status,
      timestamp: TimeService.nowKST(),
      database: dbHealth.status === 'healthy',
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
      service: 'user-handler',
      error: (error as Error).message
    });
  }
}