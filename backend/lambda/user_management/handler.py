import json
import os
import boto3
from datetime import datetime
from typing import Dict, Any, Optional
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

class UserService:
    def __init__(self):
        self.db = DatabaseManager()
    
    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """사용자 프로필 조회"""
        try:
            query = """
            SELECT user_id, email, name, work_type, commute_time, 
                   wearable_device, onboarding_completed, created_at, updated_at
            FROM users 
            WHERE user_id = %s
            """
            results = self.db.execute_query(query, (user_id,))
            return results[0] if results else None
        except Exception as e:
            logger.error(f"사용자 프로필 조회 오류: {e}")
            raise
    
    def create_user_profile(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """사용자 프로필 생성"""
        try:
            # work_type 기본값 처리: 빈 문자열이면 'irregular'로 설정
            work_type = user_data.get('work_type', 'irregular')
            if not work_type or work_type.strip() == '':
                work_type = 'irregular'
            
            query = """
            INSERT INTO users (user_id, email, name, work_type, commute_time, wearable_device, onboarding_completed)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING user_id, email, name, work_type, commute_time, wearable_device, onboarding_completed, created_at, updated_at
            """
            params = (
                user_data['user_id'],
                user_data['email'],
                user_data['name'],
                work_type,
                user_data.get('commute_time', 30),
                user_data.get('wearable_device', 'none'),
                user_data.get('onboarding_completed', False)
            )
            return self.db.execute_insert_returning(query, params)
        except Exception as e:
            logger.error(f"사용자 프로필 생성 오류: {e}")
            raise
    
    def update_user_profile(self, user_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """사용자 프로필 업데이트"""
        try:
            # 업데이트할 필드들 동적 생성
            set_clauses = []
            params = []
            
            updatable_fields = ['name', 'work_type', 'commute_time', 'wearable_device', 'onboarding_completed']
            
            for field in updatable_fields:
                if field in user_data:
                    set_clauses.append(f"{field} = %s")
                    params.append(user_data[field])
            
            if not set_clauses:
                # 업데이트할 필드가 없으면 기존 데이터 반환
                return self.get_user_profile(user_id)
            
            params.append(user_id)
            query = f"""
            UPDATE users 
            SET {', '.join(set_clauses)}
            WHERE user_id = %s
            RETURNING user_id, email, name, work_type, commute_time, wearable_device, onboarding_completed, created_at, updated_at
            """
            
            return self.db.execute_insert_returning(query, tuple(params))
        except Exception as e:
            logger.error(f"사용자 프로필 업데이트 오류: {e}")
            raise
    
    def delete_user_profile(self, user_id: str) -> bool:
        """사용자 프로필 삭제"""
        try:
            query = "DELETE FROM users WHERE user_id = %s"
            rows_affected = self.db.execute_update(query, (user_id,))
            return rows_affected > 0
        except Exception as e:
            logger.error(f"사용자 프로필 삭제 오류: {e}")
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
    """이벤트에서 사용자 ID 추출 (Cognito JWT에서)"""
    # API Gateway v2 (HTTP API) 형식
    try:
        # Cognito 인증 후 사용자 ID
        request_context = event.get('requestContext', {})
        
        # HTTP API authorizer
        authorizer = request_context.get('authorizer', {})
        if authorizer:
            jwt = authorizer.get('jwt', {})
            claims = jwt.get('claims', {})
            user_id = claims.get('sub')
            if user_id:
                return user_id
        
        # Path parameters에서 추출
        path_parameters = event.get('pathParameters', {})
        if path_parameters:
            user_id = path_parameters.get('user_id')
            if user_id:
                return user_id
        
        # Raw path에서 추출 (fallback)
        raw_path = event.get('rawPath', event.get('path', ''))
        if '/users/' in raw_path:
            parts = raw_path.split('/')
            if len(parts) > 2 and parts[1] == 'users':
                return parts[2]
        
        return None
    except Exception as e:
        logger.error(f"사용자 ID 추출 오류: {e}")
        return None

def lambda_handler(event, context):
    """Lambda 메인 핸들러"""
    try:
        print(f"🔍 이벤트 수신: {json.dumps(event)}")
        logger.info(f"이벤트 수신: {json.dumps(event)}")
        
        # HTTP 메서드 및 경로 추출 (API Gateway v2 형식)
        http_method = event.get('requestContext', {}).get('http', {}).get('method', event.get('httpMethod', ''))
        raw_path = event.get('rawPath', event.get('path', ''))
        
        print(f"🔍 HTTP 메서드: {http_method}, 경로: {raw_path}")
        logger.info(f"HTTP 메서드: {http_method}, 경로: {raw_path}")
        
        # CORS preflight 처리
        if http_method == 'OPTIONS':
            return create_response(200, {'message': 'CORS preflight'})
        
        # 사용자 서비스 초기화
        print("🔍 사용자 서비스 초기화 시도...")
        user_service = UserService()
        print("✅ 사용자 서비스 초기화 완료")
        
        # 라우팅
        # /prod 접두사 제거 (API Gateway stage)
        path = raw_path.replace('/prod', '', 1) if raw_path.startswith('/prod') else raw_path
        print(f"🔍 정규화된 경로: {path}")
        
        if http_method == 'GET' and '/users/' in path and path.count('/') == 2:
            # GET /users/{user_id} - 사용자 프로필 조회
            print("🔍 사용자 ID 추출 시도...")
            user_id = extract_user_id_from_event(event)
            print(f"🔍 사용자 ID 추출 결과: {user_id}")
            logger.info(f"사용자 ID 추출 결과: {user_id}")
            
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            print(f"🔍 사용자 프로필 조회 시도: {user_id}")
            user_profile = user_service.get_user_profile(user_id)
            print(f"🔍 사용자 프로필 조회 결과: {user_profile}")
            logger.info(f"사용자 프로필 조회 결과: {user_profile}")
            
            if not user_profile:
                return create_response(404, {'error': '사용자를 찾을 수 없습니다'})
            
            return create_response(200, {'user': user_profile})
        
        elif http_method == 'POST' and path == '/users':
            # POST /users - 사용자 프로필 생성
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            # 필수 필드 검증
            required_fields = ['user_id', 'email', 'name']
            for field in required_fields:
                if field not in body:
                    return create_response(400, {'error': f'{field} 필드가 필요합니다'})
            
            user_profile = user_service.create_user_profile(body)
            return create_response(201, {'user': user_profile})
        
        elif http_method == 'PUT' and '/users/' in path and path.count('/') == 2:
            # PUT /users/{user_id} - 사용자 프로필 업데이트
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            user_profile = user_service.update_user_profile(user_id, body)
            if not user_profile:
                return create_response(404, {'error': '사용자를 찾을 수 없습니다'})
            
            return create_response(200, {'user': user_profile})
        
        elif http_method == 'DELETE' and '/users/' in raw_path and raw_path.count('/') == 2:
            # DELETE /users/{user_id} - 사용자 프로필 삭제
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            success = user_service.delete_user_profile(user_id)
            if not success:
                return create_response(404, {'error': '사용자를 찾을 수 없습니다'})
            
            return create_response(200, {'message': '사용자 프로필이 삭제되었습니다'})
        
        else:
            return create_response(404, {'error': '지원하지 않는 경로입니다'})
    
    except Exception as e:
        logger.error(f"Lambda 실행 오류: {e}")
        return create_response(500, {'error': '서버 내부 오류가 발생했습니다'})