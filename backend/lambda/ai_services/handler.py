import json
import os
import boto3
from datetime import datetime, date, time, timedelta
from typing import Dict, Any, Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import random
import uuid

# 로깅 설정
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Bedrock Agent 클라이언트는 필요할 때 초기화 (lazy initialization)
_bedrock_agent_runtime = None

def get_bedrock_client():
    """Bedrock Agent Runtime 클라이언트 가져오기 (lazy initialization)"""
    global _bedrock_agent_runtime
    if _bedrock_agent_runtime is None:
        _bedrock_agent_runtime = boto3.client(
            'bedrock-agent-runtime',
            region_name=os.environ.get('BEDROCK_REGION', 'us-east-1')
        )
    return _bedrock_agent_runtime

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
            
            # plan_date를 datetime 객체로 변환
            plan_datetime = datetime.strptime(plan_date, '%Y-%m-%d')
            
            # 더미 AI 로직 - 실제로는 외부 AI 서비스 호출
            if schedules and schedules[0]['shift_type'] == 'night':
                # 야간 근무자용 수면 계획 (근무 종료 후 아침에 수면)
                main_sleep_start = plan_datetime.replace(hour=8, minute=0)
                main_sleep_end = plan_datetime.replace(hour=16, minute=0)
                main_sleep_duration = 480  # 8시간
                nap_start = plan_datetime.replace(hour=20, minute=0)
                nap_end = plan_datetime.replace(hour=21, minute=0)
                nap_duration = 60  # 1시간
                rationale = "야간 근무 후 충분한 주간 수면과 근무 전 짧은 낮잠을 권장합니다."
            elif schedules and schedules[0]['shift_type'] == 'evening':
                # 저녁 근무자용 수면 계획 (근무 종료 후 새벽에 수면)
                main_sleep_start = (plan_datetime + timedelta(days=1)).replace(hour=1, minute=0)
                main_sleep_end = (plan_datetime + timedelta(days=1)).replace(hour=9, minute=0)
                main_sleep_duration = 480  # 8시간
                nap_start = None
                nap_end = None
                nap_duration = None
                rationale = "저녁 근무 후 늦은 취침과 충분한 아침 수면을 권장합니다."
            else:
                # 일반 근무자용 수면 계획 (밤 11시 - 다음날 아침 7시)
                main_sleep_start = plan_datetime.replace(hour=23, minute=0)
                main_sleep_end = (plan_datetime + timedelta(days=1)).replace(hour=7, minute=0)
                main_sleep_duration = 480  # 8시간
                # 낮잠은 다음날 오후로 설정
                nap_start = (plan_datetime + timedelta(days=1)).replace(hour=15, minute=0)
                nap_end = (plan_datetime + timedelta(days=1)).replace(hour=16, minute=0)
                nap_duration = 60  # 1시간
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
            RETURNING id, user_id, plan_date, 
                     TO_CHAR(main_sleep_start, 'HH24:MI') as main_sleep_start,
                     TO_CHAR(main_sleep_end, 'HH24:MI') as main_sleep_end,
                     main_sleep_duration / 60 as main_sleep_duration,
                     TO_CHAR(nap_start, 'HH24:MI') as nap_start,
                     TO_CHAR(nap_end, 'HH24:MI') as nap_end,
                     nap_duration / 60 as nap_duration,
                     rationale, created_at, updated_at
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
            SELECT id, user_id, plan_date, 
                   main_sleep_start,
                   main_sleep_end,
                   main_sleep_duration / 60 as main_sleep_duration,
                   nap_start,
                   nap_end,
                   nap_duration / 60 as nap_duration,
                   rationale, created_at, updated_at
            FROM sleep_plans 
            WHERE user_id = %s AND plan_date = %s
            """
            results = self.db.execute_query(query, (user_id, plan_date))
            
            if results:
                result = results[0]
                # TIMESTAMP를 ISO 형식 문자열로 변환
                result['main_sleep_start'] = result['main_sleep_start'].isoformat() if result['main_sleep_start'] else None
                result['main_sleep_end'] = result['main_sleep_end'].isoformat() if result['main_sleep_end'] else None
                result['nap_start'] = result['nap_start'].isoformat() if result['nap_start'] else None
                result['nap_end'] = result['nap_end'].isoformat() if result['nap_end'] else None
                return result
            
            return None
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
            SELECT id, user_id, plan_date, 
                   TO_CHAR(cutoff_time, 'HH24:MI') as cutoff_time,
                   max_intake_mg, recommendations, alternative_methods, 
                   created_at, updated_at
            FROM caffeine_plans 
            WHERE user_id = %s AND plan_date = %s
            """
            results = self.db.execute_query(query, (user_id, plan_date))
            return results[0] if results else None
        except Exception as e:
            logger.error(f"카페인 계획 조회 오류: {e}")
            raise
    
    def chat_with_ai(self, user_id: str, message: str) -> Dict[str, Any]:
        """AI 챗봇 상담 (Bedrock Agent 사용)"""
        try:
            # Bedrock Agent 설정
            agent_id = os.environ.get('BEDROCK_AGENT_ID')
            agent_alias_id = os.environ.get('BEDROCK_AGENT_ALIAS_ID')
            
            if not agent_id or not agent_alias_id:
                logger.warning("Bedrock Agent 설정이 없습니다. 더미 응답을 사용합니다.")
                return self._chat_with_dummy_ai(user_id, message)
            
            # 세션 ID 생성 (사용자별 고유 세션)
            session_id = f"{user_id}-{datetime.now().strftime('%Y%m%d')}"
            
            logger.info(f"Bedrock Agent 호출 시작: agent_id={agent_id}, alias_id={agent_alias_id}, session_id={session_id}")
            
            # Bedrock Agent 클라이언트 가져오기 (타임아웃 설정)
            bedrock_client = boto3.client(
                'bedrock-agent-runtime',
                region_name=os.environ.get('BEDROCK_REGION', 'us-east-1'),
                config=boto3.session.Config(
                    connect_timeout=30,  # VPC 엔드포인트 연결을 위해 증가
                    read_timeout=90,
                    retries={'max_attempts': 2}  # 재시도 추가
                )
            )
            
            logger.info("Bedrock Agent invoke_agent 호출 중...")
            logger.info(f"요청 파라미터: agentId={agent_id}, agentAliasId={agent_alias_id}, sessionId={session_id}")
            
            # Bedrock Agent 호출
            response = bedrock_client.invoke_agent(
                agentId=agent_id,
                agentAliasId=agent_alias_id,
                sessionId=session_id,
                inputText=message,
                enableTrace=True  # 디버깅을 위해 trace 활성화
            )
            
            logger.info(f"Bedrock Agent 응답 수신: {list(response.keys())}")
            logger.info("스트림 처리 시작...")
            
            # 응답 스트림 처리
            ai_response = ""
            event_stream = response.get('completion')
            
            if not event_stream:
                logger.error("Bedrock Agent 응답에 completion 스트림이 없습니다")
                return self._chat_with_dummy_ai(user_id, message)
            
            chunk_count = 0
            error_occurred = False
            
            try:
                for event in event_stream:
                    chunk_count += 1
                    logger.info(f"스트림 청크 {chunk_count} 수신: {list(event.keys())}")
                    
                    # trace 이벤트 로깅
                    if 'trace' in event:
                        trace = event['trace']
                        logger.info(f"Trace 이벤트: {trace}")
                    
                    # chunk 이벤트 처리
                    if 'chunk' in event:
                        chunk = event['chunk']
                        logger.info(f"Chunk 내용: {list(chunk.keys())}")
                        
                        if 'bytes' in chunk:
                            text = chunk['bytes'].decode('utf-8')
                            ai_response += text
                            logger.info(f"텍스트 청크 ({len(text)}자): {text[:100]}...")
                    
                    # 오류 이벤트 확인
                    if 'internalServerException' in event:
                        logger.error(f"Internal Server Exception: {event['internalServerException']}")
                        error_occurred = True
                    
                    if 'validationException' in event:
                        logger.error(f"Validation Exception: {event['validationException']}")
                        error_occurred = True
                    
                    if 'accessDeniedException' in event:
                        logger.error(f"Access Denied Exception: {event['accessDeniedException']}")
                        error_occurred = True
                        
            except Exception as stream_error:
                logger.error(f"스트림 처리 중 오류: {type(stream_error).__name__}: {stream_error}", exc_info=True)
                error_occurred = True
            
            logger.info(f"스트림 처리 완료: {chunk_count}개 청크, {len(ai_response)}자, 오류={error_occurred}")
            
            if error_occurred or not ai_response:
                logger.warning("Bedrock Agent 응답이 비어있거나 오류 발생. 더미 응답 사용")
                return self._chat_with_dummy_ai(user_id, message)
            
            # 채팅 기록 저장
            query = """
            INSERT INTO chat_history (user_id, message, response)
            VALUES (%s, %s, %s)
            RETURNING id, user_id, message, response, created_at
            """
            
            return self.db.execute_insert_returning(query, (user_id, message, ai_response))
            
        except Exception as e:
            logger.error(f"Bedrock Agent 호출 오류: {type(e).__name__}: {e}", exc_info=True)
            # 오류 발생 시 더미 응답 사용
            return self._chat_with_dummy_ai(user_id, message)
    
    def _chat_with_dummy_ai(self, user_id: str, message: str) -> Dict[str, Any]:
        """AI 챗봇 상담 (더미 데이터 - 백업용)"""
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
            logger.error(f"더미 AI 챗봇 오류: {e}")
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
        
        # HTTP 메서드 및 경로 추출 (API Gateway v2 형식 지원)
        http_method = event.get('requestContext', {}).get('http', {}).get('method', event.get('httpMethod', ''))
        raw_path = event.get('rawPath', event.get('path', ''))
        
        # /prod 접두사 제거 (API Gateway stage)
        path = raw_path.replace('/prod', '', 1) if raw_path.startswith('/prod') else raw_path
        
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