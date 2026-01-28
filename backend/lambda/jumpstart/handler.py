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

class JumpstartService:
    def __init__(self):
        self.db = DatabaseManager()
    
    def create_daily_jumpstart(self, user_id: str, block_date: str) -> Dict[str, Any]:
        """일일 점프스타트 블록 생성"""
        try:
            # 기본 점프스타트 블록 정의
            default_blocks = [
                {
                    'block_type': 'now',
                    'block_name': 'Now',
                    'total_duration': 15,  # 15분
                    'tasks': [
                        {'task_name': '물 한 잔 마시기', 'duration_minutes': 2, 'task_order': 1},
                        {'task_name': '깊게 숨쉬기 (5회)', 'duration_minutes': 3, 'task_order': 2},
                        {'task_name': '간단한 스트레칭', 'duration_minutes': 5, 'task_order': 3},
                        {'task_name': '오늘의 목표 확인', 'duration_minutes': 5, 'task_order': 4}
                    ]
                },
                {
                    'block_type': 'must_do',
                    'block_name': 'Must-do',
                    'total_duration': 90,  # 90분
                    'tasks': [
                        {'task_name': '업무 우선순위 정리', 'duration_minutes': 15, 'task_order': 1},
                        {'task_name': '중요한 이메일 확인', 'duration_minutes': 20, 'task_order': 2},
                        {'task_name': '핵심 업무 처리', 'duration_minutes': 45, 'task_order': 3},
                        {'task_name': '진행상황 점검', 'duration_minutes': 10, 'task_order': 4}
                    ]
                },
                {
                    'block_type': 'recovery',
                    'block_name': 'Recovery',
                    'total_duration': 10,  # 10분
                    'tasks': [
                        {'task_name': '눈 마사지', 'duration_minutes': 3, 'task_order': 1},
                        {'task_name': '목과 어깨 스트레칭', 'duration_minutes': 4, 'task_order': 2},
                        {'task_name': '명상 또는 휴식', 'duration_minutes': 3, 'task_order': 3}
                    ]
                }
            ]
            
            created_blocks = []
            
            for block_data in default_blocks:
                # 블록 생성
                block_query = """
                INSERT INTO jumpstart_blocks (user_id, block_date, block_type, block_name, 
                                            total_duration, completed_tasks, total_tasks)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, block_date, block_type) 
                DO UPDATE SET 
                    block_name = EXCLUDED.block_name,
                    total_duration = EXCLUDED.total_duration,
                    total_tasks = EXCLUDED.total_tasks,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, user_id, block_date, block_type, block_name, 
                         total_duration, completed_tasks, total_tasks, created_at, updated_at
                """
                
                block_params = (
                    user_id, block_date, block_data['block_type'], block_data['block_name'],
                    block_data['total_duration'], 0, len(block_data['tasks'])
                )
                
                block = self.db.execute_insert_returning(block_query, block_params)
                
                # 기존 작업 삭제 후 새로 생성
                delete_tasks_query = "DELETE FROM jumpstart_tasks WHERE block_id = %s"
                self.db.execute_update(delete_tasks_query, (block['id'],))
                
                # 작업 생성
                tasks = []
                for task_data in block_data['tasks']:
                    task_query = """
                    INSERT INTO jumpstart_tasks (block_id, user_id, task_date, task_name, 
                                               duration_minutes, completed, task_order)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, block_id, user_id, task_date, task_name, 
                             duration_minutes, completed, completed_at, task_order, created_at
                    """
                    
                    task_params = (
                        block['id'], user_id, block_date, task_data['task_name'],
                        task_data['duration_minutes'], False, task_data['task_order']
                    )
                    
                    task = self.db.execute_insert_returning(task_query, task_params)
                    tasks.append(task)
                
                block['tasks'] = tasks
                created_blocks.append(block)
            
            return {
                'user_id': user_id,
                'block_date': block_date,
                'blocks': created_blocks
            }
        except Exception as e:
            logger.error(f"점프스타트 생성 오류: {e}")
            raise
    
    def get_daily_jumpstart(self, user_id: str, block_date: str) -> Dict[str, Any]:
        """일일 점프스타트 조회"""
        try:
            # 블록 조회
            blocks_query = """
            SELECT id, user_id, block_date, block_type, block_name, 
                   total_duration, completed_tasks, total_tasks, created_at, updated_at
            FROM jumpstart_blocks 
            WHERE user_id = %s AND block_date = %s
            ORDER BY 
                CASE block_type 
                    WHEN 'now' THEN 1 
                    WHEN 'must_do' THEN 2 
                    WHEN 'recovery' THEN 3 
                END
            """
            blocks = self.db.execute_query(blocks_query, (user_id, block_date))
            
            if not blocks:
                return None
            
            # 각 블록의 작업 조회
            for block in blocks:
                tasks_query = """
                SELECT id, block_id, user_id, task_date, task_name, 
                       duration_minutes, completed, completed_at, task_order, created_at
                FROM jumpstart_tasks 
                WHERE block_id = %s
                ORDER BY task_order
                """
                tasks = self.db.execute_query(tasks_query, (block['id'],))
                block['tasks'] = tasks
            
            return {
                'user_id': user_id,
                'block_date': block_date,
                'blocks': blocks
            }
        except Exception as e:
            logger.error(f"점프스타트 조회 오류: {e}")
            raise
    
    def update_task_completion(self, user_id: str, task_id: int, completed: bool) -> Dict[str, Any]:
        """작업 완료 상태 업데이트"""
        try:
            # 작업 업데이트
            if completed:
                task_query = """
                UPDATE jumpstart_tasks 
                SET completed = %s, completed_at = CURRENT_TIMESTAMP
                WHERE id = %s AND user_id = %s
                RETURNING id, block_id, user_id, task_date, task_name, 
                         duration_minutes, completed, completed_at, task_order, created_at
                """
            else:
                task_query = """
                UPDATE jumpstart_tasks 
                SET completed = %s, completed_at = NULL
                WHERE id = %s AND user_id = %s
                RETURNING id, block_id, user_id, task_date, task_name, 
                         duration_minutes, completed, completed_at, task_order, created_at
                """
            
            task = self.db.execute_insert_returning(task_query, (completed, task_id, user_id))
            
            if not task:
                raise ValueError("작업을 찾을 수 없습니다")
            
            # 블록의 완료된 작업 수 업데이트
            update_block_query = """
            UPDATE jumpstart_blocks 
            SET completed_tasks = (
                SELECT COUNT(*) 
                FROM jumpstart_tasks 
                WHERE block_id = %s AND completed = true
            )
            WHERE id = %s
            """
            self.db.execute_update(update_block_query, (task['block_id'], task['block_id']))
            
            return task
        except Exception as e:
            logger.error(f"작업 완료 상태 업데이트 오류: {e}")
            raise
    
    def add_custom_task(self, user_id: str, block_id: int, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """사용자 정의 작업 추가"""
        try:
            # 블록 소유권 확인
            block_query = """
            SELECT id, block_date, total_tasks 
            FROM jumpstart_blocks 
            WHERE id = %s AND user_id = %s
            """
            blocks = self.db.execute_query(block_query, (block_id, user_id))
            
            if not blocks:
                raise ValueError("블록을 찾을 수 없습니다")
            
            block = blocks[0]
            
            # 다음 작업 순서 계산
            max_order_query = """
            SELECT COALESCE(MAX(task_order), 0) + 1 as next_order
            FROM jumpstart_tasks 
            WHERE block_id = %s
            """
            order_result = self.db.execute_query(max_order_query, (block_id,))
            next_order = order_result[0]['next_order']
            
            # 작업 추가
            task_query = """
            INSERT INTO jumpstart_tasks (block_id, user_id, task_date, task_name, 
                                       duration_minutes, completed, task_order)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, block_id, user_id, task_date, task_name, 
                     duration_minutes, completed, completed_at, task_order, created_at
            """
            
            task_params = (
                block_id, user_id, block['block_date'], task_data['task_name'],
                task_data.get('duration_minutes', 5), False, next_order
            )
            
            task = self.db.execute_insert_returning(task_query, task_params)
            
            # 블록의 총 작업 수 업데이트
            update_block_query = """
            UPDATE jumpstart_blocks 
            SET total_tasks = total_tasks + 1,
                total_duration = total_duration + %s
            WHERE id = %s
            """
            self.db.execute_update(update_block_query, (task_data.get('duration_minutes', 5), block_id))
            
            return task
        except Exception as e:
            logger.error(f"사용자 정의 작업 추가 오류: {e}")
            raise
    
    def get_jumpstart_statistics(self, user_id: str, days: int = 7) -> Dict[str, Any]:
        """점프스타트 통계"""
        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days-1)
            
            # 전체 통계
            stats_query = """
            SELECT 
                COUNT(DISTINCT jb.block_date) as active_days,
                COUNT(jt.id) as total_tasks,
                COUNT(CASE WHEN jt.completed = true THEN 1 END) as completed_tasks,
                AVG(CASE WHEN jt.completed = true THEN jt.duration_minutes END) as avg_task_duration,
                SUM(CASE WHEN jt.completed = true THEN jt.duration_minutes ELSE 0 END) as total_completed_minutes
            FROM jumpstart_blocks jb
            LEFT JOIN jumpstart_tasks jt ON jb.id = jt.block_id
            WHERE jb.user_id = %s AND jb.block_date BETWEEN %s AND %s
            """
            
            stats = self.db.execute_query(stats_query, (user_id, start_date, end_date))
            
            # 블록별 통계
            block_stats_query = """
            SELECT 
                jb.block_type,
                jb.block_name,
                COUNT(jt.id) as total_tasks,
                COUNT(CASE WHEN jt.completed = true THEN 1 END) as completed_tasks,
                SUM(CASE WHEN jt.completed = true THEN jt.duration_minutes ELSE 0 END) as completed_minutes
            FROM jumpstart_blocks jb
            LEFT JOIN jumpstart_tasks jt ON jb.id = jt.block_id
            WHERE jb.user_id = %s AND jb.block_date BETWEEN %s AND %s
            GROUP BY jb.block_type, jb.block_name
            ORDER BY 
                CASE jb.block_type 
                    WHEN 'now' THEN 1 
                    WHEN 'must_do' THEN 2 
                    WHEN 'recovery' THEN 3 
                END
            """
            
            block_stats = self.db.execute_query(block_stats_query, (user_id, start_date, end_date))
            
            if stats and stats[0]['total_tasks']:
                main_stats = stats[0]
                completion_rate = (main_stats['completed_tasks'] / main_stats['total_tasks']) * 100 if main_stats['total_tasks'] > 0 else 0
                
                return {
                    'period_days': days,
                    'active_days': main_stats['active_days'],
                    'total_tasks': main_stats['total_tasks'],
                    'completed_tasks': main_stats['completed_tasks'],
                    'completion_rate': round(completion_rate, 1),
                    'total_completed_minutes': main_stats['total_completed_minutes'] or 0,
                    'average_task_duration': round(float(main_stats['avg_task_duration'] or 0), 1),
                    'block_statistics': [
                        {
                            'block_type': block['block_type'],
                            'block_name': block['block_name'],
                            'total_tasks': block['total_tasks'],
                            'completed_tasks': block['completed_tasks'],
                            'completion_rate': round((block['completed_tasks'] / block['total_tasks']) * 100, 1) if block['total_tasks'] > 0 else 0,
                            'completed_minutes': block['completed_minutes'] or 0
                        }
                        for block in block_stats
                    ]
                }
            else:
                return {
                    'period_days': days,
                    'active_days': 0,
                    'total_tasks': 0,
                    'completed_tasks': 0,
                    'completion_rate': 0,
                    'total_completed_minutes': 0,
                    'average_task_duration': 0,
                    'block_statistics': []
                }
        except Exception as e:
            logger.error(f"점프스타트 통계 조회 오류: {e}")
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
        
        # 점프스타트 서비스 초기화
        jumpstart_service = JumpstartService()
        
        # 라우팅
        if http_method == 'POST' and '/jumpstart' in path and '/tasks' not in path:
            # POST /users/{user_id}/jumpstart - 일일 점프스타트 생성
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            block_date = body.get('block_date')
            if not block_date:
                block_date = datetime.now().date().strftime('%Y-%m-%d')
            
            jumpstart = jumpstart_service.create_daily_jumpstart(user_id, block_date)
            return create_response(201, {'jumpstart': jumpstart})
        
        elif http_method == 'GET' and '/jumpstart' in path and '/statistics' not in path:
            # GET /users/{user_id}/jumpstart?date=YYYY-MM-DD - 일일 점프스타트 조회
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            query_params = event.get('queryStringParameters') or {}
            block_date = query_params.get('date')
            if not block_date:
                block_date = datetime.now().date().strftime('%Y-%m-%d')
            
            jumpstart = jumpstart_service.get_daily_jumpstart(user_id, block_date)
            if not jumpstart:
                return create_response(404, {'error': '점프스타트를 찾을 수 없습니다'})
            
            return create_response(200, {'jumpstart': jumpstart})
        
        elif http_method == 'PUT' and '/tasks/' in path:
            # PUT /users/{user_id}/jumpstart/tasks/{task_id} - 작업 완료 상태 업데이트
            user_id = extract_user_id_from_event(event)
            task_id = event.get('pathParameters', {}).get('task_id')
            
            if not user_id or not task_id:
                return create_response(400, {'error': '사용자 ID와 작업 ID가 필요합니다'})
            
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            completed = body.get('completed', False)
            
            task = jumpstart_service.update_task_completion(user_id, int(task_id), completed)
            return create_response(200, {'task': task})
        
        elif http_method == 'POST' and '/tasks' in path:
            # POST /users/{user_id}/jumpstart/blocks/{block_id}/tasks - 사용자 정의 작업 추가
            user_id = extract_user_id_from_event(event)
            block_id = event.get('pathParameters', {}).get('block_id')
            
            if not user_id or not block_id:
                return create_response(400, {'error': '사용자 ID와 블록 ID가 필요합니다'})
            
            try:
                body = json.loads(event.get('body', '{}'))
            except json.JSONDecodeError:
                return create_response(400, {'error': '잘못된 JSON 형식입니다'})
            
            if not body.get('task_name'):
                return create_response(400, {'error': 'task_name 필드가 필요합니다'})
            
            task = jumpstart_service.add_custom_task(user_id, int(block_id), body)
            return create_response(201, {'task': task})
        
        elif http_method == 'GET' and '/jumpstart/statistics' in path:
            # GET /users/{user_id}/jumpstart/statistics?days=7 - 점프스타트 통계
            user_id = extract_user_id_from_event(event)
            if not user_id:
                return create_response(400, {'error': '사용자 ID가 필요합니다'})
            
            query_params = event.get('queryStringParameters') or {}
            days = int(query_params.get('days', 7))
            
            statistics = jumpstart_service.get_jumpstart_statistics(user_id, days)
            return create_response(200, {'statistics': statistics})
        
        else:
            return create_response(404, {'error': '지원하지 않는 경로입니다'})
    
    except Exception as e:
        logger.error(f"Lambda 실행 오류: {e}")
        return create_response(500, {'error': '서버 내부 오류가 발생했습니다'})