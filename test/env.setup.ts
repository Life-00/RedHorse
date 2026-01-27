// Environment setup for tests

// Set default environment variables for testing
process.env.NODE_ENV = 'test';
process.env.STAGE = 'test';
process.env.REGION = 'us-east-1';

// Database configuration
process.env.DB_CREDENTIALS_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-db-credentials';
process.env.RDS_PROXY_ENDPOINT = 'test-proxy.rds.amazonaws.com';
process.env.DB_NAME = 'shiftsleep_test';

// Cache configuration
process.env.ELASTICACHE_ENDPOINT = 'test-cache.amazonaws.com';

// S3 configuration
process.env.S3_BUCKET_NAME = 'test-shift-sleep-files';

// Cognito configuration
process.env.COGNITO_USER_POOL_ID = 'us-east-1_testpool';
process.env.COGNITO_CLIENT_ID = 'test-client-id';

// API Gateway configuration
process.env.API_GATEWAY_URL = 'https://test-api.execute-api.us-east-1.amazonaws.com';

// EC2 FastAPI configuration
process.env.EC2_ENGINE_URL = 'http://test-engine.internal';

// Disable AWS SDK retries for faster tests
process.env.AWS_MAX_ATTEMPTS = '1';