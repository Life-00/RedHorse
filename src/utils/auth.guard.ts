import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { AuthGuard, AuthResult, B2BAuthResult } from '../services/auth.service';
import { Logger, PerformanceMonitor } from '../services/logger.service';
import { ResponseUtil, ErrorHandler } from './response.util';
import { AuthMiddleware, AuthenticatedHandler } from './auth.middleware';

/**
 * 공통 인증 가드 유틸리티
 * 모든 Lambda 진입점에서 강제 호출되는 표준화된 인증 패턴 제공
 * 
 * Requirements: 10.1, 10.5 - Cross-user access 차단 및 강제 인증
 * 
 * 사용법:
 * 1. createAuthenticatedHandler() - 기본 사용자 인증
 * 2. createB2BHandler() - B2B 관리자 인증  
 * 3. createSystemHandler() - 시스템 관리자 인증
 * 4. createResourceHandler() - 리소스 소유권 검증
 * 5. createFileHandler() - 파일 접근 권한 검증
 */

/**
 * 라우팅 핸들러 타입
 */
export type RouteHandler<T = AuthResult> = (
  event: APIGatewayProxyEvent,
  auth: T,
  logger: Logger,
  monitor: PerformanceMonitor
) => Promise<APIGatewayProxyResult>;

/**
 * 라우팅 맵 타입
 */
export type RouteMap<T = AuthResult> = {
  [key: string]: RouteHandler<T>;
};

/**
 * 가드 옵션
 */
export interface GuardOptions {
  enableCors?: boolean;
  enableHealthCheck?: boolean;
  enableMetrics?: boolean;
  enableRateLimit?: boolean;
  customErrorHandler?: (error: Error, correlationId: string) => APIGatewayProxyResult;
}

/**
 * 기본 가드 옵션
 */
const DEFAULT_GUARD_OPTIONS: GuardOptions = {
  enableCors: true,
  enableHealthCheck: true,
  enableMetrics: true,
  enableRateLimit: false
};

/**
 * 인증 가드 유틸리티 클래스
 */
export class AuthGuardUtil {
  /**
   * 기본 사용자 인증 핸들러 생성
   * 모든 사용자 API에서 사용
   */
  static createAuthenticatedHandler(
    routes: RouteMap<AuthResult>,
    options: GuardOptions = {}
  ) {
    const mergedOptions = { ...DEFAULT_GUARD_OPTIONS, ...options };

    return ErrorHandler.asyncHandler(
      async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
        return AuthGuardUtil.executeWithAuth(
          event,
          context,
          routes,
          mergedOptions,
          (event) => AuthGuard.requireUser(event)
        );
      }
    );
  }

  /**
   * B2B 관리자 인증 핸들러 생성
   * B2B 통계 API에서 사용
   */
  static createB2BHandler(
    routes: RouteMap<B2BAuthResult>,
    options: GuardOptions = {}
  ) {
    const mergedOptions = { ...DEFAULT_GUARD_OPTIONS, ...options };

    return ErrorHandler.asyncHandler(
      async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
        return AuthGuardUtil.executeWithAuth(
          event,
          context,
          routes as RouteMap<any>,
          mergedOptions,
          (event) => AuthGuard.requireB2BAdmin(event)
        );
      }
    );
  }

  /**
   * 시스템 관리자 인증 핸들러 생성
   * 시스템 관리 API에서 사용
   */
  static createSystemHandler(
    routes: RouteMap<AuthResult>,
    options: GuardOptions = {}
  ) {
    const mergedOptions = { ...DEFAULT_GUARD_OPTIONS, ...options };

    return ErrorHandler.asyncHandler(
      async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
        return AuthGuardUtil.executeWithAuth(
          event,
          context,
          routes,
          mergedOptions,
          (event) => AuthGuard.requireSystemAdmin(event)
        );
      }
    );
  }

  /**
   * 리소스 소유권 검증 핸들러 생성
   * 특정 리소스 접근 시 사용
   */
  static createResourceHandler(
    routes: RouteMap<AuthResult>,
    resourceIdExtractor: (event: APIGatewayProxyEvent) => string,
    options: GuardOptions = {}
  ) {
    const mergedOptions = { ...DEFAULT_GUARD_OPTIONS, ...options };

    return ErrorHandler.asyncHandler(
      async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
        return AuthGuardUtil.executeWithAuth(
          event,
          context,
          routes,
          mergedOptions,
          async (event) => {
            const resourceUserId = resourceIdExtractor(event);
            return AuthGuard.requireResourceOwner(event, resourceUserId);
          }
        );
      }
    );
  }

  /**
   * 파일 접근 권한 핸들러 생성
   * 파일 다운로드/수정 시 사용
   */
  static createFileHandler(
    routes: RouteMap<AuthResult>,
    fileIdExtractor: (event: APIGatewayProxyEvent) => string,
    options: GuardOptions = {}
  ) {
    const mergedOptions = { ...DEFAULT_GUARD_OPTIONS, ...options };

    return ErrorHandler.asyncHandler(
      async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
        return AuthGuardUtil.executeWithAuth(
          event,
          context,
          routes,
          mergedOptions,
          async (event) => {
            const fileId = fileIdExtractor(event);
            return AuthGuard.requireFileAccess(event, fileId);
          }
        );
      }
    );
  }

  /**
   * 온보딩 전용 핸들러 생성
   * 사용자 생성 허용
   */
  static createOnboardingHandler(
    routes: RouteMap<any>,
    options: GuardOptions = {}
  ) {
    const mergedOptions = { ...DEFAULT_GUARD_OPTIONS, ...options };

    return ErrorHandler.asyncHandler(
      async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
        return AuthGuardUtil.executeWithAuth(
          event,
          context,
          routes,
          mergedOptions,
          (event) => AuthGuard.requireOnboarding(event)
        );
      }
    );
  }

  /**
   * Rate Limited 핸들러 생성
   * API 호출 빈도 제한이 필요한 경우
   */
  static createRateLimitedHandler(
    routes: RouteMap<AuthResult>,
    options: GuardOptions = {}
  ) {
    const mergedOptions = { ...DEFAULT_GUARD_OPTIONS, ...options, enableRateLimit: true };

    return ErrorHandler.asyncHandler(
      async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
        return AuthGuardUtil.executeWithAuth(
          event,
          context,
          routes,
          mergedOptions,
          (event) => AuthGuard.requireRateLimit(event)
        );
      }
    );
  }

  /**
   * 헬스체크 전용 핸들러 생성 (인증 불필요)
   * 시스템 상태 확인용
   */
  static createHealthCheckHandler(
    healthCheckFn: (event: APIGatewayProxyEvent, logger: Logger) => Promise<APIGatewayProxyResult>
  ) {
    return ErrorHandler.asyncHandler(
      async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
        const correlationId = AuthGuardUtil.extractCorrelationId(event);
        const logger = new Logger(correlationId, context.functionName);
        const monitor = new PerformanceMonitor(logger, `${event.httpMethod} ${event.path}`);

        try {
          // CORS 프리플라이트 처리
          if (event.httpMethod === 'OPTIONS') {
            monitor.recordSuccess();
            return ResponseUtil.corsPreflightResponse();
          }

          await AuthGuard.allowHealthCheck(event);
          const result = await healthCheckFn(event, logger);

          monitor.recordSuccess();
          logger.apiRequest(event.httpMethod, event.path, result.statusCode, monitor.getElapsedTime());

          return result;
        } catch (error) {
          monitor.recordFailure(error as Error);
          logger.error('Health check failed', error as Error);
          return ResponseUtil.internalError('Health check failed', correlationId);
        }
      }
    );
  }

  /**
   * 공통 인증 실행 로직
   */
  private static async executeWithAuth<T>(
    event: APIGatewayProxyEvent,
    context: Context,
    routes: RouteMap<T>,
    options: GuardOptions,
    authFunction: (event: APIGatewayProxyEvent) => Promise<T>
  ): Promise<APIGatewayProxyResult> {
    const correlationId = AuthGuardUtil.extractCorrelationId(event);
    const logger = new Logger(correlationId, context.functionName);
    const monitor = new PerformanceMonitor(logger, `${event.httpMethod} ${event.path}`);

    try {
      const method = event.httpMethod;
      const path = event.path;

      logger.info('API request received', {
        method,
        path,
        userAgent: event.headers['User-Agent'],
        sourceIp: event.requestContext.identity?.sourceIp
      });

      // CORS 프리플라이트 처리
      if (method === 'OPTIONS' && options.enableCors) {
        monitor.recordSuccess();
        return ResponseUtil.corsPreflightResponse();
      }

      // 헬스체크 처리 (인증 불필요)
      if (method === 'GET' && path.includes('/health') && options.enableHealthCheck) {
        await AuthGuard.allowHealthCheck(event);
        const health = await AuthGuardUtil.getHealthStatus(logger);
        monitor.recordSuccess();
        return ResponseUtil.healthCheck(health.status as any, correlationId, health);
      }

      // 인증 실행
      const auth = await authFunction(event);

      // Rate Limiting 확인
      if (options.enableRateLimit && auth && typeof auth === 'object' && 'userId' in auth) {
        await AuthGuard.requireRateLimit(event);
      }

      // 라우팅
      const routeKey = AuthGuardUtil.generateRouteKey(method, path);
      const handler = routes[routeKey];

      if (!handler) {
        return ResponseUtil.notFoundError('API 엔드포인트를 찾을 수 없습니다', correlationId);
      }

      // 핸들러 실행
      const result = await handler(event, auth, logger, monitor);

      monitor.recordSuccess();
      
      // 메트릭 수집
      if (options.enableMetrics) {
        logger.apiRequest(method, path, result.statusCode, monitor.getElapsedTime());
        
        if (auth && typeof auth === 'object' && 'userId' in auth) {
          logger.userActivity((auth as any).userId, 'api_call', {
            method,
            path,
            statusCode: result.statusCode,
            duration: monitor.getElapsedTime()
          });
        }
      }

      return result;

    } catch (error) {
      monitor.recordFailure(error as Error);
      
      // 커스텀 에러 핸들러 사용
      if (options.customErrorHandler) {
        return options.customErrorHandler(error as Error, correlationId);
      }

      // 기본 에러 처리
      return AuthGuardUtil.handleError(error as Error, correlationId, logger);
    }
  }

  /**
   * 라우트 키 생성
   */
  private static generateRouteKey(method: string, path: string): string {
    // 경로에서 동적 세그먼트 정규화
    const normalizedPath = path
      .replace(/\/[a-f0-9-]{36}(?=\/|$)/gi, '/{id}') // UUID 패턴
      .replace(/\/\d{4}-\d{2}-\d{2}(?=\/|$)/g, '/{date}') // 날짜 패턴
      .replace(/\/\d+(?=\/|$)/g, '/{id}'); // 숫자 ID 패턴

    return `${method}:${normalizedPath}`;
  }

  /**
   * Correlation ID 추출
   */
  private static extractCorrelationId(event: APIGatewayProxyEvent): string {
    return event.headers['X-Correlation-Id'] || 
           event.headers['x-correlation-id'] || 
           `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 헬스 상태 확인
   */
  private static async getHealthStatus(logger: Logger): Promise<any> {
    try {
      // 기본 헬스체크 정보
      return {
        service: 'auth-guard',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      };
    } catch (error) {
      logger.error('Health status check failed', error as Error);
      return {
        service: 'auth-guard',
        status: 'unhealthy',
        error: (error as Error).message
      };
    }
  }

  /**
   * 에러 처리
   */
  private static handleError(
    error: Error,
    correlationId: string,
    logger: Logger
  ): APIGatewayProxyResult {
    logger.error('Request processing failed', error, {
      errorType: error.constructor.name
    });

    // 인증/권한 에러
    if (error.name === 'AuthenticationError') {
      return ResponseUtil.authenticationError(error.message, correlationId);
    }

    if (error.name === 'AuthorizationError') {
      return ResponseUtil.authorizationError(error.message, correlationId);
    }

    // 검증 에러
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return ResponseUtil.validationError(error.message, correlationId);
    }

    // 리소스 없음
    if (error.message.includes('not found')) {
      return ResponseUtil.notFoundError(error.message, correlationId);
    }

    // 충돌 에러
    if (error.message.includes('conflict') || error.message.includes('already exists')) {
      return ResponseUtil.conflictError(error.message, correlationId);
    }

    // 기본 내부 에러
    return ResponseUtil.internalError(
      'Internal server error occurred',
      correlationId
    );
  }
}

/**
 * 편의 함수들 - 자주 사용되는 패턴
 */

/**
 * 간단한 CRUD 핸들러 생성
 */
export const createCRUDHandler = (handlers: {
  get?: RouteHandler<AuthResult>;
  post?: RouteHandler<AuthResult>;
  put?: RouteHandler<AuthResult>;
  delete?: RouteHandler<AuthResult>;
}, options?: GuardOptions) => {
  const routes: RouteMap<AuthResult> = {};

  if (handlers.get) routes['GET:/api/v1/{resource}'] = handlers.get;
  if (handlers.post) routes['POST:/api/v1/{resource}'] = handlers.post;
  if (handlers.put) routes['PUT:/api/v1/{resource}/{id}'] = handlers.put;
  if (handlers.delete) routes['DELETE:/api/v1/{resource}/{id}'] = handlers.delete;

  return AuthGuardUtil.createAuthenticatedHandler(routes, options);
};

/**
 * 사용자별 리소스 핸들러 생성
 */
export const createUserResourceHandler = (handlers: {
  get?: RouteHandler<AuthResult>;
  post?: RouteHandler<AuthResult>;
  put?: RouteHandler<AuthResult>;
  delete?: RouteHandler<AuthResult>;
}, options?: GuardOptions) => {
  const routes: RouteMap<AuthResult> = {};

  if (handlers.get) routes['GET:/api/v1/users/{id}/{resource}'] = handlers.get;
  if (handlers.post) routes['POST:/api/v1/users/{id}/{resource}'] = handlers.post;
  if (handlers.put) routes['PUT:/api/v1/users/{id}/{resource}/{resourceId}'] = handlers.put;
  if (handlers.delete) routes['DELETE:/api/v1/users/{id}/{resource}/{resourceId}'] = handlers.delete;

  return AuthGuardUtil.createResourceHandler(
    routes,
    (event) => {
      const pathParts = event.path.split('/');
      const userIndex = pathParts.findIndex(part => part === 'users');
      return userIndex >= 0 && userIndex < pathParts.length - 1 
        ? pathParts[userIndex + 1] 
        : '';
    },
    options
  );
};

/**
 * B2B 통계 핸들러 생성
 */
export const createB2BStatsHandler = (handlers: {
  getSleepQuality?: RouteHandler<B2BAuthResult>;
  getFatigueTrends?: RouteHandler<B2BAuthResult>;
  getShiftPatterns?: RouteHandler<B2BAuthResult>;
}, options?: GuardOptions) => {
  const routes: RouteMap<B2BAuthResult> = {};

  if (handlers.getSleepQuality) routes['GET:/api/v1/b2b/stats/sleep-quality'] = handlers.getSleepQuality;
  if (handlers.getFatigueTrends) routes['GET:/api/v1/b2b/stats/fatigue-trends'] = handlers.getFatigueTrends;
  if (handlers.getShiftPatterns) routes['GET:/api/v1/b2b/stats/shift-patterns'] = handlers.getShiftPatterns;

  return AuthGuardUtil.createB2BHandler(routes, options);
};

/**
 * 엔진 API 핸들러 생성 (Rate Limited)
 */
export const createEngineHandler = (handlers: {
  shiftToSleep?: RouteHandler<AuthResult>;
  caffeineCutoff?: RouteHandler<AuthResult>;
  fatigueRisk?: RouteHandler<AuthResult>;
}, options?: GuardOptions) => {
  const routes: RouteMap<AuthResult> = {};

  if (handlers.shiftToSleep) routes['GET:/api/v1/engines/shift-to-sleep'] = handlers.shiftToSleep;
  if (handlers.caffeineCutoff) routes['GET:/api/v1/engines/caffeine-cutoff'] = handlers.caffeineCutoff;
  if (handlers.fatigueRisk) routes['GET:/api/v1/engines/fatigue-risk'] = handlers.fatigueRisk;

  return AuthGuardUtil.createRateLimitedHandler(routes, {
    ...options,
    enableRateLimit: true
  });
};

/**
 * 타입 안전한 핸들러 래퍼
 */
export const withTypedAuth = <TAuth extends AuthResult, TData = any>(
  dataLoader: (auth: TAuth, event: APIGatewayProxyEvent) => Promise<TData>,
  handler: (
    event: APIGatewayProxyEvent,
    auth: TAuth & { data: TData },
    logger: Logger,
    monitor: PerformanceMonitor
  ) => Promise<APIGatewayProxyResult>
): RouteHandler<TAuth> => {
  return async (event, auth, logger, monitor) => {
    const data = await dataLoader(auth, event);
    const typedAuth = { ...auth, data } as TAuth & { data: TData };
    return handler(event, typedAuth, logger, monitor);
  };
};

/**
 * 캐시된 데이터와 함께 인증하는 핸들러
 */
export const withCachedAuth = <T>(
  cacheKey: (auth: AuthResult) => string,
  dataLoader: (auth: AuthResult) => Promise<T>,
  handler: RouteHandler<AuthResult & { cachedData?: T }>
): RouteHandler<AuthResult> => {
  return async (event, auth, logger, monitor) => {
    // 실제 구현에서는 캐시 서비스 사용
    const data = await dataLoader(auth);
    const authWithCache = { ...auth, cachedData: data };
    return handler(event, authWithCache, logger, monitor);
  };
};