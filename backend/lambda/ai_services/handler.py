import json
import os
import boto3
from datetime import datetime, date, time, timedelta
from typing import Dict, Any, Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import random

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

class AIService:
    def __init__(self):
        self.db = DatabaseManager()
    
    def generate_sleep_plan(self, user_id: str, plan_date: str) -> Dict[str, Any]:
        """수면 계획 생성 (AI 더미 데이터)"""
        try:
            # 사용자의 스케줄 정보 조회
            schedule_query = """
            SELECT shift_type, start_time, end_time 
            FROM schedules 
            WHERE user_id = %s AND work_date = %s
            """
            schedules = self.db.execute_query(schedule_query, (user_id, plan_date))
            
            # 더미 AI 로직 - 실제로는 외부 AI 서비스 호출
            if schedules and schedules[0]['shift_type'] == 'night':
                # 야간 근무자용 수면 계획
                main_sleep_start = "08:00"
                main_sleep_end = "16:00"
                main_sleep_duration = 480  # 8시간
                nap_start = "20:00"
                nap_end = "21:00"
                nap_duration = 60  # 1시간
                rationale = "야간 근무 후 충분한 주간 수면과 근무 전 짧은 낮잠을 권장합니다."
            elif schedules and schedules[0]['shift_type'] == 'evening':
                # 저녁 근무자용 수면 계획
                main_sleep_start = "01:00"
                main_sleep_end = "09:00"
                main_sleep_duration = 480  # 8시간
                nap_start = None
                nap_end = None
                nap_duration = None
                rationale = "저녁 근무 후 늦은 취침과 충분한 아침 수면을 권장합니다."
            else:
                # 일반 근무자용 수면 계획
                main_sleep_start = "23:00"
                main_sleep_end = "07:00"
                main_sleep_duration = 480  # 8시간
                nap_start = None
                nap_end = None
                nap_duration = None
                rationale = "일반적인 수면 패턴으로 충분한 야간 수면을 권장합니다."
            
            # 데이터베이스에 저장
            query = """
            INSERT INTO sleep_plans (user_id, plan_date, main_sleep_start, main_sleep_end, 
                                   main_sleep_duration, nap_start, nap_end, nap_duration, rationale)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id, plan_date) 
            DO UPDATE SET 
                main_sleep_start = EXCLUDED.main_sleep_start,
                main_sleep_end = EXCLUDED.main_sleep_end,
                main_sleep_duration = EXCLUDED.main_sleep_duration,
                nap_start = EXCLUDED.nap_start,
                nap_end = EXCLUDED.nap_end,
                nap_duration = EXCLUDED.nap_duration,
                rationale = EXCLUDED.rationale,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, user_id, plan_date, main_sleep_start, main_sleep_end, 
                     main_sleep_duration, nap_start, nap_end, nap_duration, rationale, 
                     created_at, updated_at
            """
            
            params = (user_id, plan_date, main_sleep_start, main_sleep_end, 
                     main_sleep_duration, nap_start, nap_end, nap_duration, rationale)
            
            return self.db.execute_insert_returning(query, params)
        except Exception as e:
            logger.error(f"수면 계획 생성 오류: {e}")
            raise
    
    def get_sleep_plan(self, user_id: str, plan_date: str) -> Optional[Dict[str, Any]]:
        """수면 계획 조회"""
        try:
            query = """
            SELECT id, user_id, plan_date, main_sleep_start, main_sleep_end, 
                   main_sleep_duration, nap_start, nap_end, nap_duration, rationale, 
                   created_at, updated_at
            FROM sleep_plans 
            WHERE user_id = %s AND plan_date = %s
            """
            results = self.db.execute_query(query, (user_id, plan_date))
            return results[0] if results else None
        except Exception as e:
            logger.error(f"수면 계획 조회 오류: {e}")
            raise
    
    def generate_caffeine_plan(self, user_id: str, plan_date: str) -> Dict[str, Any]:
        """카페인 계획 생성 (AI 더미 데이터)"""
        try:
            # 사용자의 스케줄 정보 조회
            schedule_query = """
            SELECT shift_type, start_time, end_time 
            FROM schedules 
            WHERE user_id = %s AND work_date = %s
            """
            schedules = self.db.execute_query(schedule_query, (user_id, plan_date))
            
            # 더미 AI 로직
            if schedules and schedules[0]['shift_type'] == 'night':
                # 야간 근무자용 카페인 계획
                cutoff_time = "02:00"
                max_intake_mg = 300
                recommendations = "야간 근무 초반에만 카페인을 섭취하고, 새벽 2시 이후에는 피하세요."
                alternative_methods = "밝은 조명, 가벼운 운동, 차가운 물로 각성 유지"
            elif schedules and schedules[0]['shift_type'] == 'evening':
                # 저녁 근무자용 카페인 계획
                cutoff_time = "20:00"
                max_intake_mg = 200
                recommendations = "저녁 근무 전 적당한 카페인 섭취 후 야간에는 피하세요."
                alternative_methods = "충분한 수분 섭취, 스트레칭, 건강한 간식"
            else:
                # 일반 근무자용 카페인 계획
                cutoff_time = "14:00"
                max_intake_mg = 400
                recommendations = "오후 2시 이후 카페인 섭취를 피해 야간 수면의 질을 보장하세요."
                alternative_methods = "녹차, 허브차, 가벼운 산책으로 오후 피로 해소"
            
            # 데이터베이스에 저장
            query = """
            INSERT INTO caffeine_plans (user_id, plan_date, cutoff_time, max_intake_mg, 
                                      recommendations, alternative_methods)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id, plan_date) 
            DO UPDATE SET 
                cutoff_time = EXCLUDED.cutoff_time,
                max_intake_mg = EXCLUDED.max_intake_mg,
                recommendations = EXCLUDED.recommendations,
                alternative_methods = EXCLUDED.alternative_methods,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, user_id, plan_date, cutoff_time, max_intake_mg, 
                     recommendations, alternative_methods, created_at, updated_at
            """
            
            params = (user_id, plan_date, cutoff_time, max_intake_mg, 
                     recommendations, alternative_methods)
            
            return self.db.execute_insert_returning(query, params)
        except Exception as e:
            logger.error(f"카페인 계획 생성 오류: {e}")
            raise
    
    def get_caffeine_plan(self, user_id: str, plan_date: str) -> Optional[Dict[str, Any]]:
        """카페인 계획 조회"""
        try:
            query = """
            SELECT id, user_id, plan_date, cutoff_time, max_intake_mg, 
                   recommendations, alternative_methods, created_at, updated_at
            FROM caffeine_plans 
            WHERE user_id = %s AND plan_date = %s
            """
            results = self.db.execute_query(query, (user_id, plan_date))
            return results[0] if results else None
        except Exception as e:
            logger.error(f"카페인 계획 조회 오류: {e}")
            raise
    
    def chat_with_ai(self, user_id: str, message: str) -> Dict[str, Any]:
        """AI 챗봇 상담 (더미 데이터)"""
        try:
            # 더미 AI 응답 생성
            dummy_responses = [
                "교대근무로 인한 피로는 자연스러운 현상입니다. 규칙적인 수면 패턴을 유지하는 것이 중요해요.",
                "수면의 질을 높이기 위해 침실을 어둡고 시원하게 유지하고, 카페인 섭취 시간을 조절해보세요.",
                "교대근무 전후로 가벼운 운동이나 스트레칭을 하면 몸의 리듬을 조절하는 데 도움이 됩니다.",
                "충분한 수분 섭취와 균형 잡힌 식사로 에너지 레벨을 안정적으로 유지하세요.",
                "스트레스 관리를 위해 명상이나 깊은 호흡 연습을 해보시는 것을 추천드립니다."
            ]
            
            # 키워드 기반 간단한 응답 선택
            if any(keyword in message.lower() for keyword in ['수면', '잠', '피곤']):
                response = "수면 관련 고민이시군요. " + dummy_responses[0]
            elif any(keyword in message.lower() for keyword in ['카페인', '커피', '각성']):
                response = "카페인 관련 질문이시네요. " + dummy_responses[1]
            elif any(keyword in message.lower() for keyword in ['운동', '스트레칭', '활동']):
                response = "운동에 대한 질문이군요. " + dummy_responses[2]
            elif any(keyword in message.lower() for keyword in ['스트레스', '걱정', '불안']):
                response = "스트레스 관리가 필요하시군요. " + dummy_responses[4]
            else:
                response = random.choice(dummy_responses)
            
            # 채팅 기록 저장
            query = """
            INSERT INTO chat_history (user_id, message, response)
            VALUES (%s, %s, %s)
            RETURNING id, user_id, message, response, created_at
            """
            
            return self.db.execute_insert_returning(query, (user_id, message, response))
        except Exception as e:
            logger.error(f"AI 챗봇 오류: {e}")
            raise
    
    def get_chat_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """채팅 기록 조회"""
        try:
            query = """
            SELECT id, user_id, message, response, created_at
            FROM chat_history 
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
            """
            return self.db.execute_query(query, (user_id, limit))
        except Exception as e:
            logger.error(f"채팅 기록 조회 오류: {e}")
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
        
        # AI 서비스 초기화
        ai_service = AIService()
        
        # 라우팅
        if http_method == 'POST' and '/sleep-plans' in path:
            # POST /users/{user_id}/sleep-plans - 수면 계획 생성
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            plan_date = body.get('plan_date')
            if not plan_date:
                return create_response(400, {'error': 'plan_date 필드가 필요합니다'})
            
            sleep_plan = ai_service.generate_sleep_plan(user_id, plan_date)
            return create_response(201, {'sleep_plan': sleep_plan})
        
        elif http_method == 'GET' and '/sleep-plans' in path:
            # GET /users/{user_id}/sleep-plans?date=YYYY-MM-DD - 수면 계획 조회
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            query_params = event.get('queryStringParameters') or {}
            plan_date = query_params.get('date')
            if not plan_date:
                return create_response(400, {'error': 'date 쿼리 파라미터가 필요합니다'})
            
            sleep_plan = ai_service.get_sleep_plan(user_id, plan_date)
            if not sleep_plan:
                return create_response(404, {'error': '수면 계획을 찾을 수 없습니다'})
            
            return create_response(200, {'sleep_plan': sleep_plan})
        
        elif http_method == 'POST' and '/caffeine-plans' in path:
            # POST /users/{user_id}/caffeine-plans - 카페인 계획 생성
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            plan_date = body.get('plan_date')
            if not plan_date:
                return create_response(400, {'error': 'plan_date 필드가 필요합니다'})
            
            caffeine_plan = ai_service.generate_caffeine_plan(user_id, plan_date)
            return create_response(201, {'caffeine_plan': caffeine_plan})
        
        elif http_method == 'GET' and '/caffeine-plans' in path:
            # GET /users/{user_id}/caffeine-plans?date=YYYY-MM-DD - 카페인 계획 조회
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            query_params = event.get('queryStringParameters') or {}
            plan_date = query_params.get('date')
            if not plan_date:
                return create_response(400, {'error': 'date 쿼리 파라미터가 필요합니다'})
            
            caffeine_plan = ai_service.get_caffeine_plan(user_id, plan_date)
            if not caffeine_plan:
                return create_response(404, {'error': '카페인 계획을 찾을 수 없습니다'})
            
            return create_response(200, {'caffeine_plan': caffeine_plan})
        
        elif http_method == 'POST' and '/chat' in path:
            # POST /users/{user_id}/chat - AI 챗봇 상담
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            message = body.get('message')
            if not message:
                return create_response(400, {'error': 'message 필드가 필요합니다'})
            
            chat_result = ai_service.chat_with_ai(user_id, message)
            return create_response(201, {'chat': chat_result})
        
        elif http_method == 'GET' and '/chat' in path:
            # GET /users/{user_id}/chat - 채팅 기록 조회
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            query_params = event.get('queryStringParameters') or {}
            limit = int(query_params.get('limit', 20))
            
            chat_history = ai_service.get_chat_history(user_id, limit)
            return create_response(200, {'chat_history': chat_history})
        
        else:
            return create_response(404, {'error': '지원하지 않는 경로입니다'})
    
    except Exception as e:
        logger.error(f"Lambda 실행 오류: {e}")
        return create_response(500, {'error': '서버 내부 오류가 발생했습니다'})