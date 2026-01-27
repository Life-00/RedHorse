import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../user';
import { db } from '../../services/database.service';
import { AuthGuard } from '../../services/auth.service';
import { TimeService } from '../../services/time.service';

// Mock dependencies
jest.mock('../../services/database.service');
jest.mock('../../services/auth.service');
jest.mock('../../services/time.service');

const mockDb = db as jest.Mocked<typeof db>;
const mockAuthGuard = AuthGuard as jest.Mocked<typeof AuthGuard>;
const mockTimeService = TimeService as jest.Mocked<typeof TimeService>;

describe('User Lambda Handler', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockTimeService.formatToKST.mockReturnValue('2024-01-26T15:30:00+09:00');
  });

  describe('POST /api/v1/users/onboarding', () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'POST',
      path: '/api/v1/users/onboarding',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': 'test-correlation-id'
      },
      requestContext: {
        authorizer: {
          claims: {
            sub: 'test-cognito-sub',
            email: 'test@example.com'
          }
        }
      } as any,
      body: JSON.stringify({
        shiftType: 'THREE_SHIFT',
        commuteMin: 30,
        wearableSettings: {
          enabled: true,
          deviceType: 'APPLE_HEALTH'
        }
      })
    };

    it('should successfully create a new user', async () => {
      // Mock database transaction
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] }) // No existing user
            .mockResolvedValueOnce({ 
              rows: [{ 
                user_id: 'test-user-id', 
                created_at: new Date('2024-01-26T06:30:00Z') 
              }] 
            }) // User creation
            .mockResolvedValue({ rows: [] }) // Checklist items
        } as any;
        
        return await callback(mockClient);
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(201);
      
      const body = JSON.parse(result.body);
      expect(body.data).toEqual({
        userId: 'test-user-id',
        cognitoSub: 'test-cognito-sub',
        shiftType: 'THREE_SHIFT',
        commuteMin: 30,
        wearableConnected: true,
        createdAt: '2024-01-26T15:30:00+09:00'
      });
      expect(body.created).toBe(true);
      expect(body.correlationId).toBe('test-correlation-id');
    });

    it('should return conflict error for existing user', async () => {
      // Mock existing user
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ user_id: 'existing-user-id' }] })
        } as any;
        
        try {
          await callback(mockClient);
        } catch (error) {
          throw new Error('이미 온보딩이 완료된 사용자입니다');
        }
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(409);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('RESOURCE_CONFLICT');
      expect(body.error.message).toBe('이미 온보딩이 완료된 사용자입니다');
    });

    it('should return validation error for invalid input', async () => {
      const invalidEvent = {
        ...mockEvent,
        body: JSON.stringify({
          shiftType: 'INVALID_SHIFT',
          commuteMin: -10, // Invalid negative value
          wearableSettings: {
            enabled: 'not-boolean' // Invalid type
          }
        })
      };

      const result = await handler(invalidEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details.errors).toBeDefined();
    });

    it('should return authentication error when claims are missing', async () => {
      const noAuthEvent = {
        ...mockEvent,
        requestContext: {
          authorizer: null
        }
      };

      const result = await handler(noAuthEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(401);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should return validation error when body is missing', async () => {
      const noBodyEvent = {
        ...mockEvent,
        body: null
      };

      const result = await handler(noBodyEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('요청 본문이 필요합니다');
    });
  });

  describe('GET /api/v1/users/profile', () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'GET',
      path: '/api/v1/users/profile',
      headers: {
        'X-Correlation-Id': 'test-correlation-id'
      },
      requestContext: {
        authorizer: {
          claims: {
            sub: 'test-cognito-sub'
          }
        }
      } as any
    };

    it('should successfully retrieve user profile', async () => {
      const mockAuthResult = {
        userId: 'test-user-id',
        cognitoSub: 'test-cognito-sub',
        role: 'user' as const
      };

      mockAuthGuard.requireUser.mockResolvedValue(mockAuthResult);
      
      const mockProfile = {
        userId: 'test-user-id',
        cognitoSub: 'test-cognito-sub',
        shiftType: 'THREE_SHIFT',
        commuteMin: 30,
        wearableConnected: true,
        orgId: null,
        lastActiveAt: '2024-01-26T06:30:00Z',
        createdAt: '2024-01-26T06:30:00Z',
        updatedAt: '2024-01-26T06:30:00Z'
      };

      mockDb.queryOne.mockResolvedValue(mockProfile);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.data.userId).toBe('test-user-id');
      expect(body.data.shiftType).toBe('THREE_SHIFT');
      expect(body.data.commuteMin).toBe(30);
      expect(body.data.wearableConnected).toBe(true);
    });

    it('should return not found error when profile does not exist', async () => {
      const mockAuthResult = {
        userId: 'test-user-id',
        cognitoSub: 'test-cognito-sub',
        role: 'user' as const
      };

      mockAuthGuard.requireUser.mockResolvedValue(mockAuthResult);
      mockDb.queryOne.mockResolvedValue(null);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(404);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
      expect(body.error.message).toBe('사용자 프로필을 찾을 수 없습니다');
    });
  });

  describe('PUT /api/v1/users/profile', () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'PUT',
      path: '/api/v1/users/profile',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': 'test-correlation-id'
      },
      requestContext: {
        authorizer: {
          claims: {
            sub: 'test-cognito-sub'
          }
        }
      } as any,
      body: JSON.stringify({
        shiftType: 'TWO_SHIFT',
        commuteMin: 45
      })
    };

    it('should successfully update user profile', async () => {
      const mockAuthResult = {
        userId: 'test-user-id',
        cognitoSub: 'test-cognito-sub',
        role: 'user' as const
      };

      mockAuthGuard.requireUser.mockResolvedValue(mockAuthResult);
      
      const mockUpdatedProfile = {
        userId: 'test-user-id',
        shiftType: 'TWO_SHIFT',
        commuteMin: 45,
        wearableConnected: true,
        updatedAt: '2024-01-26T06:30:00Z'
      };

      mockDb.queryOne.mockResolvedValue(mockUpdatedProfile);
      mockDb.invalidateUserCache.mockResolvedValue(undefined);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.data.shiftType).toBe('TWO_SHIFT');
      expect(body.data.commuteMin).toBe(45);
      
      // Cache invalidation should be called
      expect(mockDb.invalidateUserCache).toHaveBeenCalledWith('test-user-id');
    });

    it('should return validation error when no fields to update', async () => {
      const emptyUpdateEvent = {
        ...mockEvent,
        body: JSON.stringify({})
      };

      const mockAuthResult = {
        userId: 'test-user-id',
        cognitoSub: 'test-cognito-sub',
        role: 'user' as const
      };

      mockAuthGuard.requireUser.mockResolvedValue(mockAuthResult);

      const result = await handler(emptyUpdateEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('업데이트할 필드가 없습니다');
    });
  });

  describe('DELETE /api/v1/users/profile', () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'DELETE',
      path: '/api/v1/users/profile',
      headers: {
        'X-Correlation-Id': 'test-correlation-id'
      },
      requestContext: {
        authorizer: {
          claims: {
            sub: 'test-cognito-sub'
          }
        }
      } as any
    };

    it('should successfully delete user profile', async () => {
      const mockAuthResult = {
        userId: 'test-user-id',
        cognitoSub: 'test-cognito-sub',
        role: 'user' as const
      };

      mockAuthGuard.requireUser.mockResolvedValue(mockAuthResult);
      mockDb.query.mockResolvedValue([{ user_id: 'test-user-id' }]);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(204);
      expect(result.body).toBe('');
    });

    it('should return not found error when user does not exist', async () => {
      const mockAuthResult = {
        userId: 'test-user-id',
        cognitoSub: 'test-cognito-sub',
        role: 'user' as const
      };

      mockAuthGuard.requireUser.mockResolvedValue(mockAuthResult);
      mockDb.query.mockResolvedValue([]);

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(404);
      
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('OPTIONS /api/v1/users/*', () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'OPTIONS',
      path: '/api/v1/users/profile',
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

  describe('GET /api/v1/users/health', () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'GET',
      path: '/api/v1/users/health',
      headers: {
        'X-Correlation-Id': 'test-correlation-id'
      }
    };

    it('should return healthy status', async () => {
      mockDb.healthCheck.mockResolvedValue({
        status: 'healthy',
        timestamp: '2024-01-26T15:30:00+09:00'
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.data.status).toBe('healthy');
      expect(body.data.service).toBe('user-handler');
    });

    it('should return unhealthy status when database fails', async () => {
      mockDb.healthCheck.mockRejectedValue(new Error('Database connection failed'));

      const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(500);
      
      const body = JSON.parse(result.body);
      expect(body.data.service).toBe('user-handler');
      expect(body.data.error).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle unknown endpoints', async () => {
      const unknownEvent: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/api/v1/users/unknown',
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
        path: '/api/v1/users/unknown',
        headers: {}
      };

      const result = await handler(noCorrelationEvent as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(404);
      
      const body = JSON.parse(result.body);
      expect(body.correlationId).toMatch(/^req-\d+-[a-z0-9]+$/);
    });
  });
});