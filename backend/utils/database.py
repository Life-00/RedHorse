import os
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from typing import Dict, List, Any, Optional
import json
from datetime import datetime, date

class DatabaseManager:
    def __init__(self):
        # 환경 변수에서 데이터베이스 연결 정보 가져오기
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'rhythm_fairy'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', '')
        }
    
    @contextmanager
    def get_connection(self):
        """데이터베이스 연결 컨텍스트 매니저"""
        conn = None
        try:
            conn = psycopg2.connect(**self.db_config)
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            raise e
        finally:
            if conn:
                conn.close()
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
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
    
    def execute_insert_returning(self, query: str, params: tuple = None) -> Optional[Dict[str, Any]]:
        """INSERT 쿼리 실행 후 결과 반환"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                conn.commit()
                result = cursor.fetchone()
                return dict(result) if result else None

class UserRepository:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
    
    def create_user(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """사용자 생성"""
        query = """
        INSERT INTO users (user_id, email, name, work_type, commute_time, wearable_device, onboarding_completed)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING *
        """
        params = (
            user_data['user_id'],
            user_data['email'],
            user_data['name'],
            user_data.get('work_type', ''),
            user_data.get('commute_time', 30),
            user_data.get('wearable_device', 'none'),
            user_data.get('onboarding_completed', False)
        )
        return self.db.execute_insert_returning(query, params)
    
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """사용자 조회"""
        query = "SELECT * FROM users WHERE user_id = %s"
        results = self.db.execute_query(query, (user_id,))
        return results[0] if results else None
    
    def update_user(self, user_id: str, user_data: Dict[str, Any]) -> int:
        """사용자 정보 업데이트"""
        set_clauses = []
        params = []
        
        for key, value in user_data.items():
            if key != 'user_id':  # user_id는 업데이트하지 않음
                set_clauses.append(f"{key} = %s")
                params.append(value)
        
        if not set_clauses:
            return 0
        
        params.append(user_id)
        query = f"UPDATE users SET {', '.join(set_clauses)} WHERE user_id = %s"
        return self.db.execute_update(query, tuple(params))

class ScheduleRepository:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
    
    def create_schedule(self, schedule_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """스케줄 생성"""
        query = """
        INSERT INTO schedules (user_id, work_date, shift_type, start_time, end_time)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (user_id, work_date) 
        DO UPDATE SET shift_type = EXCLUDED.shift_type, 
                     start_time = EXCLUDED.start_time, 
                     end_time = EXCLUDED.end_time
        RETURNING *
        """
        params = (
            schedule_data['user_id'],
            schedule_data['work_date'],
            schedule_data['shift_type'],
            schedule_data.get('start_time'),
            schedule_data.get('end_time')
        )
        return self.db.execute_insert_returning(query, params)
    
    def get_user_schedules(self, user_id: str, start_date: str = None, end_date: str = None) -> List[Dict[str, Any]]:
        """사용자 스케줄 조회"""
        query = "SELECT * FROM schedules WHERE user_id = %s"
        params = [user_id]
        
        if start_date:
            query += " AND work_date >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND work_date <= %s"
            params.append(end_date)
        
        query += " ORDER BY work_date"
        return self.db.execute_query(query, tuple(params))
    
    def delete_schedule(self, user_id: str, work_date: str) -> int:
        """스케줄 삭제"""
        query = "DELETE FROM schedules WHERE user_id = %s AND work_date = %s"
        return self.db.execute_update(query, (user_id, work_date))

class ChecklistRepository:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
    
    def create_checklist_item(self, checklist_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """체크리스트 항목 생성"""
        query = """
        INSERT INTO checklists (user_id, task_date, task_type, task_name, completed)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (user_id, task_date, task_type, task_name)
        DO UPDATE SET completed = EXCLUDED.completed,
                     completed_at = CASE WHEN EXCLUDED.completed THEN CURRENT_TIMESTAMP ELSE NULL END
        RETURNING *
        """
        params = (
            checklist_data['user_id'],
            checklist_data['task_date'],
            checklist_data['task_type'],
            checklist_data['task_name'],
            checklist_data.get('completed', False)
        )
        return self.db.execute_insert_returning(query, params)
    
    def get_user_checklist(self, user_id: str, task_date: str, task_type: str = None) -> List[Dict[str, Any]]:
        """사용자 체크리스트 조회"""
        query = "SELECT * FROM checklists WHERE user_id = %s AND task_date = %s"
        params = [user_id, task_date]
        
        if task_type:
            query += " AND task_type = %s"
            params.append(task_type)
        
        query += " ORDER BY created_at"
        return self.db.execute_query(query, tuple(params))

class AudioRepository:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
    
    def get_audio_files(self, file_type: str = None) -> List[Dict[str, Any]]:
        """오디오 파일 목록 조회"""
        query = "SELECT * FROM audio_files"
        params = []
        
        if file_type:
            query += " WHERE file_type = %s"
            params.append(file_type)
        
        query += " ORDER BY title"
        return self.db.execute_query(query, tuple(params))
    
    def get_audio_file(self, audio_id: int) -> Optional[Dict[str, Any]]:
        """특정 오디오 파일 조회"""
        query = "SELECT * FROM audio_files WHERE id = %s"
        results = self.db.execute_query(query, (audio_id,))
        return results[0] if results else None

class ChatRepository:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
    
    def save_chat_message(self, user_id: str, message: str, response: str) -> Optional[Dict[str, Any]]:
        """채팅 메시지 저장"""
        query = """
        INSERT INTO chat_history (user_id, message, response)
        VALUES (%s, %s, %s)
        RETURNING *
        """
        return self.db.execute_insert_returning(query, (user_id, message, response))
    
    def get_chat_history(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """채팅 히스토리 조회"""
        query = """
        SELECT * FROM chat_history 
        WHERE user_id = %s 
        ORDER BY created_at DESC 
        LIMIT %s
        """
        return self.db.execute_query(query, (user_id, limit))

# 사용 예시
if __name__ == "__main__":
    db_manager = DatabaseManager()
    user_repo = UserRepository(db_manager)
    
    # 테스트용
    print("데이터베이스 연결 테스트")
    try:
        with db_manager.get_connection() as conn:
            print("데이터베이스 연결 성공!")
    except Exception as e:
        print(f"데이터베이스 연결 실패: {e}")