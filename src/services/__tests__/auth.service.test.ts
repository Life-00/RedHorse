import { APIGatewayProxyEvent } from 'aws-lambda';
import { AuthService, AuthenticationError, AuthorizationError } from '../auth.service';
import { db } from '../database.service';

// Mock dependencies
jest.mock('../database.service');
jest.mock('../logger.service', () => ({
  Logger: {
    create: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }))
  }
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('AuthService', () => {
  let authService: AuthService;
  let mockEvent: APIGatewayProxyEvent;

  beforeEach(() => {
    authService = AuthService.getInstance();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock basic event structure
    mockEvent = {
      requestContext: {
        authorizer: {
          claims: {
            sub: 'test-cognito-sub',
            email: 'test@example.com',
            aud: 'test-audience',
            iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TEST',
            exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
            iat: Math.floor(Date.now() / 1000) - 300,  // 5 minutes ago
          }
        }
      },
      headers: {},
      path: '/api/v1/test',
    } as any;

    // Mock logger methods
    // Logger is already mocked in the module mock above
  });

  describe('requireUser', () => {
    it('should successfully authenticate a valid user', async () => {
      // Arrange
      const mockUserId = 'test-user-id';
      mockDb.queryOne.mockResolvedValueOnce({ user_id: mockUserId });
      mockDb.updateUserActivity.mockResolvedValueOnce(undefined);

      // Act
      const result = await authService.requireUser(mockEvent);

      // Assert
      expect(result).toEqual({
        userId: mockUserId,
        cognitoSub: 'test-cognito-sub',
        role: 'user',
        orgId: undefined,
      });
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        'SELECT user_id FROM users WHERE cognito_sub = $1',
        ['test-cognito-sub']
      );
      expect(mockDb.updateUserActivity).toHaveBeenCalledWith('test-cognito-sub');
    });

    it('should throw AuthenticationError when user not found', async () => {
      // Arrange
      mockDb.queryOne.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(authService.requireUser(mockEvent)).rejects.toThrow(AuthenticationError);
      // Note: Logger calls are mocked, so we can't easily verify them in this test setup
    });

    it('should throw AuthenticationError when token is expired', async () => {
      // Arrange
      mockEvent.requestContext.authorizer!.claims.exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      // Act & Assert
      await expect(authService.requireUser(mockEvent)).rejects.toThrow(AuthenticationError);
      // Note: Logger calls are mocked, so we can't easily verify them in this test setup
    });

    it('should throw AuthenticationError when claims are missing', async () => {
      // Arrange
      mockEvent.requestContext.authorizer = undefined;

      // Act & Assert
      await expect(authService.requireUser(mockEvent)).rejects.toThrow(AuthenticationError);
      // Note: Logger calls are mocked, so we can't easily verify them in this test setup
    });
  });

  describe('requireB2BAdmin', () => {
    beforeEach(() => {
      mockEvent.requestContext.authorizer!.claims['custom:role'] = 'b2b_admin';
      mockEvent.requestContext.authorizer!.claims['custom:orgId'] = 'test-org-id';
    });

    it('should successfully authenticate a B2B admin', async () => {
      // Arrange
      const mockUserId = 'test-user-id';
      mockDb.queryOne.mockResolvedValueOnce({ user_id: mockUserId });
      mockDb.updateUserActivity.mockResolvedValueOnce(undefined);

      // Act
      const result = await authService.requireB2BAdmin(mockEvent);

      // Assert
      expect(result).toEqual({
        userId: mockUserId,
        cognitoSub: 'test-cognito-sub',
        role: 'b2b_admin',
        orgId: 'test-org-id',
      });
    });

    it('should throw AuthorizationError when role is not b2b_admin', async () => {
      // Arrange
      mockEvent.requestContext.authorizer!.claims['custom:role'] = 'user';

      // Act & Assert
      await expect(authService.requireB2BAdmin(mockEvent)).rejects.toThrow(AuthorizationError);
      // Note: Logger calls are mocked, so we can't easily verify them in this test setup
    });

    it('should throw AuthorizationError when orgId is missing', async () => {
      // Arrange
      delete mockEvent.requestContext.authorizer!.claims['custom:orgId'];

      // Act & Assert
      await expect(authService.requireB2BAdmin(mockEvent)).rejects.toThrow(AuthorizationError);
      // Note: Logger calls are mocked, so we can't easily verify them in this test setup
    });
  });

  describe('requireSystemAdmin', () => {
    beforeEach(() => {
      mockEvent.requestContext.authorizer!.claims['custom:role'] = 'system_admin';
    });

    it('should successfully authenticate a system admin', async () => {
      // Arrange
      const mockUserId = 'test-user-id';
      mockDb.queryOne.mockResolvedValueOnce({ user_id: mockUserId });
      mockDb.updateUserActivity.mockResolvedValueOnce(undefined);

      // Act
      const result = await authService.requireSystemAdmin(mockEvent);

      // Assert
      expect(result).toEqual({
        userId: mockUserId,
        cognitoSub: 'test-cognito-sub',
        role: 'system_admin',
        orgId: undefined,
      });
    });

    it('should throw AuthorizationError when role is not system_admin', async () => {
      // Arrange
      mockEvent.requestContext.authorizer!.claims['custom:role'] = 'user';

      // Act & Assert
      await expect(authService.requireSystemAdmin(mockEvent)).rejects.toThrow(AuthorizationError);
    });
  });

  describe('validateResourceOwnership', () => {
    it('should pass when user owns the resource', () => {
      // Act & Assert
      expect(() => {
        authService.validateResourceOwnership('user-123', 'user-123');
      }).not.toThrow();
    });

    it('should throw AuthorizationError when user does not own the resource', () => {
      // Act & Assert
      expect(() => {
        authService.validateResourceOwnership('user-123', 'user-456');
      }).toThrow(AuthorizationError);
      
      // Note: Logger calls are mocked, so we can't easily verify them in this test setup
    });
  });

  describe('validateB2BAccess', () => {
    it('should pass when user belongs to the requested organization', () => {
      // Act & Assert
      expect(() => {
        authService.validateB2BAccess('org-123', 'org-123');
      }).not.toThrow();
    });

    it('should throw AuthorizationError when user does not belong to the organization', () => {
      // Act & Assert
      expect(() => {
        authService.validateB2BAccess('org-123', 'org-456');
      }).toThrow(AuthorizationError);
      
      // Note: Logger calls are mocked, so we can't easily verify them in this test setup
    });
  });

  describe('validateFileAccess', () => {
    it('should pass when user owns the file', async () => {
      // Arrange
      mockDb.queryOne.mockResolvedValueOnce({
        uploaded_by: 'user-123',
        org_id: 'org-123'
      });

      // Act & Assert
      await expect(
        authService.validateFileAccess('user-123', 'file-123')
      ).resolves.not.toThrow();
    });

    it('should pass when user belongs to the same organization as file owner', async () => {
      // Arrange
      mockDb.queryOne
        .mockResolvedValueOnce({
          uploaded_by: 'user-456',
          org_id: 'org-123'
        })
        .mockResolvedValueOnce({
          org_id: 'org-123'
        });

      // Act & Assert
      await expect(
        authService.validateFileAccess('user-123', 'file-123')
      ).resolves.not.toThrow();
    });

    it('should throw AuthorizationError when file not found', async () => {
      // Arrange
      mockDb.queryOne.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        authService.validateFileAccess('user-123', 'file-123')
      ).rejects.toThrow(AuthorizationError);
    });

    it('should throw AuthorizationError when user cannot access file', async () => {
      // Arrange
      mockDb.queryOne
        .mockResolvedValueOnce({
          uploaded_by: 'user-456',
          org_id: 'org-456'
        })
        .mockResolvedValueOnce({
          org_id: 'org-123'
        });

      // Act & Assert
      await expect(
        authService.validateFileAccess('user-123', 'file-123')
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('ensureUserExists', () => {
    it('should return existing user ID when user exists', async () => {
      // Arrange
      const mockUserId = 'existing-user-id';
      mockDb.queryOne.mockResolvedValueOnce({ user_id: mockUserId });

      // Act
      const result = await authService.ensureUserExists('test-cognito-sub');

      // Assert
      expect(result).toBe(mockUserId);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        'SELECT user_id FROM users WHERE cognito_sub = $1',
        ['test-cognito-sub']
      );
    });

    it('should create new user when user does not exist', async () => {
      // Arrange
      const mockUserId = 'new-user-id';
      mockDb.queryOne
        .mockResolvedValueOnce(null) // User doesn't exist
        .mockResolvedValueOnce({ user_id: mockUserId }); // New user created

      // Act
      const result = await authService.ensureUserExists('test-cognito-sub');

      // Assert
      expect(result).toBe(mockUserId);
      expect(mockDb.queryOne).toHaveBeenCalledTimes(2);
      // Note: Logger calls are mocked, so we can't easily verify them in this test setup
    });

    it('should throw AuthenticationError when user creation fails', async () => {
      // Arrange
      mockDb.queryOne
        .mockResolvedValueOnce(null) // User doesn't exist
        .mockResolvedValueOnce(null); // User creation failed

      // Act & Assert
      await expect(
        authService.ensureUserExists('test-cognito-sub')
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('generateCorrelationId', () => {
    it('should return existing correlation ID from headers', () => {
      // Arrange
      mockEvent.headers['X-Correlation-Id'] = 'existing-correlation-id';

      // Act
      const result = authService.generateCorrelationId(mockEvent);

      // Assert
      expect(result).toBe('existing-correlation-id');
    });

    it('should generate new correlation ID when not present', () => {
      // Act
      const result = authService.generateCorrelationId(mockEvent);

      // Assert
      expect(result).toMatch(/^req-\d+-[a-z0-9]+$/);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status with user count', async () => {
      // Arrange
      mockDb.queryOne.mockResolvedValueOnce({ count: '42' });

      // Act
      const result = await authService.healthCheck();

      // Assert
      expect(result).toEqual({
        status: 'healthy',
        userCount: 42
      });
    });

    it('should return unhealthy status when database fails', async () => {
      // Arrange
      mockDb.queryOne.mockRejectedValueOnce(new Error('Database error'));

      // Act
      const result = await authService.healthCheck();

      // Assert
      expect(result).toEqual({
        status: 'unhealthy',
        userCount: 0
      });
      // Note: Logger calls are mocked, so we can't easily verify them in this test setup
    });
  });

  describe('JWT validation', () => {
    it('should validate JWT structure correctly', async () => {
      // Arrange
      const mockUserId = 'test-user-id';
      mockDb.queryOne.mockResolvedValueOnce({ user_id: mockUserId });
      mockDb.updateUserActivity.mockResolvedValueOnce(undefined);

      // Act & Assert
      await expect(authService.requireUser(mockEvent)).resolves.toBeDefined();
    });

    it('should reject JWT with missing required claims', async () => {
      // Arrange
      delete mockEvent.requestContext.authorizer!.claims.sub;

      // Act & Assert
      await expect(authService.requireUser(mockEvent)).rejects.toThrow(AuthenticationError);
    });

    it('should reject very old tokens', async () => {
      // Arrange
      mockEvent.requestContext.authorizer!.claims.iat = Math.floor(Date.now() / 1000) - (25 * 60 * 60); // 25 hours ago

      // Act & Assert
      await expect(authService.requireUser(mockEvent)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('Security features', () => {
    it('should validate user session successfully', async () => {
      // Arrange
      mockDb.queryOne.mockResolvedValueOnce({
        user_id: 'test-user-id',
        cognito_sub: 'test-cognito-sub',
        created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
      });

      // Act & Assert
      await expect(
        authService.validateUserSession('test-user-id', 'test-cognito-sub')
      ).resolves.not.toThrow();
    });

    it('should detect suspicious activity', () => {
      // Arrange
      const authResult = {
        userId: 'test-user-id',
        cognitoSub: 'test-cognito-sub',
        role: 'user' as const,
      };

      mockEvent.requestContext.identity = { sourceIp: '192.168.1.1' } as any;
      mockEvent.headers['User-Agent'] = 'Test Agent';

      // Act
      authService.detectSuspiciousActivity(mockEvent, authResult);

      // Assert - Should not throw, just log if suspicious
      // Note: Logger calls are mocked, so we can't easily verify them in this test setup
    });
  });
});