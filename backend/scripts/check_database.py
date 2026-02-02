#!/usr/bin/env python3
"""
데이터베이스 상태 확인 스크립트
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

# .env 파일 직접 로드
def load_env_file():
    """환경 변수 파일 직접 로드"""
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if os.path.exists(env_path):
        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        os.environ[key] = value
            print(f"✅ .env 파일 로드 완료")
        except UnicodeDecodeError:
            with open(env_path, 'r', encoding='cp949') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        os.environ[key] = value
            print(f"✅ .env 파일 로드 완료 (cp949)")

def main():
    print("=" * 50)
    print("🔍 데이터베이스 상태 확인")
    print("=" * 50)
    
    # .env 파일 로드
    load_env_file()
    
    # 환경 변수에서 연결 정보 가져오기
    db_config = {
        'host': os.getenv('DB_HOST'),
        'port': os.getenv('DB_PORT', '5432'),
        'database': os.getenv('DB_NAME', 'rhythm_fairy'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD')
    }
    
    print(f"연결 정보:")
    print(f"  호스트: {db_config['host']}")
    print(f"  포트: {db_config['port']}")
    print(f"  데이터베이스: {db_config['database']}")
    print(f"  사용자: {db_config['user']}")
    print()
    
    try:
        # 데이터베이스 연결
        connection = psycopg2.connect(**db_config)
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        
        # 현재 데이터베이스 확인
        cursor.execute("SELECT current_database();")
        current_db = cursor.fetchone()
        print(f"📋 현재 연결된 데이터베이스: {current_db['current_database']}")
        
        # 모든 데이터베이스 목록
        cursor.execute("""
            SELECT datname FROM pg_database 
            WHERE datistemplate = false 
            ORDER BY datname;
        """)
        databases = cursor.fetchall()
        print(f"\n📚 사용 가능한 데이터베이스:")
        for db in databases:
            marker = " ← 현재" if db['datname'] == current_db['current_database'] else ""
            print(f"  - {db['datname']}{marker}")
        
        # 현재 데이터베이스의 테이블 목록
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        
        print(f"\n🗂️  현재 데이터베이스의 테이블 ({len(tables)}개):")
        if tables:
            for table in tables:
                print(f"  - {table['table_name']}")
        else:
            print("  (테이블 없음)")
        
        cursor.close()
        connection.close()
        
        print(f"\n✅ 데이터베이스 상태 확인 완료!")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())