import { APIGatewayProxyResult } from 'aws-lambda';
import { APIResponse, APIErrorResponse, HttpStatusCode, ErrorCode } from '../types/common';

/**
 * API 응답 유틸리티
 * 표준화된 응답 형식 제공
 */
export class ResponseUtil {
  /**
   * 성공 응답 생성
   */
  static success<T>(
    data: T,
    correlationId: string,
    statusCode: HttpStatusCode = HttpStatusCode.OK,
    created: boolean = false
  ): APIGatewayProxyResult {
    const response: APIResponse<T> = {
      data,
      correlationId
    };

    if (created) {
      response.created = true;
    }

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': correlationId,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Correlation-Id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify(response)
    };
  }

  /**
   * 생성 성공 응답
   */
  static created<T>(data: T, correlationId: string): APIGatewayProxyResult {
    return this.success(data, correlationId, HttpStatusCode.CREATED, true);
  }

  /**
   * 삭제 성공 응답 (No Content)
   */
  static deleted(correlationId: string): APIGatewayProxyResult {
    return {
      statusCode: HttpStatusCode.NO_CONTENT,
      headers: {
        'X-Correlation-Id': correlationId,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Correlation-Id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: ''
    };
  }

  /**
   * 에러 응답 생성
   */
  static error(
    code: ErrorCode | string,
    message: string,
    correlationId: string,
    statusCode: HttpStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR,
    details?: Record<string, any>
  ): APIGatewayProxyResult {
    const response: APIErrorResponse = {
      error: {
        code,
        message,
        details
      },
      correlationId
    };

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': correlationId,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Correlation-Id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify(response)
    };
  }

  /**
   * 검증 에러 응답
   */
  static validationError(
    message: string,
    correlationId: string,
    details?: Record<string, any>
  ): APIGatewayProxyResult {
    return this.error(
      ErrorCode.VALIDATION_ERROR,
      message,
      correlationId,
      HttpStatusCode.BAD_REQUEST,
      details
    );
  }

  /**
   * 인증 에러 응답
   */
  static authenticationError(
    message: string = '인증이 필요합니다',
    correlationId: string
  ): APIGatewayProxyResult {
    return this.error(
      ErrorCode.AUTHENTICATION_ERROR,
      message,
      correlationId,
      HttpStatusCode.UNAUTHORIZED
    );
  }

  /**
   * 권한 에러 응답
   */
  static authorizationError(
    message: string = '접근 권한이 없습니다',
    correlationId: string
  ): APIGatewayProxyResult {
    return this.error(
      ErrorCode.AUTHORIZATION_ERROR,
      message,
      correlationId,
      HttpStatusCode.FORBIDDEN
    );
  }

  /**
   * 리소스 없음 에러 응답
   */
  static notFoundError(
    message: string = '요청한 리소스를 찾을 수 없습니다',
    correlationId: string
  ): APIGatewayProxyResult {
    return this.error(
      ErrorCode.RESOURCE_NOT_FOUND,
      message,
      correlationId,
      HttpStatusCode.NOT_FOUND
    );
  }

  /**
   * 리소스 충돌 에러 응답
   */
  static conflictError(
    message: string = '리소스 충돌이 발생했습니다',
    correlationId: string,
    details?: Record<string, any>
  ): APIGatewayProxyResult {
    return this.error(
      ErrorCode.RESOURCE_CONFLICT,
      message,
      correlationId,
      HttpStatusCode.CONFLICT,
      details
    );
  }

  /**
   * 요청 제한 초과 에러 응답
   */
  static rateLimitError(
    message: string = '요청 제한을 초과했습니다',
    correlationId: string,
    retryAfter?: number
  ): APIGatewayProxyResult {
    return this.error(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      message,
      correlationId,
      HttpStatusCode.TOO_MANY_REQUESTS,
      retryAfter ? { retryAfter } : undefined
    );
  }

  /**
   * 내부 서버 에러 응답
   */
  static internalError(
    message: string = '서버 내부 오류가 발생했습니다',
    correlationId: string
  ): APIGatewayProxyResult {
    return this.error(
      ErrorCode.INTERNAL_ERROR,
      message,
      correlationId,
      HttpStatusCode.INTERNAL_SERVER_ERROR
    );
  }

  /**
   * 엔진 응답 (의료 진단 면책 헤더 포함)
   */
  static engineResponse<T>(
    data: T,
    correlationId: string,
    statusCode: HttpStatusCode = HttpStatusCode.OK
  ): APIGatewayProxyResult {
    const response = this.success(data, correlationId, statusCode);
    
    // ADR-008: 의료 진단 면책 메시지
    response.headers!['X-Disclaimer'] = 
      'This is not medical advice. Consult healthcare professionals for medical concerns.';
    
    return response;
  }

  /**
   * CORS 프리플라이트 응답
   */
  static corsPreflightResponse(): APIGatewayProxyResult {
    return {
      statusCode: HttpStatusCode.OK,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Correlation-Id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  /**
   * 헬스 체크 응답
   */
  static healthCheck(
    status: 'healthy' | 'unhealthy' | 'degraded',
    correlationId: string,
    details?: Record<string, any>
  ): APIGatewayProxyResult {
    const statusCode = status === 'healthy' ? 
      HttpStatusCode.OK : 
      HttpStatusCode.INTERNAL_SERVER_ERROR;

    return this.success({
      status,
      timestamp: new Date().toISOString(),
      ...details
    }, correlationId, statusCode);
  }
}

/**
 * 에러 핸들링 유틸리티
 */
export class ErrorHandler {
  /**
   * 에러를 적절한 HTTP 응답으로 변환
   */
  static handleError(error: any, correlationId: string): APIGatewayProxyResult {
    // 인증/권한 에러
    if (error.name === 'AuthenticationError') {
      return ResponseUtil.authenticationError(error.message, correlationId);
    }

    if (error.name === 'AuthorizationError') {
      return ResponseUtil.authorizationError(error.message, correlationId);
    }

    // 검증 에러
    if (error.name === 'ValidationError') {
      return ResponseUtil.validationError(error.message, correlationId, error.details);
    }

    // 데이터베이스 제약 조건 위반
    if (error.code === '23505') { // PostgreSQL unique violation
      return ResponseUtil.conflictError(
        '중복된 데이터가 존재합니다',
        correlationId,
        { constraint: error.constraint }
      );
    }

    if (error.code === '23503') { // PostgreSQL foreign key violation
      return ResponseUtil.validationError(
        '참조된 데이터가 존재하지 않습니다',
        correlationId,
        { constraint: error.constraint }
      );
    }

    if (error.code === '23514') { // PostgreSQL check violation
      return ResponseUtil.validationError(
        '데이터 검증 규칙을 위반했습니다',
        correlationId,
        { constraint: error.constraint }
      );
    }

    // 기본 내부 서버 에러
    console.error('Unhandled error:', error);
    return ResponseUtil.internalError(
      '예상하지 못한 오류가 발생했습니다',
      correlationId
    );
  }

  /**
   * 비동기 에러 핸들러 래퍼
   */
  static asyncHandler(
    handler: (event: any, context: any) => Promise<APIGatewayProxyResult>
  ) {
    return async (event: any, context: any): Promise<APIGatewayProxyResult> => {
      try {
        return await handler(event, context);
      } catch (error) {
        const correlationId = event.headers?.['X-Correlation-Id'] || 
                             event.headers?.['x-correlation-id'] || 
                             `error-${Date.now()}`;
        
        return ErrorHandler.handleError(error, correlationId);
      }
    };
  }
}