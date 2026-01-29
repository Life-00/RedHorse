#!/usr/bin/env python3
"""
더미 데이터 삽입 스크립트
피로 위험도 테스트 데이터를 데이터베이스에 삽입합니다.
"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# .env 파일 로드
env_path = project_root / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ 환경 변수 로드: {env_path}")
else:
    print(f"⚠️  .env 파일을 찾을 수 없습니다: {env_path}")

from utils.database import DatabaseManager

def insert_dummy_data():
    """더미 데이터를 데이터베이스에 삽입"""
    
    # SQL 파일 읽기
    sql_file = project_root / 'infrastructure' / 'insert_dummy_data.sql'
    
    if not sql_file.exists():
        print(f"❌ SQL 파일을 찾을 수 없습니다: {sql_file}")
        return False
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print("📊 더미 데이터 삽입 시작...")
    
    try:
        db_manager = DatabaseManager()
        
        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                # SQL 실행
                cursor.execute(sql_content)
                conn.commit()
                
                print("✅ 더미 데이터 삽입 완료!")
                
                # 삽입된 데이터 확인
                cursor.execute("""
                    SELECT user_id, assessment_date, risk_level, risk_score 
                    FROM fatigue_assessments 
                    ORDER BY assessment_date DESC 
                    LIMIT 5
                """)
                
                results = cursor.fetchall()
                
                if results:
                    print("\n📋 삽입된 피로 위험도 데이터:")
                    print("-" * 80)
                    for row in results:
                        user_id, date, level, score = row
                        print(f"사용자: {user_id} | 날짜: {date} | 위험도: {level} | 점수: {score}")
                    print("-" * 80)
        
        return True
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = insert_dummy_data()
    sys.exit(0 if success else 1)
