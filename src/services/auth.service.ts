import { APIGatewayProxyEvent } from 'aws-lambda';
import { db } from './database.service';
import { Logger } from './logger.service';

/**
 * JWT 토큰 클레임 인터페이스
 */
export interface CognitoJWTClaims {
  sub: string;           // 사용자 고유 ID
  email: string;         // 이메일
  'custom:role'?: string; // 사용자 역할
  'custom:orgId'?: string; // 조직 ID (B2B 사용자)
  aud: string;           // 클라이언트 ID
  iss: string;           // 발급자
  exp: number;           // 만료 시간
  iat: number;           // 발급 시간
}

/**
 * 인증 결과 인터페이스
 */
export interface AuthResult {
  userId: string;
  cognitoSub: string;
  role: 'user' | 'b2b_admin' | 'system_admin';
  orgId?: string;
}

/**
 * B2B 관리자 인증 결과
 */
export interface B2BAuthResult extends AuthResult {
  orgId: string;
}

/**
 * 인증 에러 클래스
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * 인증 서비스
 * Cognito JWT 토큰 검증 및 사용자 권한 관리
 * ADR-001: AWS Cognito 사용
 */
export class AuthService {
  private static instance: AuthService;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.create('auth-service', 'auth-service');
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * API Gateway 이벤트에서 Cognito 클레임 추출 및 검증
   * @param event API Gateway 이벤트
   * @returns JWT 클레임
   */
  private extractClaims(event: APIGatewayProxyEvent): CognitoJWTClaims {
    const claims = event.requestContext.authorizer?.claims;
    
    if (!claims || !claims.sub) {
      this.logger.warn('Missing authentication token or invalid claims', {
        hasAuthorizer: !!event.requestContext.authorizer,
        hasClaims: !!claims,
        hasSub: !!(claims?.sub)
      });
      throw new AuthenticationError('Missing authentication token or invalid claims');
    }

    const extractedClaims: CognitoJWTClaims = {
      sub: claims.sub,
      email: claims.email || '',
      'custom:role': claims['custom:role'],
      'custom:orgId': claims['custom:orgId'],
      aud: claims.aud || '',
      iss: claims.iss || '',
      exp: parseInt(claims.exp || '0'),
      iat: parseInt(claims.iat || '0'),
    };

    // JWT 구조 검증
    this.validateJWTStructure(extractedClaims);

    // 토큰 만료 시간 검증
    this.validateTokenExpiration(extractedClaims);

    this.logger.debug('Successfully extracted JWT claims', {
      sub: extractedClaims.sub,
      role: extractedClaims['custom:role'] || 'user',
      hasOrgId: !!extractedClaims['custom:orgId']
    });

    return extractedClaims;
  }

  /**
   * Cognito sub를 내부 user_id로 매핑
   * @param cognitoSub Cognito subject
   * @returns 내부 사용자 ID
   */
  async getUserIdFromToken(cognitoSub: string): Promise<string> {
    try {
      this.logger.debug('Mapping Cognito sub to user ID', { cognitoSub });

      const result = await db.queryOne<{ user_id: string }>(
        'SELECT user_id FROM users WHERE cognito_sub = $1',
        [cognitoSub]
      );

      if (!result) {
        this.logger.warn('User not found for Cognito sub', { cognitoSub });
        throw new AuthenticationError('User not found');
      }

      // 사용자 활성도 업데이트 (ADR-009)
      await db.updateUserActivity(cognitoSub);

      this.logger.debug('Successfully mapped Cognito sub to user ID', {
        cognitoSub,
        userId: result.user_id
      });

      return result.user_id;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      this.logger.error('Failed to get user ID from token', error as Error, { cognitoSub });
      throw new AuthenticationError('Failed to authenticate user');
    }
  }

  /**
   * 일반 사용자 인증 (본인 데이터만 접근)
   * @param event API Gateway 이벤트
   * @returns 인증 결과
   */
  async requireUser(event: APIGatewayProxyEvent): Promise<AuthResult> {
    try {
      const claims = this.extractClaims(event);
      const userId = await this.getUserIdFromToken(claims.sub);

      const authResult: AuthResult = {
        userId,
        cognitoSub: claims.sub,
        role: (claims['custom:role'] as any) || 'user',
        orgId: claims['custom:orgId'],
      };

      this.logger.info('User authentication successful', {
        userId: authResult.userId,
        role: authResult.role,
        hasOrgId: !!authResult.orgId
      });

      return authResult;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      this.logger.error('User authentication failed', error as Error);
      throw new AuthenticationError('Authentication failed');
    }
  }

  /**
   * B2B 관리자 인증 (조직 데이터 접근)
   * @param event API Gateway 이벤트
   * @returns B2B 인증 결과
   */
  async requireB2BAdmin(event: APIGatewayProxyEvent): Promise<B2BAuthResult> {
    try {
      const claims = this.extractClaims(event);
      
      // 역할 검증
      if (claims['custom:role'] !== 'b2b_admin') {
        this.logger.warn('B2B admin role required but not found', {
          cognitoSub: claims.sub,
          actualRole: claims['custom:role'] || 'user'
        });
        throw new AuthorizationError('B2B admin role required');
      }

      // 조직 ID 검증
      const orgId = claims['custom:orgId'];
      if (!orgId) {
        this.logger.warn('Organization ID required for B2B access but not found', {
          cognitoSub: claims.sub
        });
        throw new AuthorizationError('Organization ID required for B2B access');
      }

      const userId = await this.getUserIdFromToken(claims.sub);

      const authResult: B2BAuthResult = {
        userId,
        cognitoSub: claims.sub,
        role: 'b2b_admin',
        orgId,
      };

      this.logger.info('B2B admin authentication successful', {
        userId: authResult.userId,
        orgId: authResult.orgId
      });

      return authResult;
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
        throw error;
      }
      this.logger.error('B2B admin authentication failed', error as Error);
      throw new AuthorizationError('B2B admin authentication failed');
    }
  }

  /**
   * 시스템 관리자 인증
   * @param event API Gateway 이벤트
   * @returns 인증 결과
   */
  async requireSystemAdmin(event: APIGatewayProxyEvent): Promise<AuthResult> {
    try {
      const claims = this.extractClaims(event);
      
      // 역할 검증
      if (claims['custom:role'] !== 'system_admin') {
        this.logger.warn('System admin role required but not found', {
          cognitoSub: claims.sub,
          actualRole: claims['custom:role'] || 'user'
        });
        throw new AuthorizationError('System admin role required');
      }

      const userId = await this.getUserIdFromToken(claims.sub);

      const authResult: AuthResult = {
        userId,
        cognitoSub: claims.sub,
        role: 'system_admin',
        orgId: claims['custom:orgId'],
      };

      this.logger.info('System admin authentication successful', {
        userId: authResult.userId,
        hasOrgId: !!authResult.orgId
      });

      return authResult;
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
        throw error;
      }
      this.logger.error('System admin authentication failed', error as Error);
      throw new AuthorizationError('System admin authentication failed');
    }
  }

  /**
   * 리소스 소유권 검증
   * @param userId 요청자 사용자 ID
   * @param resourceUserId 리소스 소유자 ID
   */
  validateResourceOwnership(userId: string, resourceUserId: string): void {
    if (userId !== resourceUserId) {
      this.logger.warn('Resource ownership validation failed', {
        requesterId: userId,
        resourceOwnerId: resourceUserId
      });
      throw new AuthorizationError('Access denied: resource ownership mismatch');
    }
  }

  /**
   * B2B 조직 접근 권한 검증
   * @param userOrgId 사용자 조직 ID
   * @param requestedOrgId 요청된 조직 ID
   */
  validateB2BAccess(userOrgId: string, requestedOrgId: string): void {
    if (userOrgId !== requestedOrgId) {
      this.logger.warn('B2B organization access validation failed', {
        userOrgId,
        requestedOrgId
      });
      throw new AuthorizationError('Access denied to requested organization');
    }
  }

  /**
   * 파일 접근 권한 검증
   * @param userId 요청자 사용자 ID
   * @param fileId 파일 ID
   */
  async validateFileAccess(userId: string, fileId: string): Promise<void> {
    try {
      const fileMetadata = await db.queryOne<{ uploaded_by: string; org_id?: string }>(
        `SELECT fm.uploaded_by, u.org_id 
         FROM file_metadata fm 
         JOIN users u ON fm.uploaded_by = u.user_id 
         WHERE fm.file_id = $1`,
        [fileId]
      );

      if (!fileMetadata) {
        this.logger.warn('File not found for access validation', { fileId, userId });
        throw new AuthorizationError('File not found');
      }

      // 파일 소유자이거나 같은 조직인 경우 접근 허용
      if (fileMetadata.uploaded_by !== userId) {
        // 조직 기반 접근 권한 확인 (V2)
        const userOrg = await db.queryOne<{ org_id?: string }>(
          'SELECT org_id FROM users WHERE user_id = $1',
          [userId]
        );

        if (!userOrg?.org_id || userOrg.org_id !== fileMetadata.org_id) {
          this.logger.warn('File access denied - not owner and different organization', {
            fileId,
            userId,
            fileOwnerId: fileMetadata.uploaded_by,
            userOrgId: userOrg?.org_id,
            fileOrgId: fileMetadata.org_id
          });
          throw new AuthorizationError('Access denied to file');
        }
      }

      this.logger.debug('File access validation successful', {
        fileId,
        userId,
        isOwner: fileMetadata.uploaded_by === userId
      });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error;
      }
      this.logger.error('File access validation failed', error as Error, { fileId, userId });
      throw new AuthorizationError('File access validation failed');
    }
  }

  /**
   * 토큰 만료 시간 검증
   * @param claims JWT 클레임
   */
  private validateTokenExpiration(claims: CognitoJWTClaims): void {
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp <= now) {
      this.logger.warn('Token has expired', {
        exp: claims.exp,
        now,
        sub: claims.sub
      });
      throw new AuthenticationError('Token has expired');
    }
  }

  /**
   * JWT 토큰 기본 구조 검증
   * @param claims JWT 클레임
   */
  private validateJWTStructure(claims: CognitoJWTClaims): void {
    // 필수 클레임 검증
    if (!claims.sub || !claims.aud || !claims.iss) {
      this.logger.warn('Invalid JWT structure - missing required claims', {
        hasSub: !!claims.sub,
        hasAud: !!claims.aud,
        hasIss: !!claims.iss
      });
      throw new AuthenticationError('Invalid token structure');
    }

    // Cognito 발급자 검증 (환경변수로 설정된 User Pool 확인)
    const expectedIssuer = process.env.COGNITO_USER_POOL_ISSUER;
    if (expectedIssuer && claims.iss !== expectedIssuer) {
      this.logger.warn('Invalid token issuer', {
        expected: expectedIssuer,
        actual: claims.iss
      });
      throw new AuthenticationError('Invalid token issuer');
    }

    // 토큰 발급 시간 검증 (너무 오래된 토큰 거부)
    const maxTokenAge = 24 * 60 * 60; // 24시간
    const now = Math.floor(Date.now() / 1000);
    if (claims.iat && (now - claims.iat) > maxTokenAge) {
      this.logger.warn('Token is too old', {
        iat: claims.iat,
        now,
        age: now - claims.iat
      });
      throw new AuthenticationError('Token is too old');
    }
  }

  /**
   * 보안 이벤트 로깅
   * @param event 보안 이벤트 유형
   * @param details 이벤트 상세 정보
   */
  private logSecurityEvent(event: string, details: any): void {
    this.logger.warn(`Security event: ${event}`, {
      securityEvent: event,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 사용자 권한 레벨 검증
   * @param requiredRole 필요한 권한 레벨
   * @param userRole 사용자 권한 레벨
   */
  private validateUserRole(
    requiredRole: 'user' | 'b2b_admin' | 'system_admin',
    userRole: string | undefined
  ): void {
    const roleHierarchy = {
      'user': 0,
      'b2b_admin': 1,
      'system_admin': 2
    };

    const requiredLevel = roleHierarchy[requiredRole];
    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] ?? -1;

    if (userLevel < requiredLevel) {
      this.logSecurityEvent('insufficient_privileges', {
        requiredRole,
        userRole: userRole || 'none',
        requiredLevel,
        userLevel
      });
      throw new AuthorizationError(`Insufficient privileges: ${requiredRole} role required`);
    }
  }

  /**
   * 사용자 존재 여부 확인 및 생성 (온보딩 시)
   * @param cognitoSub Cognito subject
   * @returns 사용자 ID (기존 또는 새로 생성)
   */
  async ensureUserExists(cognitoSub: string): Promise<string> {
    try {
      this.logger.debug('Ensuring user exists', { cognitoSub });

      // 기존 사용자 확인
      const existingUser = await db.queryOne<{ user_id: string }>(
        'SELECT user_id FROM users WHERE cognito_sub = $1',
        [cognitoSub]
      );

      if (existingUser) {
        this.logger.debug('User already exists', {
          cognitoSub,
          userId: existingUser.user_id
        });
        return existingUser.user_id;
      }

      // 새 사용자 생성 (기본값으로)
      const newUser = await db.queryOne<{ user_id: string }>(
        `INSERT INTO users (cognito_sub, shift_type, commute_min, wearable_connected)
         VALUES ($1, 'TWO_SHIFT', 30, false)
         RETURNING user_id`,
        [cognitoSub]
      );

      if (!newUser) {
        throw new Error('Failed to create user');
      }

      this.logger.info('New user created', {
        cognitoSub,
        userId: newUser.user_id
      });

      return newUser.user_id;
    } catch (error) {
      this.logger.error('Failed to ensure user exists', error as Error, { cognitoSub });
      throw new AuthenticationError('Failed to initialize user');
    }
  }

  /**
   * 상관관계 ID 생성
   * @param event API Gateway 이벤트
   * @returns 상관관계 ID
   */
  generateCorrelationId(event: APIGatewayProxyEvent): string {
    // 헤더에서 기존 correlation ID 확인
    const existingId = event.headers['X-Correlation-Id'] || 
                      event.headers['x-correlation-id'];
    
    if (existingId) {
      return existingId;
    }

    // 새 correlation ID 생성 (ADR-008: 관측가능성)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `req-${timestamp}-${random}`;
  }

  /**
   * 인증 헬스 체크
   * @returns 인증 서비스 상태
   */
  async healthCheck(): Promise<{ status: string; userCount: number }> {
    try {
      const result = await db.queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM users'
      );

      const userCount = parseInt(result?.count || '0');
      
      this.logger.debug('Authentication service health check completed', {
        status: 'healthy',
        userCount
      });

      return {
        status: 'healthy',
        userCount
      };
    } catch (error) {
      this.logger.error('Authentication service health check failed', error as Error);
      return {
        status: 'unhealthy',
        userCount: 0
      };
    }
  }

  /**
   * 사용자 세션 검증 (추가 보안 레이어)
   * @param userId 사용자 ID
   * @param cognitoSub Cognito subject
   */
  async validateUserSession(userId: string, cognitoSub: string): Promise<void> {
    try {
      // 사용자 계정 상태 확인
      const user = await db.queryOne<{ 
        user_id: string; 
        cognito_sub: string;
        created_at: string;
      }>(
        'SELECT user_id, cognito_sub, created_at FROM users WHERE user_id = $1 AND cognito_sub = $2',
        [userId, cognitoSub]
      );

      if (!user) {
        this.logSecurityEvent('invalid_session', {
          userId,
          cognitoSub,
          reason: 'user_not_found'
        });
        throw new AuthenticationError('Invalid user session');
      }

      // 계정 생성 시간 검증 (너무 최근에 생성된 계정 의심)
      const accountAge = Date.now() - new Date(user.created_at).getTime();
      const minAccountAge = 60 * 1000; // 1분

      if (accountAge < minAccountAge) {
        this.logger.warn('Very new account detected', {
          userId,
          accountAge,
          createdAt: user.created_at
        });
      }

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      this.logger.error('User session validation failed', error as Error, { userId, cognitoSub });
      throw new AuthenticationError('Session validation failed');
    }
  }

  /**
   * 요청 빈도 검증 (기본적인 rate limiting 지원)
   * @param userId 사용자 ID
   * @param endpoint 엔드포인트
   */
  async validateRequestRate(userId: string, endpoint: string): Promise<void> {
    // 실제 구현에서는 ElastiCache나 DynamoDB를 사용하여 rate limiting 구현
    // 여기서는 기본적인 검증 로직만 제공
    
    const rateLimits = {
      '/api/v1/engines/': 30, // 엔진 API: 분당 30회
      '/api/v1/b2b/': 100,    // B2B API: 분당 100회
      'default': 60           // 기본: 분당 60회
    };

    const limit = Object.keys(rateLimits).find(key => 
      key !== 'default' && endpoint.startsWith(key)
    );
    
    const maxRequests = limit ? rateLimits[limit as keyof typeof rateLimits] : rateLimits.default;

    // 실제 rate limiting 로직은 캐시 서비스에서 구현
    this.logger.debug('Request rate validation', {
      userId,
      endpoint,
      maxRequests
    });
  }

  /**
   * 의심스러운 활동 감지
   * @param event API Gateway 이벤트
   * @param authResult 인증 결과
   */
  detectSuspiciousActivity(event: APIGatewayProxyEvent, authResult: AuthResult): void {
    const sourceIp = event.requestContext.identity?.sourceIp;
    const userAgent = event.headers['User-Agent'] || event.headers['user-agent'];
    
    // 의심스러운 패턴 감지
    const suspiciousPatterns = [
      !userAgent || userAgent.length < 10, // 너무 짧은 User-Agent
      sourceIp && this.isKnownMaliciousIP(sourceIp), // 알려진 악성 IP
      authResult.role === 'system_admin' && !this.isAllowedAdminIP(sourceIp) // 관리자 계정의 비허용 IP
    ];

    if (suspiciousPatterns.some(pattern => pattern)) {
      this.logSecurityEvent('suspicious_activity', {
        userId: authResult.userId,
        sourceIp,
        userAgent,
        role: authResult.role,
        endpoint: event.path
      });
    }
  }

  /**
   * 알려진 악성 IP 확인 (기본 구현)
   * @param ip IP 주소
   */
  private isKnownMaliciousIP(ip: string): boolean {
    // 실제 구현에서는 외부 IP 평판 서비스나 내부 블랙리스트 사용
    const knownMaliciousRanges = [
      '0.0.0.0', // 예시
    ];
    
    return knownMaliciousRanges.includes(ip);
  }

  /**
   * 관리자 허용 IP 확인
   * @param ip IP 주소
   */
  private isAllowedAdminIP(ip: string | undefined): boolean {
    if (!ip) return false;
    
    // 환경변수에서 허용된 관리자 IP 목록 가져오기
    const allowedIPs = process.env.ADMIN_ALLOWED_IPS?.split(',') || [];
    return allowedIPs.includes(ip);
  }
}

// 싱글톤 인스턴스 내보내기
export const authService = AuthService.getInstance();

/**
 * 공통 인증 가드 함수들
 * 모든 Lambda 진입점에서 강제 호출되는 인증 미들웨어
 */
export class AuthGuard {
  /**
   * 사용자 인증 가드 (기본)
   * 모든 사용자 API에서 사용
   */
  static async requireUser(event: APIGatewayProxyEvent): Promise<AuthResult> {
    const authResult = await authService.requireUser(event);
    
    // 추가 보안 검증
    await authService.validateUserSession(authResult.userId, authResult.cognitoSub);
    authService.detectSuspiciousActivity(event, authResult);
    
    return authResult;
  }

  /**
   * B2B 관리자 인증 가드
   * B2B 통계 API에서 사용
   */
  static async requireB2BAdmin(event: APIGatewayProxyEvent): Promise<B2BAuthResult> {
    const authResult = await authService.requireB2BAdmin(event);
    
    // B2B 관리자 추가 검증
    await authService.validateUserSession(authResult.userId, authResult.cognitoSub);
    authService.detectSuspiciousActivity(event, authResult);
    
    return authResult;
  }

  /**
   * 시스템 관리자 인증 가드
   * 시스템 관리 API에서 사용
   */
  static async requireSystemAdmin(event: APIGatewayProxyEvent): Promise<AuthResult> {
    const authResult = await authService.requireSystemAdmin(event);
    
    // 시스템 관리자 추가 검증
    await authService.validateUserSession(authResult.userId, authResult.cognitoSub);
    authService.detectSuspiciousActivity(event, authResult);
    
    return authResult;
  }

  /**
   * 리소스 소유권 검증 가드
   * 특정 리소스에 대한 접근 권한 확인
   */
  static async requireResourceOwner(
    event: APIGatewayProxyEvent, 
    resourceUserId: string
  ): Promise<AuthResult> {
    const authResult = await AuthGuard.requireUser(event);
    authService.validateResourceOwnership(authResult.userId, resourceUserId);
    return authResult;
  }

  /**
   * 파일 접근 권한 가드
   * 파일 다운로드/수정 시 사용
   */
  static async requireFileAccess(
    event: APIGatewayProxyEvent, 
    fileId: string
  ): Promise<AuthResult> {
    const authResult = await AuthGuard.requireUser(event);
    await authService.validateFileAccess(authResult.userId, fileId);
    return authResult;
  }

  /**
   * B2B 조직 접근 권한 가드
   * 조직별 데이터 접근 시 사용
   */
  static async requireB2BAccess(
    event: APIGatewayProxyEvent, 
    requestedOrgId: string
  ): Promise<B2BAuthResult> {
    const authResult = await AuthGuard.requireB2BAdmin(event);
    authService.validateB2BAccess(authResult.orgId, requestedOrgId);
    return authResult;
  }

  /**
   * Rate Limiting 가드
   * API 호출 빈도 제한
   */
  static async requireRateLimit(
    event: APIGatewayProxyEvent
  ): Promise<AuthResult> {
    const authResult = await AuthGuard.requireUser(event);
    await authService.validateRequestRate(authResult.userId, event.path);
    return authResult;
  }

  /**
   * 온보딩 전용 가드
   * 온보딩 과정에서만 사용 (사용자 생성 허용)
   */
  static async requireOnboarding(event: APIGatewayProxyEvent): Promise<{
    cognitoSub: string;
    email: string;
    userId?: string;
  }> {
    const claims = event.requestContext.authorizer?.claims;
    
    if (!claims?.sub) {
      throw new AuthenticationError('Missing authentication token');
    }

    // 기존 사용자 확인 (온보딩 완료 여부)
    let userId: string | undefined;
    try {
      userId = await authService.getUserIdFromToken(claims.sub);
    } catch (error) {
      // 사용자가 없으면 온보딩 진행 가능
      if (error instanceof AuthenticationError && 
          (error as Error).message.includes('User not found')) {
        userId = undefined;
      } else {
        throw error;
      }
    }

    return {
      cognitoSub: claims.sub,
      email: claims.email || '',
      userId
    };
  }

  /**
   * 헬스체크 전용 가드 (인증 불필요)
   * 시스템 상태 확인용
   */
  static async allowHealthCheck(event: APIGatewayProxyEvent): Promise<void> {
    // 헬스체크는 인증 불필요하지만 기본적인 보안 검증
    const sourceIp = event.requestContext.identity?.sourceIp;
    const userAgent = event.headers['User-Agent'] || event.headers['user-agent'];
    
    // 의심스러운 요청 로깅
    if (!userAgent || userAgent.length < 5) {
      const logger = Logger.create('auth-guard', 'health-check');
      logger.warn('Suspicious health check request', {
        sourceIp,
        userAgent,
        path: event.path
      });
    }
  }
}