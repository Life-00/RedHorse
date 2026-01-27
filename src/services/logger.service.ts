import { CloudWatchClient, PutMetricDataCommand, StandardUnit } from '@aws-sdk/client-cloudwatch';

/**
 * 로그 레벨 정의
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * 로그 엔트리 인터페이스
 */
export interface LogEntry {
  timestamp: string;        // ISO 8601
  level: LogLevel;
  correlationId: string;    // 요청 추적 ID
  service: string;          // Lambda 함수명
  message: string;          // 로그 메시지
  userId?: string;          // 사용자 ID (있는 경우)
  duration?: number;        // 처리 시간 (ms)
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * PII 마스킹 유틸리티
 * 개인정보 보호를 위한 데이터 마스킹
 */
export class PIIMasker {
  /**
   * 이메일 마스킹 (a***@domain.com 형식)
   */
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) {
      return email;
    }

    const [local, domain] = email.split('@');
    if (local.length <= 1) {
      return `*@${domain}`;
    }
    return `${local[0]}***@${domain}`;
  }

  /**
   * 사용자 ID 마스킹 (처음 8자리만 표시)
   */
  static maskUserId(userId: string): string {
    if (!userId || userId.length <= 8) {
      return '***';
    }
    return `${userId.substring(0, 8)}***`;
  }

  /**
   * 전화번호 마스킹
   */
  static maskPhoneNumber(phone: string): string {
    if (!phone) return phone;
    return phone.replace(/\d{4}$/, '****');
  }

  /**
   * 민감한 데이터 마스킹
   */
  static maskSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveData(item));
    }

    const masked = { ...data };

    // 이메일 마스킹
    if (masked.email) {
      masked.email = this.maskEmail(masked.email);
    }

    // 사용자 ID 마스킹
    if (masked.userId) {
      masked.userId = this.maskUserId(masked.userId);
    }

    if (masked.user_id) {
      masked.user_id = this.maskUserId(masked.user_id);
    }

    // 전화번호 마스킹
    if (masked.phone || masked.phoneNumber) {
      masked.phone = this.maskPhoneNumber(masked.phone);
      masked.phoneNumber = this.maskPhoneNumber(masked.phoneNumber);
    }

    // 민감한 필드 제거
    delete masked.password;
    delete masked.ssn;
    delete masked.socialSecurityNumber;
    delete masked.creditCard;
    delete masked.bankAccount;

    // 이름 필드 제거 (userId만 사용)
    delete masked.name;
    delete masked.firstName;
    delete masked.lastName;
    delete masked.fullName;

    // 중첩 객체 재귀 처리
    Object.keys(masked).forEach(key => {
      if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = this.maskSensitiveData(masked[key]);
      }
    });

    return masked;
  }
}

/**
 * 메트릭 수집 서비스
 */
export class MetricsService {
  private static cloudWatch = new CloudWatchClient({ 
    region: process.env.REGION || 'us-east-1' 
  });

  /**
   * API 호출 메트릭 기록
   */
  static async recordAPICall(
    functionName: string,
    endpoint: string,
    statusCode: number,
    duration: number
  ): Promise<void> {
    try {
      const metrics = [
        {
          MetricName: 'APICallCount',
          Dimensions: [
            { Name: 'FunctionName', Value: functionName },
            { Name: 'Endpoint', Value: endpoint },
            { Name: 'StatusCode', Value: statusCode.toString() }
          ],
          Value: 1,
          Unit: StandardUnit.Count,
          Timestamp: new Date()
        },
        {
          MetricName: 'APIResponseTime',
          Dimensions: [
            { Name: 'FunctionName', Value: functionName },
            { Name: 'Endpoint', Value: endpoint }
          ],
          Value: duration,
          Unit: StandardUnit.Milliseconds,
          Timestamp: new Date()
        }
      ];

      await this.cloudWatch.send(new PutMetricDataCommand({
        Namespace: 'ShiftSleep/API',
        MetricData: metrics
      }));
    } catch (error) {
      console.error('Failed to record API metrics:', error);
    }
  }

  /**
   * 엔진 성능 메트릭 기록
   */
  static async recordEnginePerformance(
    engineType: string,
    success: boolean,
    duration: number
  ): Promise<void> {
    try {
      const metrics = [
        {
          MetricName: 'EngineCalculationCount',
          Dimensions: [
            { Name: 'EngineType', Value: engineType },
            { Name: 'Success', Value: success.toString() }
          ],
          Value: 1,
          Unit: StandardUnit.Count,
          Timestamp: new Date()
        },
        {
          MetricName: 'EngineCalculationTime',
          Dimensions: [
            { Name: 'EngineType', Value: engineType }
          ],
          Value: duration,
          Unit: StandardUnit.Milliseconds,
          Timestamp: new Date()
        }
      ];

      await this.cloudWatch.send(new PutMetricDataCommand({
        Namespace: 'ShiftSleep/Engine',
        MetricData: metrics
      }));
    } catch (error) {
      console.error('Failed to record engine metrics:', error);
    }
  }

  /**
   * 캐시 히트율 메트릭 기록
   */
  static async recordCacheHitRate(engineType: string, isHit: boolean): Promise<void> {
    try {
      const command = new PutMetricDataCommand({
        Namespace: 'ShiftSleep/Cache',
        MetricData: [{
          MetricName: 'HitRate',
          Dimensions: [
            { Name: 'EngineType', Value: engineType }
          ],
          Value: isHit ? 1 : 0,
          Unit: StandardUnit.Count,
          Timestamp: new Date()
        }]
      });

      await this.cloudWatch.send(command);
    } catch (error) {
      console.error('Failed to record cache metrics:', error);
    }
  }

  /**
   * 사용자 활동 메트릭 기록
   */
  static async recordUserActivity(activityType: string): Promise<void> {
    try {
      const command = new PutMetricDataCommand({
        Namespace: 'ShiftSleep/UserActivity',
        MetricData: [{
          MetricName: 'ActivityCount',
          Dimensions: [
            { Name: 'ActivityType', Value: activityType }
          ],
          Value: 1,
          Unit: StandardUnit.Count,
          Timestamp: new Date()
        }]
      });

      await this.cloudWatch.send(command);
    } catch (error) {
      console.error('Failed to record user activity metrics:', error);
    }
  }
}

/**
 * 구조화된 로깅 서비스
 * PII 마스킹 및 상관관계 ID 전파 지원
 */
export class Logger {
  private correlationId: string;
  private service: string;

  constructor(correlationId: string, service?: string) {
    this.correlationId = correlationId;
    this.service = service || process.env.AWS_LAMBDA_FUNCTION_NAME || 'unknown-service';
  }

  /**
   * 정보 로그
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log('INFO', message, metadata);
  }

  /**
   * 경고 로그
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log('WARN', message, metadata);
  }

  /**
   * 에러 로그
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const errorMetadata = {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };

    this.log('ERROR', message, errorMetadata);
  }

  /**
   * 디버그 로그 (개발 환경에서만)
   */
  debug(message: string, metadata?: Record<string, any>): void {
    if (process.env.STAGE === 'dev') {
      this.log('DEBUG', message, metadata);
    }
  }

  /**
   * 성능 로그 (처리 시간 포함)
   */
  performance(message: string, duration: number, metadata?: Record<string, any>): void {
    this.log('INFO', message, {
      ...metadata,
      duration
    });
  }

  /**
   * 사용자 활동 로그
   */
  userActivity(userId: string, activity: string, metadata?: Record<string, any>): void {
    this.log('INFO', `User activity: ${activity}`, {
      ...metadata,
      userId: PIIMasker.maskUserId(userId)
    });

    // 메트릭 기록
    MetricsService.recordUserActivity(activity).catch(err => {
      console.error('Failed to record user activity metric:', err);
    });
  }

  /**
   * API 요청 로그
   */
  apiRequest(
    method: string, 
    path: string, 
    statusCode: number, 
    duration: number,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    this.log('INFO', `API ${method} ${path} - ${statusCode}`, {
      ...metadata,
      method,
      path,
      statusCode,
      duration,
      userId: userId ? PIIMasker.maskUserId(userId) : undefined
    });

    // 메트릭 기록
    MetricsService.recordAPICall(this.service, path, statusCode, duration).catch(err => {
      console.error('Failed to record API metrics:', err);
    });
  }

  /**
   * 엔진 계산 로그
   */
  engineCalculation(
    engineType: string,
    success: boolean,
    duration: number,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    const message = `Engine ${engineType} calculation ${success ? 'completed' : 'failed'}`;
    
    this.log(success ? 'INFO' : 'ERROR', message, {
      ...metadata,
      engineType,
      success,
      duration,
      userId: userId ? PIIMasker.maskUserId(userId) : undefined
    });

    // 메트릭 기록
    MetricsService.recordEnginePerformance(engineType, success, duration).catch(err => {
      console.error('Failed to record engine metrics:', err);
    });
  }

  /**
   * 캐시 작업 로그
   */
  cacheOperation(
    operation: 'get' | 'set' | 'invalidate',
    cacheKey: string,
    hit?: boolean,
    metadata?: Record<string, any>
  ): void {
    this.log('DEBUG', `Cache ${operation}: ${cacheKey}`, {
      ...metadata,
      operation,
      cacheKey,
      hit
    });

    // 캐시 히트율 메트릭 (get 작업에서만)
    if (operation === 'get' && hit !== undefined) {
      const engineType = cacheKey.split('#')[1] || 'unknown';
      MetricsService.recordCacheHitRate(engineType, hit).catch(err => {
        console.error('Failed to record cache metrics:', err);
      });
    }
  }

  /**
   * 보안 이벤트 로그
   */
  securityEvent(event: string, userId?: string, metadata?: Record<string, any>): void {
    this.log('WARN', `Security event: ${event}`, {
      ...metadata,
      securityEvent: event,
      userId: userId ? PIIMasker.maskUserId(userId) : undefined
    });
  }

  /**
   * 기본 로그 메서드
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      correlationId: this.correlationId,
      service: this.service,
      message,
      ...metadata
    };

    // PII 마스킹 적용
    if (logEntry.metadata) {
      logEntry.metadata = PIIMasker.maskSensitiveData(logEntry.metadata);
    }

    // 콘솔 출력 (CloudWatch Logs로 전송됨)
    const logMethod = level === 'ERROR' ? console.error : 
                     level === 'WARN' ? console.warn : 
                     console.log;

    logMethod(JSON.stringify(logEntry));
  }

  /**
   * 상관관계 ID 생성
   */
  static generateCorrelationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `req-${timestamp}-${random}`;
  }

  /**
   * 새 로거 인스턴스 생성
   */
  static create(correlationId?: string, service?: string): Logger {
    return new Logger(
      correlationId || Logger.generateCorrelationId(),
      service
    );
  }
}

/**
 * 성능 모니터링 유틸리티
 */
export class PerformanceMonitor {
  private startTime: number;
  private logger: Logger;
  private operation: string;

  constructor(logger: Logger, operation: string) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = Date.now();
  }

  /**
   * 성공적인 작업 완료 기록
   */
  recordSuccess(metadata?: Record<string, any>): void {
    const duration = Date.now() - this.startTime;
    this.logger.performance(`Operation completed: ${this.operation}`, duration, {
      ...metadata,
      operation: this.operation,
      success: true
    });
  }

  /**
   * 실패한 작업 기록
   */
  recordFailure(error: Error, metadata?: Record<string, any>): void {
    const duration = Date.now() - this.startTime;
    this.logger.error(`Operation failed: ${this.operation}`, error, {
      ...metadata,
      operation: this.operation,
      duration,
      success: false
    });
  }

  /**
   * 현재까지의 경과 시간 반환
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
}

// 기본 로거 인스턴스 생성 함수
export function createLogger(correlationId?: string, service?: string): Logger {
  return Logger.create(correlationId, service);
}