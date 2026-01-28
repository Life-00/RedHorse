import json
import os
import boto3
from datetime import datetime, date
from typing import Dict, Any, Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
from io import BytesIO
import uuid

# 로깅 설정
logger = logging.getLogger()
logger.setLevel(logging.INFO)

class DatabaseManager:
    def __init__(self):
        self.db_config = {
            'host': os.environ['DB_HOST'],
            'port': os.environ.get('DB_PORT', '5432'),
            'database': os.environ.get('DB_NAME', 'rhythm_fairy'),
            'user': os.environ.get('DB_USER', 'postgres'),
            'password': os.environ['DB_PASSWORD']
        }
    
    def get_connection(self):
        """데이터베이스 연결"""
        return psycopg2.connect(**self.db_config)
    
    def execute_query(self, query: str, params: tuple = None) -> list:
        """SELECT 쿼리 실행"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                return [dict(row) for row in cursor.fetchall()]
    
    def execute_update(self, query: str, params: tuple = None) -> int:
        """INSERT/UPDATE/DELETE 쿼리 실행"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                conn.commit()
                return cursor.rowcount
    
    def execute_insert_returning(self, query: str, params: tuple = None) -> Optional[Dict]:
        """INSERT 쿼리 실행 후 결과 반환"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                conn.commit()
                result = cursor.fetchone()
                return dict(result) if result else None

class S3Manager:
    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.bucket_name = os.environ.get('S3_BUCKET_NAME', 'redhorse-s3-frontend-0126')
    
    def upload_schedule_image(self, file_content: bytes, filename: str, user_id: str) -> str:
        """스케줄 이미지를 S3에 업로드"""
        try:
            # 고유한 파일명 생성
            file_extension = filename.split('.')[-1] if '.' in filename else 'jpg'
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            s3_key = f"schedule-images/{user_id}/{unique_filename}"
            
            # S3에 업로드
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=f'image/{file_extension}'
            )
            
            return s3_key
        except Exception as e:
            logger.error(f"S3 업로드 오류: {e}")
            raise

class ScheduleService:
    def __init__(self):
        self.db = DatabaseManager()
        self.s3 = S3Manager()
    
    def get_user_schedules(self, user_id: str, start_date: str = None, end_date: str = None) -> List[Dict[str, Any]]:
        """사용자 스케줄 조회"""
        try:
            base_query = """
            SELECT id, user_id, work_date, shift_type, start_time, end_time, created_at, updated_at
            FROM schedules 
            WHERE user_id = %s
            """
            params = [user_id]
            
            if start_date and end_date:
                base_query += " AND work_date BETWEEN %s AND %s"
                params.extend([start_date, end_date])
            elif start_date:
                base_query += " AND work_date >= %s"
                params.append(start_date)
            elif end_date:
                base_query += " AND work_date <= %s"
                params.append(end_date)
            
            base_query += " ORDER BY work_date ASC"
            
            return self.db.execute_query(base_query, tuple(params))
        except Exception as e:
            logger.error(f"스케줄 조회 오류: {e}")
            raise
    
    def create_schedule(self, user_id: str, schedule_data: Dict[str, Any]) -> Dict[str, Any]:
        """스케줄 생성"""
        try:
            query = """
            INSERT INTO schedules (user_id, work_date, shift_type, start_time, end_time)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, user_id, work_date, shift_type, start_time, end_time, created_at, updated_at
            """
            params = (
                user_id,
                schedule_data['work_date'],
                schedule_data['shift_type'],
                schedule_data.get('start_time'),
                schedule_data.get('end_time')
            )
            return self.db.execute_insert_returning(query, params)
        except Exception as e:
            logger.error(f"스케줄 생성 오류: {e}")
            raise
    
    def update_schedule(self, schedule_id: int, user_id: str, schedule_data: Dict[str, Any]) -> Dict[str, Any]:
        """스케줄 업데이트"""
        try:
            # 업데이트할 필드들 동적 생성
            set_clauses = []
            params = []
            
            updatable_fields = ['work_date', 'shift_type', 'start_time', 'end_time']
            
            for field in updatable_fields:
                if field in schedule_data:
                    set_clauses.append(f"{field} = %s")
                    params.append(schedule_data[field])
            
            if not set_clauses:
                # 업데이트할 필드가 없으면 기존 데이터 반환
                existing = self.db.execute_query(
                    "SELECT * FROM schedules WHERE id = %s AND user_id = %s", 
                    (schedule_id, user_id)
                )
                return existing[0] if existing else None
            
            params.extend([schedule_id, user_id])
            query = f"""
            UPDATE schedules 
            SET {', '.join(set_clauses)}
            WHERE id = %s AND user_id = %s
            RETURNING id, user_id, work_date, shift_type, start_time, end_time, created_at, updated_at
            """
            
            return self.db.execute_insert_returning(query, tuple(params))
        except Exception as e:
            logger.error(f"스케줄 업데이트 오류: {e}")
            raise
    
    def delete_schedule(self, schedule_id: int, user_id: str) -> bool:
        """스케줄 삭제"""
        try:
            query = "DELETE FROM schedules WHERE id = %s AND user_id = %s"
            rows_affected = self.db.execute_update(query, (schedule_id, user_id))
            return rows_affected > 0
        except Exception as e:
            logger.error(f"스케줄 삭제 오류: {e}")
            raise
    
    def upload_schedule_image(self, user_id: str, file_content: bytes, filename: str) -> Dict[str, Any]:
        """스케줄 이미지 업로드 및 OCR 처리 준비"""
        try:
            # S3에 이미지 업로드
            s3_key = self.s3.upload_schedule_image(file_content, filename, user_id)
            
            # 데이터베이스에 메타데이터 저장
            query = """
            INSERT INTO schedule_images (user_id, original_filename, s3_key, file_size, upload_status)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, user_id, original_filename, s3_key, file_size, upload_status, created_at
            """
            params = (
                user_id,
                filename,
                s3_key,
                len(file_content),
                'uploaded'
            )
            
            result = self.db.execute_insert_returning(query, params)
            
            # TODO: 여기서 OCR AI 서비스 호출 (현재는 더미 데이터)
            # 실제 구현 시에는 별도의 AI 서비스를 호출하여 OCR 처리
            dummy_ocr_result = {
                "schedules": [
                    {
                        "date": "2026-01-29",
                        "shift_type": "day",
                        "start_time": "09:00",
                        "end_time": "18:00"
                    },
                    {
                        "date": "2026-01-30",
                        "shift_type": "evening",
                        "start_time": "14:00",
                        "end_time": "23:00"
                    }
                ]
            }
            
            # OCR 결과 업데이트
            update_query = """
            UPDATE schedule_images 
            SET ocr_result = %s, upload_status = %s, processed_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """
            self.db.execute_update(update_query, (json.dumps(dummy_ocr_result), 'processed', result['id']))
            
            result['ocr_result'] = dummy_ocr_result
            result['upload_status'] = 'processed'
            
            return result
        except Exception as e:
            logger.error(f"스케줄 이미지 업로드 오류: {e}")
            raise
    
    def get_schedule_images(self, user_id: str) -> List[Dict[str, Any]]:
        """사용자의 업로드된 스케줄 이미지 목록 조회"""
        try:
            query = """
            SELECT id, user_id, original_filename, s3_key, file_size, 
                   upload_status, ocr_result, processed_at, created_at
            FROM schedule_images 
            WHERE user_id = %s
            ORDER BY created_at DESC
            """
            return self.db.execute_query(query, (user_id,))
        except Exception as e:
            logger.error(f"스케줄 이미지 조회 오류: {e}")
            raise

def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """API 응답 생성"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(body, ensure_ascii=False, default=str)
    }

def extract_user_id_from_event(event: Dict[str, Any]) -> str:
    """이벤트에서 사용자 ID 추출"""
    try:
        # Cognito 인증 후 사용자 ID
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub')
        
        if not user_id:
            # 개발/테스트용 - path parameter에서 추출
            user_id = event.get('pathParameters', {}).get('user_id')
        
        return user_id
    except Exception as e:
        logger.error(f"사용자 ID 추출 오류: {e}")
        return None

def lambda_handler(event, context):
    """Lambda 메인 핸들러"""
    try:
        logger.info(f"이벤트 수신: {json.dumps(event)}")
        
        # HTTP 메서드 및 경로 추출 (API Gateway v2 형식 지원)
        http_method = event.get('requestContext', {}).get('http', {}).get('method', event.get('httpMethod', ''))
        raw_path = event.get('rawPath', event.get('path', ''))
        
        # /prod 접두사 제거 (API Gateway stage)
        path = raw_path.replace('/prod', '', 1) if raw_path.startswith('/prod') else raw_path
        
        # CORS preflight 처리
        if http_method == 'OPTIONS':
            return create_response(200, {'message': 'CORS preflight'})
        
        # 스케줄 서비스 초기화
        schedule_service = ScheduleService()
        
        # 라우팅
        if http_method == 'GET' and '/schedules' in path:
            # GET /users/{user_id}/schedules - 사용자 스케줄 조회
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            # 쿼리 파라미터에서 날짜 범위 추출
            query_params = event.get('queryStringParameters') or {}
            start_date = query_params.get('start_date')
            end_date = query_params.get('end_date')
            
            schedules = schedule_service.get_user_schedules(user_id, start_date, end_date)
            return create_response(200, {'schedules': schedules})
        
        elif http_method == 'POST' and '/schedules' in path:
            # POST /users/{user_id}/schedules - 스케줄 생성
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            # 필수 필드 검증
            required_fields = ['work_date', 'shift_type']
            for field in required_fields:
                if field not in body:
                    return create_response(400, {'error': f'{field} 필드가 필요합니다'})
            
            schedule = schedule_service.create_schedule(user_id, body)
            return create_response(201, {'schedule': schedule})
        
        elif http_method == 'PUT' and '/schedules/' in path:
            # PUT /users/{user_id}/schedules/{schedule_id} - 스케줄 업데이트
            user_id = extract_user_id_from_event(event)
            schedule_id = event.get('pathParameters', {}).get('schedule_id')
            
            if not user_id or not schedule_id:
                return create_response(400, {'error': '사용자 ID와 스케줄 ID가 필요합니다'})
            
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            schedule = schedule_service.update_schedule(int(schedule_id), user_id, body)
            if not schedule:
                return create_response(404, {'error': '스케줄을 찾을 수 없습니다'})
            
            return create_response(200, {'schedule': schedule})
        
        elif http_method == 'DELETE' and '/schedules/' in path:
            # DELETE /users/{user_id}/schedules/{schedule_id} - 스케줄 삭제
            user_id = extract_user_id_from_event(event)
            schedule_id = event.get('pathParameters', {}).get('schedule_id')
            
            if not user_id or not schedule_id:
                return create_response(400, {'error': '사용자 ID와 스케줄 ID가 필요합니다'})
            
            success = schedule_service.delete_schedule(int(schedule_id), user_id)
            if not success:
                return create_response(404, {'error': '스케줄을 찾을 수 없습니다'})
            
            return create_response(200, {'message': '스케줄이 삭제되었습니다'})
        
        elif http_method == 'POST' and '/schedule-images' in path:
            # POST /users/{user_id}/schedule-images - 스케줄 이미지 업로드
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            try:
                # API Gateway에서 base64로 인코딩된 body 처리
                import base64
                
                body = event.get('body', '')
                is_base64 = event.get('isBase64Encoded', False)
                
                if is_base64:
                    body = base64.b64decode(body)
                else:
                    body = body.encode('utf-8') if isinstance(body, str) else body
                
                # Content-Type 헤더에서 boundary 추출
                content_type = event.get('headers', {}).get('content-type', '') or event.get('headers', {}).get('Content-Type', '')
                
                if 'multipart/form-data' not in content_type:
                    logger.warning(f"잘못된 Content-Type: {content_type}")
                    # 테스트용 더미 데이터 사용
                    dummy_image_data = b"dummy image content"
                    filename = "schedule_image.jpg"
                else:
                    # multipart/form-data 파싱
                    boundary = content_type.split('boundary=')[-1]
                    
                    # 간단한 multipart 파싱 (실제로는 더 복잡할 수 있음)
                    parts = body.split(f'--{boundary}'.encode())
                    
                    file_content = None
                    filename = 'uploaded_image.jpg'
                    
                    for part in parts:
                        if b'Content-Disposition' in part and b'filename=' in part:
                            # 파일명 추출
                            try:
                                filename_start = part.find(b'filename="') + 10
                                filename_end = part.find(b'"', filename_start)
                                filename = part[filename_start:filename_end].decode('utf-8')
                            except:
                                pass
                            
                            # 파일 내용 추출 (헤더와 내용 사이의 빈 줄 이후)
                            try:
                                content_start = part.find(b'\r\n\r\n') + 4
                                content_end = part.rfind(b'\r\n')
                                file_content = part[content_start:content_end]
                            except:
                                pass
                            break
                    
                    if not file_content:
                        logger.warning("파일 내용을 찾을 수 없음, 더미 데이터 사용")
                        dummy_image_data = b"dummy image content"
                        filename = "schedule_image.jpg"
                    else:
                        dummy_image_data = file_content
                
                logger.info(f"이미지 업로드 처리: {filename}, 크기: {len(dummy_image_data)} bytes")
                
                result = schedule_service.upload_schedule_image(user_id, dummy_image_data, filename)
                return create_response(201, {'upload': result})
                
            except Exception as e:
                logger.error(f"이미지 업로드 처리 오류: {e}")
                return create_response(500, {'error': f'이미지 업로드 처리 실패: {str(e)}'})
        
        elif http_method == 'GET' and '/schedule-images' in path:
            # GET /users/{user_id}/schedule-images - 업로드된 스케줄 이미지 목록
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            images = schedule_service.get_schedule_images(user_id)
            return create_response(200, {'images': images})
        
        else:
            return create_response(404, {'error': '지원하지 않는 경로입니다'})
    
    except Exception as e:
        logger.error(f"Lambda 실행 오류: {e}")
        return create_response(500, {'error': '서버 내부 오류가 발생했습니다'})