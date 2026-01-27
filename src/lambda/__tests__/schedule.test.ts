import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../schedule';
import { db } from '../../services/database.service';
import { cache } from '../../services/cache.service';
import { AuthGuard } from '../../services/auth.service';
import { TimeService } from '../../services/time.service';

// Mock dependencies
jest.mock('../../services/database.service');
jest.mock('../../services/cache.service');
jest.mock('../../services/auth.service');
jest.mock('../../services/time.service');

const mockDb = db as jest.Mocked<typeof db>;
const mockCache = cache as jest.Mocked<typeof cache>;
const mockAuthGuard = AuthGuard as jest.Mocked<typeof AuthGuard>;
const mockTimeService = TimeService as jest.Mocked<typeof TimeService>;

describe('Schedule Lambda Handler', () => {
  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
    memoryLimitInMB: '128',
    awsRequestId: 'test-request-id',
    logGroupName: 'test-log-group',
    logStreamName: 'test-log-stream',
    getRemainingTimeInMillis: () => 30000,
    done: jest.fn(),
    fail: jest.fn(),
    succeed: jest.fn()
  };

  const mockAuthResult = {
    userId: 'test-user-id',
    cognitoSub: 'test-cognito-sub',
    role: 'user' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTimeService.formatToKST.mockReturnValue('2024-01-26T15:30:00+09:00');
    mockTimeService.validateWorkHours.mockReturnValue({
      isValid: true,
      hours: 8,
      crossesDate: false
    });
    mockAuthGuard.requireUser.mockResolvedValue(mockAuthResult);
  });

  describe('POST /api/v1/schedules', () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'POST',
      path: '/api/v1/schedules',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': 'test-correlation-id'
      },
      body: JSON.stringify({
        date: '2024-01-26',
        shiftType: 'DAY',
        startAt: '2024-01-26T09:00:00+09:00',
        endAt: '2024-01-26T17:00:00+09:00',
        commuteMin: 30,
        note: '일반 근무'
      })
    };

    it('should successfully create a new schedule', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce(null) // No existing schedule
        .mockResolvedValueOnce({ // Created schedule
          scheduleId: 'test-schedule-id',
          userId: 'test-user-id',
          date: '2024-01-26',
          shiftType: 'DAY',
          startAt: '2024-01-26T09:00:00+09:00',
          endAt: '2024-01-26T17:00:00+09:00',
          commuteMin: 30,
          note: '일반 근무',
          createdAt: '2024-01-26T06:30:00Z',
          updatedAt: '2024-01-26T06:30:00Z'
        });

      mockDb.checkScheduleOverlap.mockResolvedValue(false);
      mockCache.invalidateUserCache.mockResolvedValue(undefined);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(201);
      
      const body = JSON.parse(result.body);
      expect(body.data.scheduleId).toBe('test-schedule-id');
      expect(body.data.date).toBe('2024-01-26');
      expect(body.data.shiftType).toBe('DAY');
      expect(body.created).toBe(true);
    });

    it('should return conflict error for duplicate date', async () => {
      mockDb.queryOne.mockResolvedValue({ schedule_id: 'existing-id' });

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(409);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('RESOURCE_CONFLICT');
      expect(body.error.message).toBe('해당 날짜에 이미 근무표가 존재합니다');
    });

    it('should return conflict error for overlapping schedule', async () => {
      mockDb.queryOne.mockResolvedValue(null);
      mockDb.checkScheduleOverlap.mockResolvedValue(true);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(409);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('RESOURCE_CONFLICT');
      expect(body.error.message).toBe('근무 시간이 기존 근무표와 겹칩니다');
    });

    it('should successfully create OFF schedule without time validation', async () => {
      const offEvent = {
        ...mockEvent,
        body: JSON.stringify({
          date: '2024-01-26',
          shiftType: 'OFF',
          commuteMin: 0
        })
      };

      mockDb.queryOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          scheduleId: 'test-schedule-id',
          userId: 'test-user-id',
          date: '2024-01-26',
          shiftType: 'OFF',
          startAt: null,
          endAt: null,
          commuteMin: 0,
          note: null,
          createdAt: '2024-01-26T06:30:00Z',
          updatedAt: '2024-01-26T06:30:00Z'
        });

      mockCache.invalidateUserCache.mockResolvedValue(undefined);

      const result = await handler(offEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(201);
      expect(mockDb.checkScheduleOverlap).not.toHaveBeenCalled();
    });

    it('should return validation error for invalid work hours', async () => {
      mockTimeService.validateWorkHours.mockReturnValue({
        isValid: false,
        hours: 2,
        crossesDate: false
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/schedules', () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'GET',
      path: '/api/v1/schedules',
      headers: {
        'X-Correlation-Id': 'test-correlation-id'
      },
      queryStringParameters: {
        from: '2024-01-01',
        to: '2024-01-31',
        limit: '10'
      }
    };

    it('should successfully retrieve schedules with pagination', async () => {
      const mockSchedules = [
        {
          scheduleId: 'schedule-1',
          userId: 'test-user-id',
          date: '2024-01-26',
          shiftType: 'DAY',
          startAt: '2024-01-26T09:00:00+09:00',
          endAt: '2024-01-26T17:00:00+09:00',
          commuteMin: 30,
          note: null,
          createdAt: '2024-01-26T06:30:00Z',
          updatedAt: '2024-01-26T06:30:00Z'
        }
      ];

      mockDb.queryWithCursor.mockResolvedValue(mockSchedules);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].scheduleId).toBe('schedule-1');
      expect(body.hasMore).toBe(false);
    });

    it('should return validation error for invalid date range', async () => {
      const invalidEvent = {
        ...mockEvent,
        queryStringParameters: {
          from: '2024-01-31',
          to: '2024-01-01', // Invalid: from > to
          limit: '10'
        }
      };

      const result = await handler(invalidEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for invalid pagination params', async () => {
      const invalidEvent = {
        ...mockEvent,
        queryStringParameters: {
          limit: '200' // Too large
        }
      };

      const result = await handler(invalidEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/v1/schedules/{date}', () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'PUT',
      path: '/api/v1/schedules/2024-01-26',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': 'test-correlation-id'
      },
      body: JSON.stringify({
        shiftType: 'MID',
        startAt: '2024-01-26T14:00:00+09:00',
        endAt: '2024-01-26T22:00:00+09:00',
        commuteMin: 45,
        note: '수정된 근무'
      })
    };

    it('should successfully update existing schedule', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce({ schedule_id: 'existing-id' }) // Existing schedule
        .mockResolvedValueOnce({ // Updated schedule
          scheduleId: 'existing-id',
          userId: 'test-user-id',
          date: '2024-01-26',
          shiftType: 'MID',
          startAt: '2024-01-26T14:00:00+09:00',
          endAt: '2024-01-26T22:00:00+09:00',
          commuteMin: 45,
          note: '수정된 근무',
          createdAt: '2024-01-26T06:30:00Z',
          updatedAt: '2024-01-26T07:30:00Z'
        });

      mockDb.checkScheduleOverlap.mockResolvedValue(false);
      mockCache.invalidateUserCache.mockResolvedValue(undefined);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.data.shiftType).toBe('MID');
      expect(body.data.note).toBe('수정된 근무');
    });

    it('should return not found error for non-existent schedule', async () => {
      mockDb.queryOne.mockResolvedValue(null);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(404);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('should return validation error for invalid date format', async () => {
      const invalidEvent = {
        ...mockEvent,
        path: '/api/v1/schedules/invalid-date'
      };

      const result = await handler(invalidEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/v1/schedules/{date}', () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'DELETE',
      path: '/api/v1/schedules/2024-01-26',
      headers: {
        'X-Correlation-Id': 'test-correlation-id'
      }
    };

    it('should successfully delete existing schedule', async () => {
      mockDb.query.mockResolvedValue([{ schedule_id: 'deleted-id' }]);
      mockCache.invalidateUserCache.mockResolvedValue(undefined);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(204);
      expect(result.body).toBe('');
    });

    it('should return not found error for non-existent schedule', async () => {
      mockDb.query.mockResolvedValue([]);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(404);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('POST /api/v1/schedules/bulk-import', () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'POST',
      path: '/api/v1/schedules/bulk-import',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': 'test-correlation-id'
      },
      body: JSON.stringify({
        schedules: [
          {
            date: '2024-01-26',
            shiftType: 'DAY',
            startAt: '2024-01-26T09:00:00+09:00',
            endAt: '2024-01-26T17:00:00+09:00',
            commuteMin: 30
          },
          {
            date: '2024-01-27',
            shiftType: 'OFF',
            commuteMin: 0
          }
        ],
        overwrite: false
      })
    };

    it('should successfully import multiple schedules', async () => {
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] }) // No existing for first
            .mockResolvedValueOnce({}) // Insert first
            .mockResolvedValueOnce({ rows: [] }) // No existing for second
            .mockResolvedValueOnce({}) // Insert second
        } as any;
        
        return await callback(mockClient);
      });

      mockCache.invalidateUserCache.mockResolvedValue(undefined);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.data.total).toBe(2);
      expect(body.data.created).toBe(2);
      expect(body.data.failed).toBe(0);
    });

    it('should return validation error for too many schedules', async () => {
      const largeEvent = {
        ...mockEvent,
        body: JSON.stringify({
          schedules: Array(101).fill({
            date: '2024-01-26',
            shiftType: 'DAY',
            startAt: '2024-01-26T09:00:00+09:00',
            endAt: '2024-01-26T17:00:00+09:00',
            commuteMin: 30
          })
        })
      };

      const result = await handler(largeEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('한 번에 최대 100개까지 가져올 수 있습니다');
    });
  });

  describe('OPTIONS /api/v1/schedules', () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'OPTIONS',
      path: '/api/v1/schedules',
      headers: {}
    };

    it('should return CORS preflight response', async () => {
      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Correlation-Id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Max-Age': '86400'
      });
    });
  });

  describe('GET /api/v1/schedules/health', () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'GET',
      path: '/api/v1/schedules/health',
      headers: {
        'X-Correlation-Id': 'test-correlation-id'
      }
    };

    it('should return healthy status', async () => {
      mockDb.healthCheck.mockResolvedValue({
        status: 'healthy',
        timestamp: '2024-01-26T15:30:00+09:00'
      });
      
      mockCache.healthCheck.mockResolvedValue({
        status: 'healthy',
        redis: true,
        memory: 1024,
        database: true
      });

      mockTimeService.nowKST.mockReturnValue('2024-01-26T15:30:00+09:00');

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.data.status).toBe('healthy');
      expect(body.data.service).toBe('schedule-handler');
      expect(body.data.database).toBe(true);
      expect(body.data.cache).toBe(true);
    });

    it('should return degraded status when cache fails', async () => {
      mockDb.healthCheck.mockResolvedValue({
        status: 'healthy',
        timestamp: '2024-01-26T15:30:00+09:00'
      });
      
      mockCache.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        redis: false,
        memory: 1024,
        database: true
      });

      mockTimeService.nowKST.mockReturnValue('2024-01-26T15:30:00+09:00');

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.data.status).toBe('degraded');
      expect(body.data.database).toBe(true);
      expect(body.data.cache).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle unknown endpoints', async () => {
      const unknownEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PATCH',
        path: '/api/v1/schedules/unknown',
        headers: {
          'X-Correlation-Id': 'test-correlation-id'
        }
      };

      const result = await handler(unknownEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(404);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
      expect(body.error.message).toBe('API 엔드포인트를 찾을 수 없습니다');
    });

    it('should generate correlation ID when not provided', async () => {
      const noCorrelationEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/api/v1/schedules/unknown',
        headers: {}
      };

      const result = await handler(noCorrelationEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(404);
      
      const body = JSON.parse(result.body);
      expect(body.correlationId).toMatch(/^req-\d+-[a-z0-9]+$/);
    });
  });
});