import json
import os
import boto3
from datetime import datetime
from typing import Dict, Any, Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

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
    
    def generate_presigned_url(self, s3_key: str, expiration: int = 3600) -> str:
        """S3 오디오 파일에 대한 presigned URL 생성"""
        try:
            response = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expiration
            )
            return response
        except Exception as e:
            logger.error(f"Presigned URL 생성 오류: {e}")
            raise

class WellnessService:
    def __init__(self):
        self.db = DatabaseManager()
        self.s3 = S3Manager()
    
    def get_audio_files(self, file_type: str = None) -> List[Dict[str, Any]]:
        """오디오 파일 목록 조회"""
        try:
            if file_type:
                query = """
                SELECT id, file_name, file_type, title, description, 
                       duration_seconds, s3_key, created_at
                FROM audio_files 
                WHERE file_type = %s
                ORDER BY title
                """
                audio_files = self.db.execute_query(query, (file_type,))
            else:
                query = """
                SELECT id, file_name, file_type, title, description, 
                       duration_seconds, s3_key, created_at
                FROM audio_files 
                ORDER BY file_type, title
                """
                audio_files = self.db.execute_query(query)
            
            # 각 파일에 대한 presigned URL 생성
            for audio_file in audio_files:
                try:
                    audio_file['streaming_url'] = self.s3.generate_presigned_url(audio_file['s3_key'])
                except Exception as e:
                    logger.warning(f"파일 {audio_file['s3_key']}에 대한 URL 생성 실패: {e}")
                    audio_file['streaming_url'] = None
            
            return audio_files
        except Exception as e:
            logger.error(f"오디오 파일 조회 오류: {e}")
            raise
    
    def get_audio_file_by_id(self, file_id: int) -> Optional[Dict[str, Any]]:
        """특정 오디오 파일 조회"""
        try:
            query = """
            SELECT id, file_name, file_type, title, description, 
                   duration_seconds, s3_key, created_at
            FROM audio_files 
            WHERE id = %s
            """
            results = self.db.execute_query(query, (file_id,))
            
            if results:
                audio_file = results[0]
                try:
                    audio_file['streaming_url'] = self.s3.generate_presigned_url(audio_file['s3_key'])
                except Exception as e:
                    logger.warning(f"파일 {audio_file['s3_key']}에 대한 URL 생성 실패: {e}")
                    audio_file['streaming_url'] = None
                return audio_file
            
            return None
        except Exception as e:
            logger.error(f"오디오 파일 조회 오류: {e}")
            raise
    
    def create_daily_checklist(self, user_id: str, task_date: str) -> List[Dict[str, Any]]:
        """일일 체크리스트 생성 (홈화면용)"""
        try:
            # 기본 일일 체크리스트 항목
            default_tasks = [
                "충분한 수분 섭취 (물 8잔)",
                "규칙적인 식사 시간 유지",
                "30분 이상 신체 활동",
                "스트레스 관리 (명상, 휴식)",
                "적절한 수면 시간 확보",
                "업무 우선순위 정리",
                "가족/친구와 소통 시간"
            ]
            
            created_tasks = []
            
            for task_name in default_tasks:
                query = """
                INSERT INTO daily_checklists (user_id, task_date, task_name, completed)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (user_id, task_date, task_name) DO NOTHING
                RETURNING id, user_id, task_date, task_name, completed, completed_at, created_at
                """
                
                task = self.db.execute_insert_returning(query, (user_id, task_date, task_name, False))
                if task:
                    created_tasks.append(task)
            
            # 기존 체크리스트도 포함하여 전체 반환
            all_tasks_query = """
            SELECT id, user_id, task_date, task_name, completed, completed_at, created_at
            FROM daily_checklists 
            WHERE user_id = %s AND task_date = %s
            ORDER BY created_at
            """
            
            return self.db.execute_query(all_tasks_query, (user_id, task_date))
        except Exception as e:
            logger.error(f"일일 체크리스트 생성 오류: {e}")
            raise
    
    def get_daily_checklist(self, user_id: str, task_date: str) -> List[Dict[str, Any]]:
        """일일 체크리스트 조회"""
        try:
            query = """
            SELECT id, user_id, task_date, task_name, completed, completed_at, created_at
            FROM daily_checklists 
            WHERE user_id = %s AND task_date = %s
            ORDER BY created_at
            """
            return self.db.execute_query(query, (user_id, task_date))
        except Exception as e:
            logger.error(f"일일 체크리스트 조회 오류: {e}")
            raise
    
    def update_checklist_task(self, user_id: str, task_id: int, completed: bool) -> Dict[str, Any]:
        """체크리스트 작업 완료 상태 업데이트"""
        try:
            if completed:
                query = """
                UPDATE daily_checklists 
                SET completed = %s, completed_at = CURRENT_TIMESTAMP
                WHERE id = %s AND user_id = %s
                RETURNING id, user_id, task_date, task_name, completed, completed_at, created_at
                """
            else:
                query = """
                UPDATE daily_checklists 
                SET completed = %s, completed_at = NULL
                WHERE id = %s AND user_id = %s
                RETURNING id, user_id, task_date, task_name, completed, completed_at, created_at
                """
            
            result = self.db.execute_insert_returning(query, (completed, task_id, user_id))
            
            if not result:
                raise ValueError("체크리스트 작업을 찾을 수 없습니다")
            
            return result
        except Exception as e:
            logger.error(f"체크리스트 작업 업데이트 오류: {e}")
            raise
    
    def add_custom_checklist_task(self, user_id: str, task_date: str, task_name: str) -> Dict[str, Any]:
        """사용자 정의 체크리스트 작업 추가"""
        try:
            query = """
            INSERT INTO daily_checklists (user_id, task_date, task_name, completed)
            VALUES (%s, %s, %s, %s)
            RETURNING id, user_id, task_date, task_name, completed, completed_at, created_at
            """
            
            return self.db.execute_insert_returning(query, (user_id, task_date, task_name, False))
        except Exception as e:
            logger.error(f"사용자 정의 체크리스트 작업 추가 오류: {e}")
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
        
        # HTTP 메서드 및 경로 추출
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        
        # CORS preflight 처리
        if http_method == 'OPTIONS':
            return create_response(200, {'message': 'CORS preflight'})
        
        # 웰니스 서비스 초기화
        wellness_service = WellnessService()
        
        # 라우팅
        if http_method == 'GET' and '/audio-files' in path and '/audio-files/' not in path:
            # GET /audio-files?type=meditation|whitenoise - 오디오 파일 목록 조회
            query_params = event.get('queryStringParameters') or {}
            file_type = query_params.get('type')
            
            audio_files = wellness_service.get_audio_files(file_type)
            return create_response(200, {'audio_files': audio_files})
        
        elif http_method == 'GET' and '/audio-files/' in path:
            # GET /audio-files/{file_id} - 특정 오디오 파일 조회
            file_id = event.get('pathParameters', {}).get('file_id')
            
            if not file_id:
                return create_response(400, {'error': '파일 ID가 필요합니다'})
            
            audio_file = wellness_service.get_audio_file_by_id(int(file_id))
            if not audio_file:
                return create_response(404, {'error': '오디오 파일을 찾을 수 없습니다'})
            
            return create_response(200, {'audio_file': audio_file})
        
        elif http_method == 'POST' and '/daily-checklist' in path:
            # POST /users/{user_id}/daily-checklist - 일일 체크리스트 생성
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            task_date = body.get('task_date')
            if not task_date:
                task_date = datetime.now().date().strftime('%Y-%m-%d')
            
            checklist = wellness_service.create_daily_checklist(user_id, task_date)
            return create_response(201, {'checklist': checklist})
        
        elif http_method == 'GET' and '/daily-checklist' in path:
            # GET /users/{user_id}/daily-checklist?date=YYYY-MM-DD - 일일 체크리스트 조회
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            query_params = event.get('queryStringParameters') or {}
            task_date = query_params.get('date')
            if not task_date:
                task_date = datetime.now().date().strftime('%Y-%m-%d')
            
            checklist = wellness_service.get_daily_checklist(user_id, task_date)
            return create_response(200, {'checklist': checklist})
        
        elif http_method == 'PUT' and '/daily-checklist/' in path:
            # PUT /users/{user_id}/daily-checklist/{task_id} - 체크리스트 작업 완료 상태 업데이트
            user_id = extract_user_id_from_event(event)
            task_id = event.get('pathParameters', {}).get('task_id')
            
            if not user_id or not task_id:
                return create_response(400, {'error': '사용자 ID와 작업 ID가 필요합니다'})
            
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            completed = body.get('completed', False)
            
            task = wellness_service.update_checklist_task(user_id, int(task_id), completed)
            return create_response(200, {'task': task})
        
        elif http_method == 'POST' and '/daily-checklist/custom' in path:
            # POST /users/{user_id}/daily-checklist/custom - 사용자 정의 체크리스트 작업 추가
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            task_name = body.get('task_name')
            task_date = body.get('task_date')
            
            if not task_name:
                return create_response(400, {'error': 'task_name 필드가 필요합니다'})
            
            if not task_date:
                task_date = datetime.now().date().strftime('%Y-%m-%d')
            
            task = wellness_service.add_custom_checklist_task(user_id, task_date, task_name)
            return create_response(201, {'task': task})
        
        else:
            return create_response(404, {'error': '지원하지 않는 경로입니다'})
    
    except Exception as e:
        logger.error(f"Lambda 실행 오류: {e}")
        return create_response(500, {'error': '서버 내부 오류가 발생했습니다'})