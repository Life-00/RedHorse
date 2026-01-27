import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../schedule';

// Mock all dependencies
jest.mock('../../services/database.service', () => ({
  db: {
    queryOne: jest.fn(),
    query: jest.fn(),
    queryWithCursor: jest.fn(),
    checkScheduleOverlap: jest.fn(),
    transaction: jest.fn(),
    healthCheck: jest.fn()
  }
}));

jest.mock('../../services/cache.service', () => ({
  cache: {
    invalidateUserCache: jest.fn(),
    healthCheck: jest.fn()
  }
}));

jest.mock('../../services/auth.service', () => ({
  AuthGuard: {
    requireUser: jest.fn()
  }
}));

jest.mock('../../services/time.service', () => ({
  TimeService: {
    formatToKST: jest.fn(),
    validateWorkHours: jest.fn(),
    nowKST: jest.fn()
  }
}));

describe('Schedule Lambda Handler - Simple Tests', () => {
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

  it('should handle OPTIONS request', async () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'OPTIONS',
      path: '/api/v1/schedules',
      headers: {}
    };

    const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Correlation-Id',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Max-Age': '86400'
    });
  });

  it('should handle unknown endpoints', async () => {
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'PATCH',
      path: '/api/v1/schedules/unknown',
      headers: {
        'X-Correlation-Id': 'test-correlation-id'
      }
    };

    const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(404);
    
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
    expect(body.error.message).toBe('API 엔드포인트를 찾을 수 없습니다');
  });

  it('should generate correlation ID when not provided', async () => {
    // Mock AuthGuard to throw error for unknown endpoint
    const { AuthGuard } = require('../../services/auth.service');
    AuthGuard.requireUser.mockRejectedValue(new Error('Authentication failed'));

    const mockEvent: Partial<APIGatewayProxyEvent> = {
      httpMethod: 'GET',
      path: '/api/v1/schedules/unknown',
      headers: {}
    };

    const result = await handler(mockEvent as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(500); // Internal error due to auth failure
    
    const body = JSON.parse(result.body);
    expect(body.correlationId).toMatch(/^req-\d+-[a-z0-9]+$/);
  });
});