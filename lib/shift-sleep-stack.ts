import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export interface ShiftSleepStackProps extends cdk.StackProps {
  stage: string;
  enableDetailedMonitoring?: boolean;
  logRetentionDays?: number;
  enableBackup?: boolean;
  enableMultiAZ?: boolean;
}

export class ShiftSleepStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ShiftSleepStackProps) {
    super(scope, id, props);

    // VPC 생성 (RDS 및 ElastiCache용)
    const vpc = new ec2.Vpc(this, 'ShiftSleepVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Cognito User Pool 생성
    const userPool = new cognito.UserPool(this, 'ShiftSleepUserPool', {
      userPoolName: `shift-sleep-users-${props.stage}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        role: new cognito.StringAttribute({ 
          minLen: 1, 
          maxLen: 50, 
          mutable: true 
        }),
        orgId: new cognito.StringAttribute({ 
          minLen: 1, 
          maxLen: 255, 
          mutable: true 
        }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: props.stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'ShiftSleepUserPoolClient', {
      userPool,
      userPoolClientName: `shift-sleep-client-${props.stage}`,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
      },
    });

    // RDS PostgreSQL 데이터베이스
    const dbCredentials = new secretsmanager.Secret(this, 'DatabaseCredentials', {
      secretName: `shift-sleep-db-credentials-${props.stage}`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
      },
    });

    const dbSubnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      description: 'Subnet group for Shift Sleep database',
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Shift Sleep database',
      allowAllOutbound: false,
    });

    const database = new rds.DatabaseInstance(this, 'ShiftSleepDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14,
      }),
      instanceType: props.stage === 'prod' 
        ? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL)
        : ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      subnetGroup: dbSubnetGroup,
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(dbCredentials),
      databaseName: 'shiftsleep',
      storageEncrypted: true, // ADR-002: RDS 암호화 필수
      backupRetention: cdk.Duration.days(props.enableBackup ? 30 : 7),
      deletionProtection: props.stage === 'prod',
      multiAz: props.enableMultiAZ || false,
      removalPolicy: props.stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      monitoringInterval: props.enableDetailedMonitoring ? cdk.Duration.seconds(60) : undefined,
    });

    // RDS Proxy (Lambda 연결 최적화)
    const dbProxy = new rds.DatabaseProxy(this, 'ShiftSleepDatabaseProxy', {
      proxyTarget: rds.ProxyTarget.fromInstance(database),
      secrets: [dbCredentials],
      vpc,
      securityGroups: [dbSecurityGroup],
      requireTLS: true,
      maxConnectionsPercent: 100,
      maxIdleConnectionsPercent: 50,
      borrowTimeout: cdk.Duration.seconds(30),
    });

    // ElastiCache Serverless 클러스터 (ADR-012)
    const cacheSubnetGroup = new elasticache.CfnSubnetGroup(this, 'CacheSubnetGroup', {
      description: 'Subnet group for ElastiCache',
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
    });

    const cacheSecurityGroup = new ec2.SecurityGroup(this, 'CacheSecurityGroup', {
      vpc,
      description: 'Security group for ElastiCache',
      allowAllOutbound: false,
    });

    // ElastiCache Serverless (Redis 7.x)
    const elastiCacheCluster = new elasticache.CfnServerlessCache(this, 'ShiftSleepCache', {
      serverlessCacheName: `shift-sleep-cache-${props.stage}`,
      engine: 'redis',
      description: 'ElastiCache Serverless for Shift Sleep Backend',
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
      securityGroupIds: [cacheSecurityGroup.securityGroupId],
    });

    // S3 버킷 (파일 저장용)
    const filesBucket = new s3.Bucket(this, 'FilesBucket', {
      bucketName: `shift-sleep-files-${props.stage}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED, // ADR-006: S3 암호화
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [{
        id: 'DeleteOldVersions',
        noncurrentVersionExpiration: cdk.Duration.days(30),
      }],
      removalPolicy: props.stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // S3 버킷 (정적 웹사이트 호스팅용)
    const webBucket = new s3.Bucket(this, 'WebBucket', {
      bucketName: `shift-sleep-web-${props.stage}-${this.account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: props.stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // CloudFront 배포 (한국 사용자 지연시간 최적화)
    const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
      defaultBehavior: {
        origin: new origins.S3StaticWebsiteOrigin(webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // 북미, 유럽, 아시아 태평양
      geoRestriction: cloudfront.GeoRestriction.allowlist('KR', 'US'), // 한국, 미국만 허용
    });

    // Lambda 실행 역할
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
      inlinePolicies: {
        DatabaseAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['rds-db:connect'],
              resources: [
                `arn:aws:rds-db:${this.region}:${this.account}:dbuser:${database.instanceResourceId}/lambda-db-user`,
              ],
            }),
          ],
        }),
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
              resources: [`${filesBucket.bucketArn}/*`],
            }),
          ],
        }),
        SecretsManagerAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['secretsmanager:GetSecretValue'],
              resources: [dbCredentials.secretArn],
            }),
          ],
        }),
        CloudWatchMetrics: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['cloudwatch:PutMetricData'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Lambda 함수들의 공통 환경 변수
    const commonEnvironment = {
      STAGE: props.stage,
      REGION: this.region,
      RDS_PROXY_ENDPOINT: dbProxy.endpoint,
      DB_NAME: 'shiftsleep',
      DB_CREDENTIALS_SECRET_ARN: dbCredentials.secretArn,
      ELASTICACHE_ENDPOINT: elastiCacheCluster.attrEndpointAddress,
      FILES_BUCKET_NAME: filesBucket.bucketName,
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
    };

    // Lambda 보안 그룹
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true,
    });

    // Lambda에서 RDS 및 ElastiCache 접근 허용
    dbSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda to access PostgreSQL'
    );

    cacheSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow Lambda to access Redis'
    );

    // 사용자 관리 Lambda
    const userHandler = new lambda.Function(this, 'UserHandler', {
      functionName: `shift-sleep-user-handler-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'user.handler',
      code: lambda.Code.fromAsset('dist/lambda'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      vpc,
      securityGroups: [lambdaSecurityGroup],
      role: lambdaExecutionRole,
      environment: commonEnvironment,
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // 근무표 관리 Lambda
    const scheduleHandler = new lambda.Function(this, 'ScheduleHandler', {
      functionName: `shift-sleep-schedule-handler-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'schedule.handler',
      code: lambda.Code.fromAsset('dist/lambda'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      vpc,
      securityGroups: [lambdaSecurityGroup],
      role: lambdaExecutionRole,
      environment: commonEnvironment,
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // 대시보드 Lambda
    const dashboardHandler = new lambda.Function(this, 'DashboardHandler', {
      functionName: `shift-sleep-dashboard-handler-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'dashboard.handler',
      code: lambda.Code.fromAsset('dist/lambda'),
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      vpc,
      securityGroups: [lambdaSecurityGroup],
      role: lambdaExecutionRole,
      environment: {
        ...commonEnvironment,
        EC2_ENGINE_URL: 'http://internal-engine-service', // EC2 FastAPI 서비스 URL (나중에 설정)
      },
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // 파일 관리 Lambda
    const fileHandler = new lambda.Function(this, 'FileHandler', {
      functionName: `shift-sleep-file-handler-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'file.handler',
      code: lambda.Code.fromAsset('dist/lambda'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      vpc,
      securityGroups: [lambdaSecurityGroup],
      role: lambdaExecutionRole,
      environment: commonEnvironment,
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // 배치 처리 Lambda
    const batchHandler = new lambda.Function(this, 'BatchHandler', {
      functionName: `shift-sleep-batch-handler-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'batch.handler',
      code: lambda.Code.fromAsset('dist/lambda'),
      timeout: cdk.Duration.minutes(15),
      memorySize: 2048,
      vpc,
      securityGroups: [lambdaSecurityGroup],
      role: lambdaExecutionRole,
      environment: {
        ...commonEnvironment,
        EC2_ENGINE_URL: 'http://internal-engine-service',
      },
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // API Gateway 생성
    const api = new apigateway.RestApi(this, 'ShiftSleepApi', {
      restApiName: `shift-sleep-api-${props.stage}`,
      description: '교대근무자 수면 최적화 API',
      defaultCorsPreflightOptions: {
        allowOrigins: props.stage === 'prod' 
          ? ['https://shiftsleep.com', 'https://app.shiftsleep.com']
          : apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
      },
      deployOptions: {
        stageName: props.stage,
        tracingEnabled: true,
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'ApiAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: 'ShiftSleepAuthorizer',
      identitySource: 'method.request.header.Authorization',
    });

    // API 리소스 구성 (ADR-001: API 버전 관리)
    const apiV1 = api.root.addResource('api').addResource('v1');
    
    // 사용자 관리 API
    const usersResource = apiV1.addResource('users');
    usersResource.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(userHandler),
      anyMethod: true,
      defaultMethodOptions: {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    });
    
    // 근무표 관리 API
    const schedulesResource = apiV1.addResource('schedules');
    schedulesResource.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(scheduleHandler),
      anyMethod: true,
      defaultMethodOptions: {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    });
    
    // 대시보드 API
    const dashboardResource = apiV1.addResource('dashboard');
    dashboardResource.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(dashboardHandler),
      anyMethod: true,
      defaultMethodOptions: {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    });
    
    // 파일 관리 API
    const filesResource = apiV1.addResource('files');
    filesResource.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(fileHandler),
      anyMethod: true,
      defaultMethodOptions: {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    });

    // EventBridge 스케줄 (ADR-005: 매일 새벽 3시 KST)
    const dailyCacheRule = new events.Rule(this, 'DailyCacheRule', {
      ruleName: `shift-sleep-daily-cache-${props.stage}`,
      description: '매일 새벽 3시 (KST) 캐시 갱신 작업',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '18', // UTC 18:00 = KST 03:00 (다음날)
        day: '*',
        month: '*',
        year: '*',
      }),
    });

    dailyCacheRule.addTarget(new targets.LambdaFunction(batchHandler, {
      event: events.RuleTargetInput.fromObject({
        jobType: 'DAILY_CACHE_REFRESH',
        source: 'eventbridge-scheduler',
      }),
    }));

    // SNS 토픽 (알람용)
    const alertsTopic = new sns.Topic(this, 'AlertsTopic', {
      topicName: `shift-sleep-alerts-${props.stage}`,
      displayName: 'Shift Sleep System Alerts',
    });

    // CloudWatch 알람 설정
    const highErrorRateAlarm = new cloudwatch.Alarm(this, 'HighErrorRateAlarm', {
      alarmName: `ShiftSleep-HighErrorRate-${props.stage}`,
      alarmDescription: '5분간 에러율이 1%를 초과할 때 알람',
      metric: new cloudwatch.MathExpression({
        expression: 'errors / invocations * 100',
        usingMetrics: {
          errors: userHandler.metricErrors({
            period: cdk.Duration.minutes(5),
          }),
          invocations: userHandler.metricInvocations({
            period: cdk.Duration.minutes(5),
          }),
        },
      }),
      threshold: 1, // 1% 에러율
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    highErrorRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertsTopic));

    const highLatencyAlarm = new cloudwatch.Alarm(this, 'HighLatencyAlarm', {
      alarmName: `ShiftSleep-HighLatency-${props.stage}`,
      alarmDescription: 'P95 응답시간이 1초를 초과할 때 알람',
      metric: userHandler.metricDuration({
        statistic: 'p95',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1000, // 1초
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    highLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertsTopic));

    // 배치 작업 실패 알람
    const batchFailureAlarm = new cloudwatch.Alarm(this, 'BatchFailureAlarm', {
      alarmName: `ShiftSleep-BatchFailure-${props.stage}`,
      alarmDescription: '배치 작업이 연속 3회 실패할 때 알람',
      metric: batchHandler.metricErrors({
        period: cdk.Duration.hours(1),
      }),
      threshold: 1,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    batchFailureAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertsTopic));

    // 출력값
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'RDS Database Endpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseProxyEndpoint', {
      value: dbProxy.endpoint,
      description: 'RDS Proxy Endpoint',
    });

    new cdk.CfnOutput(this, 'ElastiCacheEndpoint', {
      value: elastiCacheCluster.attrEndpointAddress,
      description: 'ElastiCache Redis Endpoint',
    });

    new cdk.CfnOutput(this, 'FilesBucketName', {
      value: filesBucket.bucketName,
      description: 'S3 Files Bucket Name',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
    });
  }
}