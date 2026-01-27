/**
 * 인증 가드 유틸리티 사용 예시
 * 
 * 이 파일은 새로운 AuthGuardUtil과 AuthMiddleware의 사용법을 보여줍니다.
 * Requirements: 10.1, 10.5 - Cross-user access 차단 및 강제 인증
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { AuthGuardUtil, RouteHandler, createCRUDHandler, createUserResourceHandler } from '../utils/auth.guard';
import { AuthMiddleware } from '../utils/auth.middleware';
import { AuthResult, B2BAuthResult } from '../services/auth.service';
import { Logger, PerformanceMonitor } from '../services/logger.service';
import { ResponseUtil } from '../utils/response.util';

/**
 * 예시 1: 기본 사용자 인증 핸들러
 * 가장 일반적인 패턴 - 모든 사용자 API에서 사용
 */

// 라우트 핸들러 정의
const userRoutes: { [key: string]: RouteHandler<AuthResult> } = {
  'GET:/api/v1/users/profile': async (event, auth, logger, monitor) => {
    logger.info('Profile requested', { userId: auth.userId });
    
    // 실제 비즈니스 로직
    const profile = { userId: auth.userId, name: 'User Profile' };
    
    return ResponseUtil.success(profile, logger['correlationId']);
  },

  'PUT:/api/v1/users/profile': async (event, auth, logger, monitor) => {
    logger.info('Profile update requested', { userId: auth.userId });
    
    // 업데이트 로직
    const updatedProfile = { userId: auth.userId, updated: true };
    
    return ResponseUtil.success(updatedProfile, logger['correlationId']);
  }
};

// 핸들러 생성 - 기본 인증 적용
export const basicUserHandler = AuthGuardUtil.createAuthenticatedHandler(userRoutes, {
  enableCors: true,
  enableHealthCheck: true,
  enableMetrics: true
});

/**
 * 예시 2: B2B 관리자 인증 핸들러
 * B2B 통계 API에서 사용
 */

const b2bRoutes: { [key: string]: RouteHandler<B2BAuthResult> } = {
  'GET:/api/v1/b2b/stats/sleep-quality': async (event, auth, logger, monitor) => {
    logger.info('B2B sleep quality stats requested', { 
      userId: auth.userId, 
      orgId: auth.orgId 
    });
    
    // 조직별 통계 조회 로직
    const stats = { orgId: auth.orgId, avgSleepHours: 7.5 };
    
    return ResponseUtil.success(stats, logger['correlationId']);
  }
};

// B2B 핸들러 생성 - B2B 관리자 인증 적용
export const b2bHandler = AuthGuardUtil.createB2BHandler(b2bRoutes, {
  enableCors: true,
  enableMetrics: true,
  enableRateLimit: true // B2B API는 rate limiting 적용
});

/**
 * 예시 3: 리소스 소유권 검증 핸들러
 * 특정 리소스에 대한 접근 권한 확인
 */

const scheduleRoutes: { [key: string]: RouteHandler<AuthResult> } = {
  'GET:/api/v1/users/{id}/schedules': async (event, auth, logger, monitor) => {
    logger.info('User schedules requested', { userId: auth.userId });
    
    // 사용자의 근무표 조회
    const schedules = [{ date: '2024-01-26', shiftType: 'DAY' }];
    
    return ResponseUtil.success(schedules, logger['correlationId']);
  },

  'POST:/api/v1/users/{id}/schedules': async (event, auth, logger, monitor) => {
    logger.info('Schedule creation requested', { userId: auth.userId });
    
    // 근무표 생성 로직
    const newSchedule = { id: 'new-schedule', userId: auth.userId };
    
    return ResponseUtil.created(newSchedule, logger['correlationId']);
  }
};

// 리소스 소유권 검증 핸들러 생성
export const scheduleHandler = AuthGuardUtil.createResourceHandler(
  scheduleRoutes,
  // 경로에서 사용자 ID 추출
  (event) => {
    const pathParts = event.path.split('/');
    const userIndex = pathParts.findIndex(part => part === 'users');
    return userIndex >= 0 && userIndex < pathParts.length - 1 
      ? pathParts[userIndex + 1] 
      : '';
  },
  {
    enableCors: true,
    enableMetrics: true
  }
);

/**
 * 예시 4: 파일 접근 권한 핸들러
 * 파일 다운로드/수정 시 사용
 */

const fileRoutes: { [key: string]: RouteHandler<AuthResult> } = {
  'GET:/api/v1/files/{id}/download': async (event, auth, logger, monitor) => {
    logger.info('File download requested', { userId: auth.userId });
    
    // 파일 다운로드 URL 생성
    const downloadUrl = 'https://s3.amazonaws.com/bucket/file.pdf';
    
    return ResponseUtil.success({ downloadUrl }, logger['correlationId']);
  }
};

// 파일 접근 권한 핸들러 생성
export const fileHandler = AuthGuardUtil.createFileHandler(
  fileRoutes,
  // 경로에서 파일 ID 추출
  (event) => {
    const pathParts = event.path.split('/');
    const fileIndex = pathParts.findIndex(part => part === 'files');
    return fileIndex >= 0 && fileIndex < pathParts.length - 1 
      ? pathParts[fileIndex + 1] 
      : '';
  },
  {
    enableCors: true,
    enableMetrics: true
  }
);

/**
 * 예시 5: 온보딩 전용 핸들러
 * 사용자 생성 허용
 */

const onboardingRoutes: { [key: string]: RouteHandler<any> } = {
  'POST:/api/v1/users/onboarding': async (event, auth, logger, monitor) => {
    logger.info('Onboarding requested', { 
      cognitoSub: auth.cognitoSub,
      hasExistingUser: !!auth.userId 
    });
    
    if (auth.userId) {
      return ResponseUtil.conflictError('이미 온보딩이 완료된 사용자입니다', logger['correlationId']);
    }
    
    // 새 사용자 생성 로직
    const newUser = { 
      userId: 'new-user-id', 
      cognitoSub: auth.cognitoSub,
      email: auth.email 
    };
    
    return ResponseUtil.created(newUser, logger['correlationId']);
  }
};

// 온보딩 핸들러 생성
export const onboardingHandler = AuthGuardUtil.createOnboardingHandler(onboardingRoutes, {
  enableCors: true,
  enableMetrics: true
});

/**
 * 예시 6: Rate Limited 핸들러
 * 엔진 API 등 제한이 필요한 경우
 */

const engineRoutes: { [key: string]: RouteHandler<AuthResult> } = {
  'GET:/api/v1/engines/shift-to-sleep': async (event, auth, logger, monitor) => {
    logger.info('Shift-to-sleep engine requested', { userId: auth.userId });
    
    // 엔진 계산 로직
    const result = {
      sleepMain: {
        startAt: '2024-01-26T22:00:00+09:00',
        endAt: '2024-01-27T06:00:00+09:00'
      }
    };
    
    return ResponseUtil.engineResponse({ result }, logger['correlationId']);
  }
};

// Rate Limited 핸들러 생성
export const engineHandler = AuthGuardUtil.createRateLimitedHandler(engineRoutes, {
  enableCors: true,
  enableMetrics: true,
  enableRateLimit: true
});

/**
 * 예시 7: 헬스체크 핸들러 (인증 불필요)
 */

export const healthCheckHandler = AuthGuardUtil.createHealthCheckHandler(
  async (event, logger) => {
    logger.info('Health check requested');
    
    const health = {
      service: 'example-service',
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
    
    return ResponseUtil.healthCheck('healthy', logger['correlationId'], health);
  }
);

/**
 * 예시 8: AuthMiddleware 직접 사용
 * 더 세밀한 제어가 필요한 경우
 */

export const customHandler = AuthMiddleware.withOptions(
  {
    requireAuth: true,
    enableRateLimit: true,
    requireResourceOwnership: true,
    resourceIdExtractor: (event) => {
      // 요청 본문에서 리소스 ID 추출
      if (!event.body) return '';
      try {
        const body = JSON.parse(event.body);
        return body.resourceId || '';
      } catch {
        return '';
      }
    }
  },
  async (event, auth, logger) => {
    logger.info('Custom handler executed', { userId: auth.userId });
    
    return ResponseUtil.success({ message: 'Custom logic executed' }, logger['correlationId']);
  }
);

/**
 * 예시 9: 편의 함수 사용
 * 자주 사용되는 패턴을 간단하게
 */

// CRUD 핸들러 생성
export const simpleCRUDHandler = createCRUDHandler({
  get: async (event, auth, logger, monitor) => {
    return ResponseUtil.success({ data: 'GET response' }, logger['correlationId']);
  },
  post: async (event, auth, logger, monitor) => {
    return ResponseUtil.created({ data: 'POST response' }, logger['correlationId']);
  }
});

// 사용자별 리소스 핸들러 생성
export const userResourceHandler = createUserResourceHandler({
  get: async (event, auth, logger, monitor) => {
    return ResponseUtil.success({ data: 'User resource GET' }, logger['correlationId']);
  }
});

/**
 * 예시 10: 미들웨어 체이닝
 * 여러 미들웨어를 조합하는 경우
 */

import { MiddlewareChain, commonMiddlewares } from '../utils/auth.middleware';

export const chainedHandler = new MiddlewareChain()
  .use(commonMiddlewares.requestLogging)
  .use(commonMiddlewares.requestSizeLimit(1024 * 1024)) // 1MB 제한
  .use(commonMiddlewares.contentTypeValidation(['application/json']))
  // @ts-ignore - 예제 파일이므로 타입 체크 건너뛰기
  .execute(async (event: APIGatewayProxyEvent, auth: any, logger: any, monitor: any) => {
    logger.info('Chained handler executed', { userId: auth.userId });
    
    return ResponseUtil.success({ message: 'Chained execution' }, logger['correlationId']);
  });

/**
 * 예시 11: 실제 Lambda 함수에서의 사용법
 * 기존 Lambda 함수를 새로운 패턴으로 마이그레이션
 */

// 기존 방식 (수동 인증)
export const oldStyleHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  try {
    // 수동으로 인증 처리
    const correlationId = event.headers['X-Correlation-Id'] || 'manual-id';
    const logger = new Logger(correlationId, context.functionName);
    
    // CORS 처리
    if (event.httpMethod === 'OPTIONS') {
      return ResponseUtil.corsPreflightResponse();
    }
    
    // 인증 확인 (수동)
    // const auth = await AuthGuard.requireUser(event);
    
    // 비즈니스 로직...
    
    return ResponseUtil.success({ message: 'Old style' }, correlationId);
  } catch (error) {
    // 에러 처리...
    return ResponseUtil.internalError('Error occurred', 'error-id');
  }
};

// 새로운 방식 (자동 인증)
const newStyleRoutes: { [key: string]: RouteHandler<AuthResult> } = {
  'GET:/api/v1/example': async (event, auth, logger, monitor) => {
    // 인증은 자동으로 처리됨
    // CORS, 에러 처리, 로깅도 자동
    
    logger.info('New style handler', { userId: auth.userId });
    
    return ResponseUtil.success({ message: 'New style' }, logger['correlationId']);
  }
};

export const newStyleHandler = AuthGuardUtil.createAuthenticatedHandler(newStyleRoutes, {
  enableCors: true,
  enableHealthCheck: true,
  enableMetrics: true
});

/**
 * 사용법 요약:
 * 
 * 1. 기본 사용자 API: AuthGuardUtil.createAuthenticatedHandler()
 * 2. B2B 관리자 API: AuthGuardUtil.createB2BHandler()
 * 3. 시스템 관리자 API: AuthGuardUtil.createSystemHandler()
 * 4. 리소스 소유권 확인: AuthGuardUtil.createResourceHandler()
 * 5. 파일 접근 권한: AuthGuardUtil.createFileHandler()
 * 6. 온보딩 API: AuthGuardUtil.createOnboardingHandler()
 * 7. Rate Limited API: AuthGuardUtil.createRateLimitedHandler()
 * 8. 헬스체크: AuthGuardUtil.createHealthCheckHandler()
 * 9. 커스텀 로직: AuthMiddleware.withOptions()
 * 10. 편의 함수: createCRUDHandler(), createUserResourceHandler() 등
 * 
 * 모든 패턴에서 다음이 자동으로 처리됩니다:
 * - JWT 토큰 검증
 * - Cross-user access 차단
 * - CORS 프리플라이트
 * - 에러 처리 및 표준화된 응답
 * - 로깅 및 메트릭 수집
 * - Correlation ID 관리
 * - Rate Limiting (옵션)
 * - 헬스체크 (옵션)
 */