---
inclusion: always
---

# 관측가능성 및 모니터링 가이드라인

## Correlation ID 전파 규칙

**요청/응답 모두 포함**
- 모든 API 요청에 `X-Correlation-Id` 헤더 생성 및 전파
- 클라이언트가 제공하지 않으면 서버에서 UUID 생성
- 모든 응답에 동일한 correlation ID 포함
- 내부 서비스 호출 시에도 전파

```typescript
class CorrelationService {
  static generateId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static extractFromEvent(event: APIGatewayProxyEvent): string {
    return event.headers['X-Correlation-Id'] || 
           event.headers['x-correlation-id'] || 
           this.generateId();
  }

  static addToResponse(response: any, correlationId: string): any {
    return {
      ...response,
      headers: {
        ...response.headers,
        'X-Correlation-Id': correlationId
      }
    };
  }
}
```

## 구조화된 로깅

**JSON 로그 형식 사용**
```typescript
interface LogEntry {
  timestamp: string;        // ISO 8601
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
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

class Logger {
  private correlationId: string;
  private service: string;

  constructor(correlationId: string, service: string) {
    this.correlationId = correlationId;
    this.service = service;
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('INFO', message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log('ERROR', message, {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }

  private log(level: string, message: string, metadata?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: level as any,
      correlationId: this.correlationId,
      service: this.service,
      message,
      ...metadata
    };

    console.log(JSON.stringify(logEntry));
  }
}
```

## PII 마스킹 정책

**개인정보 보호 규칙**
- 이메일: `a***@domain.com` 형식으로 마스킹
- 이름: 저장/로그 금지 (userId만 사용)
- 전화번호: 저장하지 않음
- 주소: 저장하지 않음

```typescript
class PIIMasker {
  static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 1) return `*@${domain}`;
    return `${local[0]}***@${domain}`;
  }

  static maskSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) return data;

    const masked = { ...data };
    
    // 이메일 마스킹
    if (masked.email) {
      masked.email = this.maskEmail(masked.email);
    }

    // 이름 필드 제거
    delete masked.name;
    delete masked.firstName;
    delete masked.lastName;

    return masked;
  }
}
```

## 주요 메트릭 수집

**CloudWatch 커스텀 메트릭**
```typescript
class MetricsService {
  static async recordAPICall(
    functionName: string,
    endpoint: string,
    statusCode: number,
    duration: number
  ): Promise<void> {
    const metrics = [
      {
        MetricName: 'APICallCount',
        Dimensions: [
          { Name: 'FunctionName', Value: functionName },
          { Name: 'Endpoint', Value: endpoint },
          { Name: 'StatusCode', Value: statusCode.toString() }
        ],
        Value: 1,
        Unit: 'Count'
      },
      {
        MetricName: 'APIResponseTime',
        Dimensions: [
          { Name: 'FunctionName', Value: functionName },
          { Name: 'Endpoint', Value: endpoint }
        ],
        Value: duration,
        Unit: 'Milliseconds'
      }
    ];

    // CloudWatch에 메트릭 전송
    await cloudWatch.putMetricData({
      Namespace: 'ShiftSleep/API',
      MetricData: metrics
    }).promise();
  }

  static async recordEnginePerformance(
    engineType: string,
    success: boolean,
    duration: number
  ): Promise<void> {
    const metrics = [
      {
        MetricName: 'EngineCalculationCount',
        Dimensions: [
          { Name: 'EngineType', Value: engineType },
          { Name: 'Success', Value: success.toString() }
        ],
        Value: 1,
        Unit: 'Count'
      },
      {
        MetricName: 'EngineCalculationTime',
        Dimensions: [
          { Name: 'EngineType', Value: engineType }
        ],
        Value: duration,
        Unit: 'Milliseconds'
      }
    ];

    await cloudWatch.putMetricData({
      Namespace: 'ShiftSleep/Engine',
      MetricData: metrics
    }).promise();
  }
}
```

## 알람 기준

**CloudWatch 알람 설정**
```typescript
const ALARM_THRESHOLDS = {
  ERROR_RATE: {
    threshold: 1,           // 1% 이상
    evaluationPeriods: 2,   // 2회 연속
    period: 300            // 5분 간격
  },
  RESPONSE_TIME_P95: {
    threshold: 1000,        // 1초 이상
    evaluationPeriods: 2,   // 2회 연속
    period: 300            // 5분 간격
  },
  BATCH_FAILURE: {
    threshold: 3,           // 3회 연속 실패
    evaluationPeriods: 1,   // 즉시
    period: 3600           // 1시간 간격
  },
  RDS_CONNECTION_POOL: {
    threshold: 80,          // 80% 이상 사용
    evaluationPeriods: 1,   // 즉시
    period: 300            // 5분 간격
  }
};
```

## 성능 모니터링

**Lambda 성능 지표**
```typescript
class PerformanceMonitor {
  private startTime: number;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.startTime = Date.now();
  }

  recordDuration(operation: string): void {
    const duration = Date.now() - this.startTime;
    
    this.logger.info(`Operation completed: ${operation}`, {
      duration,
      operation
    });

    // 성능 메트릭 기록
    MetricsService.recordAPICall(
      process.env.AWS_LAMBDA_FUNCTION_NAME || 'unknown',
      operation,
      200,
      duration
    );
  }

  recordError(operation: string, error: Error): void {
    const duration = Date.now() - this.startTime;
    
    this.logger.error(`Operation failed: ${operation}`, error, {
      duration,
      operation
    });
  }
}
```

## 대시보드 구성

**CloudWatch 대시보드 위젯**
1. **API 성능 위젯**
   - API 호출 수 (시간별)
   - 응답 시간 P50, P95, P99
   - 에러율 (%)

2. **엔진 성능 위젯**
   - 엔진별 계산 시간
   - 엔진별 성공률
   - 캐시 히트율

3. **시스템 리소스 위젯**
   - Lambda 동시 실행 수
   - RDS 연결 수
   - S3 요청 수

4. **비즈니스 메트릭 위젯**
   - 일일 활성 사용자 수
   - 근무표 입력 완료율
   - 엔진 사용률

## 로그 보존 정책

**CloudWatch Logs 보존 기간**
- **기본**: 7일 보존 (비용 최적화)
- **에러 로그**: 30일 보존
- **감사 로그**: 1년 보존 (B2B 요구사항)
- **성능 로그**: 7일 보존