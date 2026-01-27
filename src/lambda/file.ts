import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AuthGuard, authService } from '../services/auth.service';
import { db } from '../services/database.service';
import { Logger, PerformanceMonitor } from '../services/logger.service';
import { ResponseUtil, ErrorHandler } from '../utils/response.util';
import { ValidationUtil } from '../utils/validation.util';
import { TimeService } from '../services/time.service';
import { FileMetadata } from '../types/common';

/**
 * 파일 관리 Lambda 핸들러
 * S3 Presigned URL 생성 및 파일 메타데이터 관리
 * ADR-006: S3 Presigned URL 방식
 */

/**
 * 파일 업로드 URL 요청 인터페이스
 */
interface FileUploadRequest {
  fileType: 'SHIFT_SCHEDULE' | 'WEARABLE_DATA' | 'ATTACHMENT';
  contentType: string;
  fileSize: number;
  fileName?: string;
}

/**
 * 파일 메타데이터 업데이트 요청 인터페이스
 */
interface FileMetadataRequest {
  status: 'COMPLETED' | 'FAILED';
  actualFileSize?: number;
  errorMessage?: string;
}

/**
 * S3 클라이언트 초기화
 */
const s3Client = new S3Client({ 
  region: process.env.REGION || 'us-east-1' 
});

/**
 * 메인 핸들러
 */
export const handler = ErrorHandler.asyncHandler(
  async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const correlationId = event.headers['X-Correlation-Id'] || 
                         event.headers['x-correlation-id'] || 
                         `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const logger = new Logger(correlationId, context.functionName);
    const monitor = new PerformanceMonitor(logger, `${event.httpMethod} ${event.path}`);

    try {
      const method = event.httpMethod;
      const path = event.path;

      logger.info('File API request received', {
        method,
        path
      });

      // CORS 프리플라이트 처리
      if (method === 'OPTIONS') {
        monitor.recordSuccess();
        return ResponseUtil.corsPreflightResponse();
      }

      // 라우팅
      let result: APIGatewayProxyResult;

      if (method === 'POST' && path.includes('/upload-url')) {
        result = await handleGenerateUploadUrl(event, logger);
      } else if (method === 'GET' && path.includes('/download-url')) {
        result = await handleGenerateDownloadUrl(event, logger);
      } else if (method === 'POST' && path.includes('/metadata')) {
        result = await handleUpdateMetadata(event, logger);
      } else if (method === 'GET' && path.includes('/templates')) {
        result = await handleGetTemplate(event, logger);
      } else if (method === 'GET' && path.includes('/health')) {
        result = await handleHealthCheck(event, logger);
      } else {
        result = ResponseUtil.notFoundError('API 엔드포인트를 찾을 수 없습니다', correlationId);
      }

      monitor.recordSuccess();
      logger.apiRequest(method, path, result.statusCode, monitor.getElapsedTime());

      return result;
    } catch (error) {
      monitor.recordFailure(error as Error);
      throw error;
    }
  }
);

/**
 * 파일 업로드 URL 생성
 */
async function handleGenerateUploadUrl(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  const correlationId = logger['correlationId'];

  try {
    // 인증 확인
    const auth = await AuthGuard.requireUser(event);

    // 요청 본문 파싱
    if (!event.body) {
      return ResponseUtil.validationError('요청 본문이 필요합니다', correlationId);
    }

    const request: FileUploadRequest = JSON.parse(event.body);

    // 입력 검증
    const validation = ValidationUtil.validateFileUploadRequest(request);
    if (!validation.isValid) {
      return ResponseUtil.validationError(
        '파일 업로드 요청이 유효하지 않습니다',
        correlationId,
        { errors: validation.errors }
      );
    }

    logger.info('File upload URL requested', {
      userId: auth.userId.substring(0, 8) + '***',
      fileType: request.fileType,
      contentType: request.contentType,
      fileSize: request.fileSize
    });

    // 파일 크기 제한 확인
    const maxSizes = {
      'SHIFT_SCHEDULE': 5 * 1024 * 1024,    // 5MB
      'WEARABLE_DATA': 2 * 1024 * 1024,     // 2MB
      'ATTACHMENT': 10 * 1024 * 1024        // 10MB
    };

    const maxSize = maxSizes[request.fileType];
    if (request.fileSize > maxSize) {
      return ResponseUtil.validationError(
        `파일 크기가 너무 큽니다 (최대: ${Math.round(maxSize / 1024 / 1024)}MB)`,
        correlationId
      );
    }

    // S3 키 생성 (사용자별 폴더 구조)
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const s3Key = `users/${auth.userId}/${request.fileType.toLowerCase()}/${fileId}`;
    const bucketName = process.env.FILES_BUCKET_NAME;

    if (!bucketName) {
      throw new Error('FILES_BUCKET_NAME environment variable is required');
    }

    // 파일 메타데이터 사전 저장
    const fileMetadata = await db.queryOne<FileMetadata>(
      `INSERT INTO file_metadata (file_id, uploaded_by, file_type, content_type, file_size, s3_key, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'UPLOADING')
       RETURNING file_id as "fileId", uploaded_by as "uploadedBy", file_type as "fileType",
                 content_type as "contentType", file_size as "fileSize", s3_key as "s3Key",
                 status, created_at as "createdAt", updated_at as "updatedAt"`,
      [fileId, auth.userId, request.fileType, request.contentType, request.fileSize, s3Key]
    );

    if (!fileMetadata) {
      throw new Error('파일 메타데이터 생성에 실패했습니다');
    }

    // Presigned URL 생성 (5분 만료)
    const putObjectCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: request.contentType,
      ContentLength: request.fileSize,
      Metadata: {
        'user-id': auth.userId,
        'file-type': request.fileType,
        'upload-time': new Date().toISOString()
      }
    });

    const uploadUrl = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn: 300 // 5분
    });

    const response = {
      fileId,
      uploadUrl,
      expiresAt: TimeService.formatToKST(TimeService.addMinutes(new Date(), 5)),
      maxFileSize: maxSize,
      allowedContentTypes: getAllowedContentTypes(request.fileType)
    };

    logger.userActivity(auth.userId, 'upload_url_generated', {
      fileId,
      fileType: request.fileType,
      fileSize: request.fileSize
    });

    return ResponseUtil.success(response, correlationId);
  } catch (error) {
    logger.error('Upload URL generation failed', error as Error);
    throw error;
  }
}

/**
 * 파일 다운로드 URL 생성
 */
async function handleGenerateDownloadUrl(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  const correlationId = logger['correlationId'];

  try {
    // 인증 확인
    const auth = await AuthGuard.requireUser(event);

    // 파일 ID 추출
    const pathParts = event.path.split('/');
    const fileId = pathParts[pathParts.length - 2]; // /files/{fileId}/download-url

    if (!fileId) {
      return ResponseUtil.validationError('파일 ID가 필요합니다', correlationId);
    }

    logger.info('File download URL requested', {
      userId: auth.userId.substring(0, 8) + '***',
      fileId
    });

    // 파일 메타데이터 조회 및 권한 확인
    const fileMetadata = await db.queryOne<FileMetadata>(
      `SELECT file_id as "fileId", uploaded_by as "uploadedBy", file_type as "fileType",
              content_type as "contentType", file_size as "fileSize", s3_key as "s3Key",
              status, created_at as "createdAt"
       FROM file_metadata 
       WHERE file_id = $1`,
      [fileId]
    );

    if (!fileMetadata) {
      return ResponseUtil.notFoundError('파일을 찾을 수 없습니다', correlationId);
    }

    // 파일 접근 권한 검증 (ADR-004: 파일 접근 통제)
    await authService.validateFileAccess(auth.userId, fileId);

    // 파일 상태 확인
    if (fileMetadata.status !== 'COMPLETED') {
      return ResponseUtil.validationError(
        '파일이 아직 업로드 중이거나 실패한 상태입니다',
        correlationId,
        { status: fileMetadata.status }
      );
    }

    const bucketName = process.env.FILES_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('FILES_BUCKET_NAME environment variable is required');
    }

    // Presigned URL 생성 (5분 만료)
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileMetadata.s3Key
    });

    const downloadUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: 300 // 5분
    });

    const response = {
      fileId,
      downloadUrl,
      fileName: `${fileMetadata.fileType}_${fileMetadata.createdAt.split('T')[0]}.${getFileExtension(fileMetadata.contentType)}`,
      contentType: fileMetadata.contentType,
      fileSize: fileMetadata.fileSize,
      expiresAt: TimeService.formatToKST(TimeService.addMinutes(new Date(), 5))
    };

    logger.userActivity(auth.userId, 'download_url_generated', {
      fileId,
      fileType: fileMetadata.fileType
    });

    return ResponseUtil.success(response, correlationId);
  } catch (error) {
    logger.error('Download URL generation failed', error as Error);
    
    if ((error as Error).name === 'AuthorizationError') {
      return ResponseUtil.authorizationError((error as Error).message, correlationId);
    }
    
    throw error;
  }
}

/**
 * 파일 메타데이터 업데이트 (업로드 완료 후 콜백)
 */
async function handleUpdateMetadata(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  const correlationId = logger['correlationId'];

  try {
    // 인증 확인
    const auth = await AuthGuard.requireUser(event);

    // 파일 ID 추출
    const pathParts = event.path.split('/');
    const fileId = pathParts[pathParts.length - 2]; // /files/{fileId}/metadata

    if (!fileId) {
      return ResponseUtil.validationError('파일 ID가 필요합니다', correlationId);
    }

    // 요청 본문 파싱
    if (!event.body) {
      return ResponseUtil.validationError('요청 본문이 필요합니다', correlationId);
    }

    const request: FileMetadataRequest = JSON.parse(event.body);

    if (!request.status || !['COMPLETED', 'FAILED'].includes(request.status)) {
      return ResponseUtil.validationError('유효한 상태가 필요합니다', correlationId);
    }

    logger.info('File metadata update requested', {
      userId: auth.userId.substring(0, 8) + '***',
      fileId,
      status: request.status
    });

    // 파일 소유권 확인
    const existingFile = await db.queryOne<{ uploaded_by: string; status: string }>(
      'SELECT uploaded_by, status FROM file_metadata WHERE file_id = $1',
      [fileId]
    );

    if (!existingFile) {
      return ResponseUtil.notFoundError('파일을 찾을 수 없습니다', correlationId);
    }

    if (existingFile.uploaded_by !== auth.userId) {
      return ResponseUtil.authorizationError('파일에 대한 권한이 없습니다', correlationId);
    }

    if (existingFile.status !== 'UPLOADING') {
      return ResponseUtil.conflictError(
        '이미 처리된 파일입니다',
        correlationId,
        { currentStatus: existingFile.status }
      );
    }

    // 메타데이터 업데이트
    const updateFields: string[] = ['status = $2', 'updated_at = NOW()'];
    const updateValues: any[] = [fileId, request.status];
    let paramIndex = 3;

    if (request.actualFileSize !== undefined) {
      updateFields.push(`file_size = $${paramIndex++}`);
      updateValues.push(request.actualFileSize);
    }

    const query = `
      UPDATE file_metadata 
      SET ${updateFields.join(', ')}
      WHERE file_id = $1
      RETURNING file_id as "fileId", uploaded_by as "uploadedBy", file_type as "fileType",
                content_type as "contentType", file_size as "fileSize", s3_key as "s3Key",
                status, created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await db.queryOne<FileMetadata>(query, updateValues);

    if (!result) {
      throw new Error('파일 메타데이터 업데이트에 실패했습니다');
    }

    // 시간 형식 변환
    const formattedResult = {
      ...result,
      createdAt: TimeService.formatToKST(new Date(result.createdAt)),
      updatedAt: TimeService.formatToKST(new Date(result.updatedAt))
    };

    logger.userActivity(auth.userId, 'file_metadata_updated', {
      fileId,
      status: request.status,
      fileType: result.fileType
    });

    return ResponseUtil.success(formattedResult, correlationId);
  } catch (error) {
    logger.error('File metadata update failed', error as Error);
    throw error;
  }
}

/**
 * 파일 템플릿 다운로드
 */
async function handleGetTemplate(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  const correlationId = logger['correlationId'];

  try {
    // 인증 확인
    const auth = await AuthGuard.requireUser(event);

    // 템플릿 타입 추출
    const pathParts = event.path.split('/');
    const templateType = pathParts[pathParts.length - 1]; // /files/templates/{templateType}

    logger.info('File template requested', {
      userId: auth.userId.substring(0, 8) + '***',
      templateType
    });

    // 템플릿 생성
    let templateContent: string;
    let fileName: string;
    let contentType: string;

    switch (templateType) {
      case 'shift-schedule':
        templateContent = generateShiftScheduleTemplate();
        fileName = 'shift_schedule_template.csv';
        contentType = 'text/csv';
        break;
      case 'wearable-data':
        templateContent = generateWearableDataTemplate();
        fileName = 'wearable_data_template.csv';
        contentType = 'text/csv';
        break;
      default:
        return ResponseUtil.notFoundError('지원하지 않는 템플릿 타입입니다', correlationId);
    }

    const response = {
      templateType,
      fileName,
      contentType,
      content: Buffer.from(templateContent, 'utf-8').toString('base64'),
      downloadInstructions: {
        ko: '파일을 다운로드하여 데이터를 입력한 후 업로드해주세요.',
        en: 'Download the file, fill in your data, and upload it back.'
      }
    };

    logger.userActivity(auth.userId, 'template_downloaded', { templateType });

    return ResponseUtil.success(response, correlationId);
  } catch (error) {
    logger.error('Template generation failed', error as Error);
    throw error;
  }
}

/**
 * 근무표 템플릿 생성
 */
function generateShiftScheduleTemplate(): string {
  const headers = ['date', 'shiftType', 'startAt', 'endAt', 'commuteMin', 'note'];
  const examples = [
    ['2024-01-26', 'DAY', '2024-01-26T09:00:00+09:00', '2024-01-26T18:00:00+09:00', '30', '일반 근무'],
    ['2024-01-27', 'NIGHT', '2024-01-27T22:00:00+09:00', '2024-01-28T07:00:00+09:00', '30', '야간 근무'],
    ['2024-01-28', 'OFF', '', '', '0', '휴무']
  ];

  const csvContent = [
    headers.join(','),
    ...examples.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

/**
 * 웨어러블 데이터 템플릿 생성
 */
function generateWearableDataTemplate(): string {
  const headers = ['date', 'sleepStart', 'sleepEnd', 'sleepQuality', 'heartRate', 'steps'];
  const examples = [
    ['2024-01-26', '2024-01-25T23:00:00+09:00', '2024-01-26T07:00:00+09:00', '85', '65', '8500'],
    ['2024-01-27', '2024-01-26T23:30:00+09:00', '2024-01-27T07:30:00+09:00', '78', '68', '9200']
  ];

  const csvContent = [
    headers.join(','),
    ...examples.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

/**
 * 파일 타입별 허용 콘텐츠 타입 반환
 */
function getAllowedContentTypes(fileType: string): string[] {
  const typeMap = {
    'SHIFT_SCHEDULE': [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ],
    'WEARABLE_DATA': [
      'text/csv',
      'application/json'
    ],
    'ATTACHMENT': [
      'application/pdf',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ]
  };

  return typeMap[fileType as keyof typeof typeMap] || [];
}

/**
 * 콘텐츠 타입에서 파일 확장자 추출
 */
function getFileExtension(contentType: string): string {
  const extensionMap: Record<string, string> = {
    'text/csv': 'csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xls',
    'application/json': 'json',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg'
  };

  return extensionMap[contentType] || 'bin';
}

/**
 * 헬스 체크
 */
async function handleHealthCheck(
  event: APIGatewayProxyEvent,
  logger: Logger
): Promise<APIGatewayProxyResult> {
  const correlationId = logger['correlationId'];

  try {
    const dbHealth = await db.healthCheck();
    
    // S3 연결 확인
    let s3Healthy = false;
    try {
      // 간단한 S3 연결 테스트
      await s3Client.send(new GetObjectCommand({
        Bucket: process.env.FILES_BUCKET_NAME || 'test-bucket',
        Key: 'health-check-test'
      }));
      s3Healthy = true;
    } catch (error) {
      // 파일이 없어도 연결은 정상 (NoSuchKey 에러)
      s3Healthy = (error as any).name === 'NoSuchKey';
    }

    const health = {
      service: 'file-handler',
      status: dbHealth.status === 'healthy' && s3Healthy ? 'healthy' : 'degraded',
      timestamp: TimeService.nowKST(),
      database: dbHealth.status === 'healthy',
      s3: s3Healthy,
      bucket: process.env.FILES_BUCKET_NAME || 'not_configured',
      version: process.env.npm_package_version || '1.0.0'
    };

    return ResponseUtil.healthCheck(
      health.status as any,
      correlationId,
      health
    );
  } catch (error) {
    logger.error('Health check failed', error as Error);
    return ResponseUtil.healthCheck('unhealthy', correlationId, {
      service: 'file-handler',
      error: (error as Error).message
    });
  }
}