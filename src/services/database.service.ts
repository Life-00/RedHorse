import { Pool, PoolClient, QueryResult } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/**
 * 데이터베이스 연결 서비스
 * RDS Proxy를 통한 PostgreSQL 연결 관리
 * 연결 풀링, 트랜잭션, 에러 처리 지원
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private pool: Pool | null = null;
  private secretsManager: SecretsManagerClient;

  private constructor() {
    this.secretsManager = new SecretsManagerClient({ 
      region: process.env.REGION || 'us-east-1' 
    });
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * 데이터베이스 연결 풀 초기화
   * RDS Proxy 엔드포인트 사용으로 Lambda 최적화
   */
  private async initializePool(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    try {
      // Secrets Manager에서 데이터베이스 자격 증명 조회
      const secretArn = process.env.DB_CREDENTIALS_SECRET_ARN;
      if (!secretArn) {
        throw new Error('DB_CREDENTIALS_SECRET_ARN environment variable is required');
      }

      const command = new GetSecretValueCommand({ SecretId: secretArn });
      const secretResponse = await this.secretsManager.send(command);
      
      if (!secretResponse.SecretString) {
        throw new Error('Failed to retrieve database credentials from Secrets Manager');
      }

      const credentials = JSON.parse(secretResponse.SecretString);

      // RDS Proxy 연결 설정 - Lambda 환경에 최적화
      this.pool = new Pool({
        host: process.env.RDS_PROXY_ENDPOINT,
        port: 5432,
        database: process.env.DB_NAME || 'shiftsleep',
        user: credentials.username,
        password: credentials.password,
        ssl: { 
          rejectUnauthorized: false // RDS Proxy SSL 설정
        },
        // Lambda 환경 최적화 설정
        max: 2, // Lambda당 최대 연결 수 (동시성 고려)
        min: 0, // 최소 연결 수 (콜드 스타트 최적화)
        idleTimeoutMillis: 30000, // 30초 후 유휴 연결 해제
        connectionTimeoutMillis: 2000, // 2초 연결 타임아웃
        allowExitOnIdle: true, // Lambda 종료 시 연결 정리
      });

      // 연결 풀 이벤트 리스너
      this.pool.on('error', (err: Error) => {
        console.error('Database pool error:', {
          message: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
      });

      this.pool.on('connect', (client: PoolClient) => {
        console.log('Database connection established', {
          timestamp: new Date().toISOString()
        });
      });

      this.pool.on('remove', (client: PoolClient) => {
        console.log('Database connection removed', {
          timestamp: new Date().toISOString()
        });
      });

      return this.pool;
    } catch (error) {
      console.error('Failed to initialize database pool:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * SQL 쿼리 실행
   * @param text SQL 쿼리 문자열
   * @param params 쿼리 매개변수
   * @returns 쿼리 결과
   */
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const pool = await this.initializePool();
    const client = await pool.connect();
    
    try {
      const startTime = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - startTime;

      // 성능 로깅 (개발 환경에서만)
      if (process.env.STAGE === 'dev' && duration > 1000) {
        console.warn(`Slow query detected (${duration}ms):`, {
          query: text.substring(0, 100),
          params: params?.length || 0,
          rowCount: result.rowCount,
          duration,
          timestamp: new Date().toISOString()
        });
      }

      return result.rows as T[];
    } catch (error) {
      console.error('Database query error:', {
        query: text.substring(0, 100),
        params: params?.length || 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 트랜잭션 실행
   * @param callback 트랜잭션 내에서 실행할 콜백 함수
   * @returns 콜백 함수의 반환값
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const pool = await this.initializePool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 단일 레코드 조회
   * @param text SQL 쿼리 문자열
   * @param params 쿼리 매개변수
   * @returns 단일 레코드 또는 null
   */
  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(text, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 레코드 존재 여부 확인
   * @param text SQL 쿼리 문자열
   * @param params 쿼리 매개변수
   * @returns 존재 여부
   */
  async exists(text: string, params?: any[]): Promise<boolean> {
    const result = await this.queryOne<{ exists: boolean }>(
      `SELECT EXISTS(${text}) as exists`,
      params
    );
    return result?.exists || false;
  }

  /**
   * 배치 삽입 (성능 최적화)
   * @param tableName 테이블명
   * @param columns 컬럼 배열
   * @param values 값 배열의 배열
   * @returns 삽입된 레코드 수
   */
  async batchInsert(
    tableName: string, 
    columns: string[], 
    values: any[][]
  ): Promise<number> {
    if (values.length === 0) return 0;

    const placeholders = values.map((_, rowIndex) => 
      `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
    ).join(', ');

    const flatValues = values.flat();
    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`;

    await this.query(query, flatValues);
    return values.length;
  }

  /**
   * 커서 기반 페이지네이션 쿼리 (ADR-004)
   * @param baseQuery 기본 쿼리 (WHERE 절 제외)
   * @param whereConditions WHERE 조건 배열
   * @param cursorCondition 커서 조건 (선택적)
   * @param orderBy 정렬 조건
   * @param limit 페이지 크기
   * @param params 쿼리 매개변수
   * @returns 페이지네이션 결과
   */
  async queryWithCursor<T = any>(
    baseQuery: string,
    whereConditions: string[],
    cursorCondition: string | null,
    orderBy: string,
    limit: number,
    params: any[]
  ): Promise<T[]> {
    const conditions = [...whereConditions];
    if (cursorCondition) {
      conditions.push(cursorCondition);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `${baseQuery} ${whereClause} ORDER BY ${orderBy} LIMIT $${params.length + 1}`;
    
    return this.query<T>(query, [...params, limit]);
  }

  /**
   * 사용자 활성도 업데이트 (ADR-009)
   * @param cognitoSub Cognito subject
   */
  async updateUserActivity(cognitoSub: string): Promise<void> {
    await this.query(
      'UPDATE users SET last_active_at = NOW() WHERE cognito_sub = $1',
      [cognitoSub]
    );
  }

  /**
   * 만료된 캐시 정리
   * @returns 삭제된 레코드 수
   */
  async cleanupExpiredCache(): Promise<number> {
    const result = await this.queryOne<{ count: number }>(
      'DELETE FROM engine_cache WHERE expires_at < NOW() RETURNING COUNT(*) as count'
    );
    return result?.count || 0;
  }

  /**
   * 근무표 겹침 검증
   * @param userId 사용자 ID
   * @param date 날짜
   * @param startAt 시작 시간
   * @param endAt 종료 시간
   * @param excludeScheduleId 제외할 스케줄 ID (수정 시)
   * @returns 겹침 여부
   */
  async checkScheduleOverlap(
    userId: string,
    date: string,
    startAt: string,
    endAt: string,
    excludeScheduleId?: string
  ): Promise<boolean> {
    let query = `
      SELECT COUNT(*) as count FROM shift_schedules 
      WHERE user_id = $1 AND date = $2 AND shift_type != 'OFF'
        AND (start_at, end_at) OVERLAPS ($3::timestamptz, $4::timestamptz)
    `;
    const params: any[] = [userId, date, startAt, endAt];

    if (excludeScheduleId) {
      query += ' AND schedule_id != $5';
      params.push(excludeScheduleId);
    }

    const result = await this.queryOne<{ count: number }>(query, params);
    return (result?.count || 0) > 0;
  }

  /**
   * 활성 사용자 목록 조회 (배치 작업용)
   * @param daysSince 기준 일수 (기본 7일)
   * @returns 활성 사용자 ID 배열
   */
  async getActiveUserIds(daysSince: number = 7): Promise<string[]> {
    const results = await this.query<{ user_id: string }>(
      `SELECT user_id FROM users 
       WHERE last_active_at >= NOW() - INTERVAL '${daysSince} days'
       ORDER BY last_active_at DESC`,
      []
    );
    return results.map(r => r.user_id);
  }

  /**
   * 캐시 무효화 (사용자별)
   * @param userId 사용자 ID
   * @param fromDate 시작 날짜 (선택적)
   */
  async invalidateUserCache(userId: string, fromDate?: string): Promise<void> {
    let query = 'DELETE FROM engine_cache WHERE user_id = $1';
    const params: any[] = [userId];

    if (fromDate) {
      query += ' AND target_date >= $2';
      params.push(fromDate);
    }

    await this.query(query, params);
  }

  /**
   * 연결 풀 통계 조회
   * @returns 연결 풀 상태 정보
   */
  getPoolStats(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    if (!this.pool) {
      return { totalCount: 0, idleCount: 0, waitingCount: 0 };
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * 연결 풀 종료 (테스트용)
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * 헬스 체크
   * @returns 데이터베이스 연결 상태
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; poolStats?: any }> {
    try {
      const result = await this.queryOne<{ now: string }>('SELECT NOW() as now');
      return {
        status: 'healthy',
        timestamp: result?.now || new Date().toISOString(),
        poolStats: this.getPoolStats()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        poolStats: this.getPoolStats()
      };
    }
  }

  /**
   * 연결 재시도 로직 (Lambda 콜드 스타트 대응)
   * @param operation 실행할 데이터베이스 작업
   * @param maxRetries 최대 재시도 횟수
   * @returns 작업 결과
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, {
          error: lastError.message,
          attempt,
          timestamp: new Date().toISOString()
        });

        // 마지막 시도가 아니면 잠시 대기
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    throw lastError!;
  }
}

// 싱글톤 인스턴스 내보내기
export const db = DatabaseService.getInstance();