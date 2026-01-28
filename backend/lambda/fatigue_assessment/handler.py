import json
import os
import boto3
from datetime import datetime, date, timedelta
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

class FatigueAssessmentService:
    def __init__(self):
        self.db = DatabaseManager()
    
    def calculate_fatigue_risk(self, user_id: str, assessment_date: str) -> Dict[str, Any]:
        """피로 위험도 계산 (백엔드 로직)"""
        try:
            # 사용자 정보 조회
            user_query = """
            SELECT commute_time, work_type 
            FROM users 
            WHERE user_id = %s
            """
            users = self.db.execute_query(user_query, (user_id,))
            if not users:
                raise ValueError("사용자를 찾을 수 없습니다")
            
            user = users[0]
            commute_time = user['commute_time'] or 30
            
            # 최근 7일간의 스케줄 조회
            end_date = datetime.strptime(assessment_date, '%Y-%m-%d').date()
            start_date = end_date - timedelta(days=6)
            
            schedule_query = """
            SELECT work_date, shift_type, start_time, end_time
            FROM schedules 
            WHERE user_id = %s AND work_date BETWEEN %s AND %s
            ORDER BY work_date DESC
            """
            schedules = self.db.execute_query(schedule_query, (user_id, start_date, end_date))
            
            # 수면 계획에서 수면 시간 조회
            sleep_query = """
            SELECT main_sleep_duration, nap_duration
            FROM sleep_plans 
            WHERE user_id = %s AND plan_date = %s
            """
            sleep_plans = self.db.execute_query(sleep_query, (user_id, assessment_date))
            
            # 수면 시간 계산
            if sleep_plans:
                main_sleep = sleep_plans[0]['main_sleep_duration'] or 0
                nap_sleep = sleep_plans[0]['nap_duration'] or 0
                total_sleep_minutes = main_sleep + nap_sleep
                sleep_hours = total_sleep_minutes / 60.0
            else:
                # 기본값: 일반적인 수면 시간
                sleep_hours = 7.0
            
            # 연속 야간 근무 일수 계산
            consecutive_night_shifts = 0
            for schedule in schedules:
                if schedule['shift_type'] == 'night':
                    consecutive_night_shifts += 1
                else:
                    break
            
            # 피로 위험도 점수 계산 (0-100)
            risk_score = 0
            
            # 1. 수면 시간 점수 (40점 만점)
            if sleep_hours >= 8:
                sleep_score = 0  # 충분한 수면
            elif sleep_hours >= 6:
                sleep_score = 10  # 약간 부족
            elif sleep_hours >= 4:
                sleep_score = 25  # 부족
            else:
                sleep_score = 40  # 매우 부족
            
            risk_score += sleep_score
            
            # 2. 연속 야간 근무 점수 (30점 만점)
            if consecutive_night_shifts == 0:
                night_score = 0
            elif consecutive_night_shifts <= 2:
                night_score = 10
            elif consecutive_night_shifts <= 4:
                night_score = 20
            else:
                night_score = 30
            
            risk_score += night_score
            
            # 3. 통근 시간 점수 (20점 만점)
            if commute_time <= 30:
                commute_score = 0
            elif commute_time <= 60:
                commute_score = 5
            elif commute_time <= 90:
                commute_score = 10
            else:
                commute_score = 20
            
            risk_score += commute_score
            
            # 4. 근무 패턴 점수 (10점 만점)
            if len(schedules) >= 5:  # 최근 일주일 중 5일 이상 근무
                pattern_score = 10
            elif len(schedules) >= 3:
                pattern_score = 5
            else:
                pattern_score = 0
            
            risk_score += pattern_score
            
            # 위험도 레벨 결정
            if risk_score <= 30:
                risk_level = 'low'
                safety_recommendations = "현재 피로 수준이 낮습니다. 규칙적인 수면 패턴을 유지하세요."
            elif risk_score <= 60:
                risk_level = 'medium'
                safety_recommendations = "중간 수준의 피로가 감지됩니다. 충분한 휴식과 수면을 취하고, 운전 시 주의하세요."
            else:
                risk_level = 'high'
                safety_recommendations = "높은 피로 위험도입니다. 가능하면 운전을 피하고, 즉시 휴식을 취하세요. 필요시 의료진과 상담하세요."
            
            # 데이터베이스에 저장
            query = """
            INSERT INTO fatigue_assessments (user_id, assessment_date, sleep_hours, 
                                           consecutive_night_shifts, commute_time, 
                                           risk_level, risk_score, safety_recommendations)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id, assessment_date) 
            DO UPDATE SET 
                sleep_hours = EXCLUDED.sleep_hours,
                consecutive_night_shifts = EXCLUDED.consecutive_night_shifts,
                commute_time = EXCLUDED.commute_time,
                risk_level = EXCLUDED.risk_level,
                risk_score = EXCLUDED.risk_score,
                safety_recommendations = EXCLUDED.safety_recommendations,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, user_id, assessment_date, sleep_hours, consecutive_night_shifts, 
                     commute_time, risk_level, risk_score, safety_recommendations, 
                     created_at, updated_at
            """
            
            params = (user_id, assessment_date, sleep_hours, consecutive_night_shifts, 
                     commute_time, risk_level, risk_score, safety_recommendations)
            
            result = self.db.execute_insert_returning(query, params)
            
            # 추가 정보 포함
            result['calculation_details'] = {
                'sleep_score': sleep_score,
                'night_shift_score': night_score,
                'commute_score': commute_score,
                'pattern_score': pattern_score,
                'total_schedules': len(schedules)
            }
            
            return result
        except Exception as e:
            logger.error(f"피로 위험도 계산 오류: {e}")
            raise
    
    def get_fatigue_assessment(self, user_id: str, assessment_date: str) -> Optional[Dict[str, Any]]:
        """피로 위험도 평가 조회"""
        try:
            query = """
            SELECT id, user_id, assessment_date, sleep_hours, consecutive_night_shifts, 
                   commute_time, risk_level, risk_score, safety_recommendations, 
                   created_at, updated_at
            FROM fatigue_assessments 
            WHERE user_id = %s AND assessment_date = %s
            """
            results = self.db.execute_query(query, (user_id, assessment_date))
            return results[0] if results else None
        except Exception as e:
            logger.error(f"피로 위험도 조회 오류: {e}")
            raise
    
    def get_fatigue_history(self, user_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """피로 위험도 기록 조회"""
        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days-1)
            
            query = """
            SELECT id, user_id, assessment_date, sleep_hours, consecutive_night_shifts, 
                   commute_time, risk_level, risk_score, safety_recommendations, 
                   created_at, updated_at
            FROM fatigue_assessments 
            WHERE user_id = %s AND assessment_date BETWEEN %s AND %s
            ORDER BY assessment_date DESC
            """
            return self.db.execute_query(query, (user_id, start_date, end_date))
        except Exception as e:
            logger.error(f"피로 위험도 기록 조회 오류: {e}")
            raise
    
    def get_risk_statistics(self, user_id: str) -> Dict[str, Any]:
        """피로 위험도 통계"""
        try:
            # 최근 30일 통계
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=29)
            
            stats_query = """
            SELECT 
                COUNT(*) as total_assessments,
                AVG(risk_score) as avg_risk_score,
                AVG(sleep_hours) as avg_sleep_hours,
                COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_risk_days,
                COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_risk_days,
                COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk_days,
                MAX(consecutive_night_shifts) as max_consecutive_nights
            FROM fatigue_assessments 
            WHERE user_id = %s AND assessment_date BETWEEN %s AND %s
            """
            
            results = self.db.execute_query(stats_query, (user_id, start_date, end_date))
            
            if results and results[0]['total_assessments'] > 0:
                stats = results[0]
                return {
                    'period_days': 30,
                    'total_assessments': stats['total_assessments'],
                    'average_risk_score': round(float(stats['avg_risk_score'] or 0), 1),
                    'average_sleep_hours': round(float(stats['avg_sleep_hours'] or 0), 1),
                    'risk_distribution': {
                        'low': stats['low_risk_days'],
                        'medium': stats['medium_risk_days'],
                        'high': stats['high_risk_days']
                    },
                    'max_consecutive_night_shifts': stats['max_consecutive_nights']
                }
            else:
                return {
                    'period_days': 30,
                    'total_assessments': 0,
                    'average_risk_score': 0,
                    'average_sleep_hours': 0,
                    'risk_distribution': {'low': 0, 'medium': 0, 'high': 0},
                    'max_consecutive_night_shifts': 0
                }
        except Exception as e:
            logger.error(f"피로 위험도 통계 조회 오류: {e}")
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
        
        # 피로 평가 서비스 초기화
        fatigue_service = FatigueAssessmentService()
        
        # 라우팅
        if http_method == 'POST' and '/fatigue-assessment' in path:
            # POST /users/{user_id}/fatigue-assessment - 피로 위험도 계산
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            assessment_date = body.get('assessment_date')
            if not assessment_date:
                # 기본값: 오늘 날짜
                assessment_date = datetime.now().date().strftime('%Y-%m-%d')
            
            assessment = fatigue_service.calculate_fatigue_risk(user_id, assessment_date)
            return create_response(201, {'assessment': assessment})
        
        elif http_method == 'GET' and '/fatigue-assessment' in path and '/history' not in path and '/statistics' not in path:
            # GET /users/{user_id}/fatigue-assessment?date=YYYY-MM-DD - 피로 위험도 조회
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            query_params = event.get('queryStringParameters') or {}
            assessment_date = query_params.get('date')
            if not assessment_date:
                assessment_date = datetime.now().date().strftime('%Y-%m-%d')
            
            assessment = fatigue_service.get_fatigue_assessment(user_id, assessment_date)
            if not assessment:
                return create_response(404, {'error': '피로 위험도 평가를 찾을 수 없습니다'})
            
            return create_response(200, {'assessment': assessment})
        
        elif http_method == 'GET' and '/fatigue-assessment/history' in path:
            # GET /users/{user_id}/fatigue-assessment/history?days=30 - 피로 위험도 기록
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            query_params = event.get('queryStringParameters') or {}
            days = int(query_params.get('days', 30))
            
            history = fatigue_service.get_fatigue_history(user_id, days)
            return create_response(200, {'history': history})
        
        elif http_method == 'GET' and '/fatigue-assessment/statistics' in path:
            # GET /users/{user_id}/fatigue-assessment/statistics - 피로 위험도 통계
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            statistics = fatigue_service.get_risk_statistics(user_id)
            return create_response(200, {'statistics': statistics})
        
        else:
            return create_response(404, {'error': '지원하지 않는 경로입니다'})
    
    except Exception as e:
        logger.error(f"Lambda 실행 오류: {e}")
        return create_response(500, {'error': '서버 내부 오류가 발생했습니다'})