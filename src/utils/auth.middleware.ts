import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AuthGuard, AuthResult, B2BAuthResult, AuthenticationError, AuthorizationError } from '../services/auth.service';
import { Logger } from '../services/logger.service';
import { ResponseUtil } from './response.util';

/**
 * 인증 미들웨어 유틸리티
 * 모든 Lambda 함수에서 일관된 인증 처리를 위한 미들웨어 패턴 제공
 * 
 * Requirements: 10.1, 10.5 - Cross-user access 차단 및 강제 인증
 */

/**
 * 인증된 핸들러 함수 타입
 */
export type AuthenticatedHandler<T = AuthResult> = (
  event: APIGatewayProxyEvent,
  auth: T,
  logger: Logger
) => Promise<APIGatewayProxyResult>;

/**
 * 미들웨어 옵션
 */
export interface MiddlewareOptions {
  requireAuth?: boolean;
  requireB2B?: boolean;
  requireSystemAdmin?: boolean;
  requireResourceOwnership?: boolean;
  requireFileAccess?: boolean;
  enableRateLimit?: boolean;
  allowOnboarding?: boolean;
  resourceIdExtractor?: (event: APIGatewayProxyEvent) => string;
  fileIdExtractor?: (event: APIGatewayProxyEvent) => string;
  orgIdExtractor?: (event: APIGatewayProxyEvent) => string;
}

/**
 * 기본 미들웨어 옵션
 */
const DEFAULT_OPTIONS: MiddlewareOptions = {
  requireAuth: true,
  requireB2B: false,
  requireSystemAdmin: false,
  requireResourceOwnership: false,
  requireFileAccess: false,
  enableRateLimit: false,
  allowOnboarding: false
};

/**
 * 인증 미들웨어 클래스
 */
export class AuthMiddleware {
  /**
   * 기본 사용자 인증 미들웨어
   * 모든 사용자 API에서 사용
   */
  static withAuth(handler: AuthenticatedHandler<AuthResult>): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult> {
    return AuthMiddleware.withOptions({ requireAuth: true }, handler);
  }

  /**
   * B2B 관리자 인증 미들웨어
   * B2B 통계 API에서 사용
   */
  static withB2BAuth(handler: AuthenticatedHandler<B2BAuthResult>): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult> {
    return AuthMiddleware.withOptions({ requireB2B: true }, handler as any);
  }

  /**
   * 시스템 관리자 인증 미들웨어
   * 시스템 관리 API에서 사용
   */
  static withSystemAuth(handler: AuthenticatedHandler<AuthResult>): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult> {
    return AuthMiddleware.withOptions({ requireSystemAdmin: true }, handler);
  }

  /**
   * 리소스 소유권 검증 미들웨어
   * 특정 리소스 접근 시 사용
   */
  static withResourceOwnership(
    resourceIdExtractor: (event: APIGatewayProxyEvent) => string,
    handler: AuthenticatedHandler<AuthResult>
  ): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult> {
    return AuthMiddleware.withOptions({
      requireAuth: true,
      requireResourceOwnership: true,
      resourceIdExtractor
    }, handler);
  }

  /**
   * 파일 접근 권한 미들웨어
   * 파일 다운로드/수정 시 사용
   */
  static withFileAccess(
    fileIdExtractor: (event: APIGatewayProxyEvent) => string,
    handler: AuthenticatedHandler<AuthResult>
  ): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult> {
    return AuthMiddleware.withOptions({
      requireAuth: true,
      requireFileAccess: true,
      fileIdExtractor
    }, handler);
  }

  /**
   * B2B 조직 접근 권한 미들웨어
   * 조직별 데이터 접근 시 사용
   */
  static withB2BAccess(
    orgIdExtractor: (event: APIGatewayProxyEvent) => string,
    handler: AuthenticatedHandler<B2BAuthResult>
  ): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult> {
    return AuthMiddleware.withOptions({
      requireB2B: true,
      orgIdExtractor
    }, handler as any);
  }

  /**
   * Rate Limiting 미들웨어
   * API 호출 빈도 제한
   */
  static withRateLimit(handler: AuthenticatedHandler<AuthResult>): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult> {
    return AuthMiddleware.withOptions({
      requireAuth: true,
      enableRateLimit: true
    }, handler);
  }

  /**
   * 온보딩 전용 미들웨어
   * 사용자 생성 허용
   */
  static withOnboarding(handler: AuthenticatedHandler<any>): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult> {
    return AuthMiddleware.withOptions({
      requireAuth: false,
      allowOnboarding: true
    }, handler);
  }

  /**
   * 헬스체크 미들웨어 (인증 불필요)
   * 시스템 상태 확인용
   */
  static withHealthCheck(handler: (event: APIGatewayProxyEvent, logger: Logger) => Promise<APIGatewayProxyResult>): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult> {
    return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      const correlationId = AuthMiddleware.extractCorrelationId(event);
      const logger = new Logger(correlationId, 'health-check');

      try {
        await AuthGuard.allowHealthCheck(event);
        return await handler(event, logger);
      } catch (error) {
        return AuthMiddleware.handleAuthError(error as Error, correlationId, logger);
      }
    };
  }

  /**
   * 옵션 기반 미들웨어 생성
   * 세밀한 인증 제어가 필요한 경우 사용
   */
  static withOptions<T = AuthResult>(
    options: MiddlewareOptions,
    handler: AuthenticatedHandler<T>
  ): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      const correlationId = AuthMiddleware.extractCorrelationId(event);
      const logger = new Logger(correlationId, 'auth-middleware');

      try {
        // CORS 프리플라이트 처리
        if (event.httpMethod === 'OPTIONS') {
          return ResponseUtil.corsPreflightResponse();
        }

        let authResult: any;

        // 온보딩 처리
        if (mergedOptions.allowOnboarding) {
          authResult = await AuthGuard.requireOnboarding(event);
        }
        // B2B 관리자 인증
        else if (mergedOptions.requireB2B) {
          authResult = await AuthGuard.requireB2BAdmin(event);
          
          // B2B 조직 접근 권한 확인
          if (mergedOptions.orgIdExtractor) {
            const requestedOrgId = mergedOptions.orgIdExtractor(event);
            if (requestedOrgId && requestedOrgId !== authResult.orgId) {
              throw new AuthorizationError('Access denied to requested organization');
            }
          }
        }
        // 시스템 관리자 인증
        else if (mergedOptions.requireSystemAdmin) {
          authResult = await AuthGuard.requireSystemAdmin(event);
        }
        // 일반 사용자 인증
        else if (mergedOptions.requireAuth) {
          authResult = await AuthGuard.requireUser(event);

          // 리소스 소유권 확인
          if (mergedOptions.requireResourceOwnership && mergedOptions.resourceIdExtractor) {
            const resourceUserId = mergedOptions.resourceIdExtractor(event);
            if (resourceUserId && resourceUserId !== authResult.userId) {
              throw new AuthorizationError('Access denied: resource ownership mismatch');
            }
          }

          // 파일 접근 권한 확인
          if (mergedOptions.requireFileAccess && mergedOptions.fileIdExtractor) {
            const fileId = mergedOptions.fileIdExtractor(event);
            if (fileId) {
              await AuthGuard.requireFileAccess(event, fileId);
            }
          }

          // Rate Limiting 확인
          if (mergedOptions.enableRateLimit) {
            await AuthGuard.requireRateLimit(event);
          }
        }

        // 인증 성공 로깅
        if (authResult) {
          logger.info('Authentication successful', {
            userId: authResult.userId?.substring(0, 8) + '***' || 'N/A',
            role: authResult.role || 'user',
            method: event.httpMethod,
            path: event.path,
            hasOrgId: !!authResult.orgId
          });
        }

        // 핸들러 실행
        return await handler(event, authResult, logger);

      } catch (error) {
        return AuthMiddleware.handleAuthError(error as Error, correlationId, logger);
      }
    };
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
   * 인증 에러 처리
   */
  private static handleAuthError(
    error: Error,
    correlationId: string,
    logger: Logger
  ): APIGatewayProxyResult {
    logger.error('Authentication/Authorization failed', error, {
      errorType: error.constructor.name,
      path: 'auth-middleware'
    });

    if (error instanceof AuthenticationError) {
      return ResponseUtil.authenticationError(error.message, correlationId);
    }

    if (error instanceof AuthorizationError) {
      return ResponseUtil.authorizationError(error.message, correlationId);
    }

    // 예상치 못한 에러
    return ResponseUtil.internalError(
      'Authentication service temporarily unavailable',
      correlationId
    );
  }

  /**
   * 경로에서 ID 추출하는 헬퍼 함수들
   */
  static extractors = {
    /**
     * 경로의 마지막 세그먼트에서 ID 추출
     * 예: /api/v1/users/123 -> 123
     */
    fromPathEnd: (event: APIGatewayProxyEvent): string => {
      const pathParts = event.path.split('/');
      return pathParts[pathParts.length - 1];
    },

    /**
     * 경로의 특정 위치에서 ID 추출
     * 예: /api/v1/users/{userId}/files/{fileId} -> fileId
     */
    fromPathSegment: (segmentName: string) => (event: APIGatewayProxyEvent): string => {
      const pathParts = event.path.split('/');
      const segmentIndex = pathParts.findIndex(part => part === segmentName);
      return segmentIndex >= 0 && segmentIndex < pathParts.length - 1 
        ? pathParts[segmentIndex + 1] 
        : '';
    },

    /**
     * 쿼리 매개변수에서 ID 추출
     * 예: ?fileId=123 -> 123
     */
    fromQuery: (paramName: string) => (event: APIGatewayProxyEvent): string => {
      return event.queryStringParameters?.[paramName] || '';
    },

    /**
     * 요청 본문에서 ID 추출
     * 예: { "resourceId": "123" } -> 123
     */
    fromBody: (fieldName: string) => (event: APIGatewayProxyEvent): string => {
      if (!event.body) return '';
      try {
        const body = JSON.parse(event.body);
        return body[fieldName] || '';
      } catch {
        return '';
      }
    }
  };
}

/**
 * 편의 함수들 - 자주 사용되는 패턴
 */

/**
 * 사용자 ID 기반 리소스 접근 미들웨어
 * 경로: /api/v1/users/{userId}/...
 */
export const withUserResource = (handler: AuthenticatedHandler<AuthResult>) =>
  AuthMiddleware.withResourceOwnership(
    AuthMiddleware.extractors.fromPathSegment('users'),
    handler
  );

/**
 * 파일 ID 기반 접근 미들웨어
 * 경로: /api/v1/files/{fileId}/...
 */
export const withFileResource = (handler: AuthenticatedHandler<AuthResult>) =>
  AuthMiddleware.withFileAccess(
    AuthMiddleware.extractors.fromPathSegment('files'),
    handler
  );

/**
 * B2B 조직 ID 기반 접근 미들웨어
 * 쿼리: ?orgId=...
 */
export const withB2BOrganization = (handler: AuthenticatedHandler<B2BAuthResult>) =>
  AuthMiddleware.withB2BAccess(
    AuthMiddleware.extractors.fromQuery('orgId'),
    handler
  );

/**
 * Rate Limited API 미들웨어
 * 엔진 API 등 제한이 필요한 경우
 */
export const withRateLimitedAuth = (handler: AuthenticatedHandler<AuthResult>) =>
  AuthMiddleware.withRateLimit(handler);

/**
 * 타입 안전한 미들웨어 래퍼
 */
export interface TypedAuthResult<T = any> extends AuthResult {
  data?: T;
}

/**
 * 데이터 로딩과 함께 인증하는 미들웨어
 * 인증과 동시에 필요한 데이터를 로드
 */
export const withAuthAndData = <T>(
  dataLoader: (auth: AuthResult, event: APIGatewayProxyEvent) => Promise<T>,
  handler: AuthenticatedHandler<TypedAuthResult<T>>
) => AuthMiddleware.withAuth(async (event, auth, logger) => {
  const data = await dataLoader(auth, event);
  const typedAuth: TypedAuthResult<T> = { ...auth, data };
  return handler(event, typedAuth, logger);
});

/**
 * 미들웨어 체이닝 유틸리티
 */
export class MiddlewareChain {
  private middlewares: Array<(event: APIGatewayProxyEvent) => Promise<APIGatewayProxyEvent>> = [];

  /**
   * 미들웨어 추가
   */
  use(middleware: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyEvent>): MiddlewareChain {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * 최종 핸들러와 함께 실행
   */
  execute(handler: AuthenticatedHandler): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult> {
    return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      let processedEvent = event;
      
      // 미들웨어 체인 실행
      for (const middleware of this.middlewares) {
        processedEvent = await middleware(processedEvent);
      }

      // 인증 미들웨어 적용
      return AuthMiddleware.withAuth(handler)(processedEvent);
    };
  }
}

/**
 * 공통 미들웨어 함수들
 */
export const commonMiddlewares = {
  /**
   * 요청 로깅 미들웨어
   */
  requestLogging: async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyEvent> => {
    const correlationId = AuthMiddleware.extractors.fromQuery('correlationId')(event) || 
                         `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const logger = new Logger(correlationId, 'request-middleware');
    logger.info('Request received', {
      method: event.httpMethod,
      path: event.path,
      userAgent: event.headers['User-Agent'],
      sourceIp: event.requestContext.identity?.sourceIp
    });

    return event;
  },

  /**
   * 요청 크기 제한 미들웨어
   */
  requestSizeLimit: (maxSizeBytes: number = 1024 * 1024) => // 기본 1MB
    async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyEvent> => {
      if (event.body && Buffer.byteLength(event.body, 'utf8') > maxSizeBytes) {
        throw new Error('Request body too large');
      }
      return event;
    },

  /**
   * Content-Type 검증 미들웨어
   */
  contentTypeValidation: (allowedTypes: string[] = ['application/json']) =>
    async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyEvent> => {
      if (event.httpMethod !== 'GET' && event.httpMethod !== 'DELETE') {
        const contentType = event.headers['Content-Type'] || event.headers['content-type'];
        if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
          throw new Error('Invalid content type');
        }
      }
      return event;
    }
};