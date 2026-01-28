#!/usr/bin/env python3
"""
rhythm_fairy 데이터베이스 생성 스크립트
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

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
    print("🏗️  rhythm_fairy 데이터베이스 생성")
    print("=" * 50)
    
    # .env 파일 로드
    load_env_file()
    
    # PostgreSQL 기본 데이터베이스에 연결
    db_config = {
        'host': os.getenv('DB_HOST'),
        'port': os.getenv('DB_PORT', '5432'),
        'database': 'postgres',  # PostgreSQL 기본 데이터베이스
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD')
    }
    
    print(f"PostgreSQL 기본 데이터베이스에 연결 중: {db_config['database']}")
    
    try:
        # 데이터베이스 연결 (autocommit 모드)
        connection = psycopg2.connect(**db_config)
        connection.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = connection.cursor()
        
        # 기존 데이터베이스 목록 확인
        cursor.execute("""
            SELECT datname FROM pg_database 
            WHERE datistemplate = false 
            ORDER BY datname;
        """)
        databases = cursor.fetchall()
        print(f"\n현재 데이터베이스 목록:")
        for db in databases:
            print(f"  - {db[0]}")
        
        # rhythm_fairy 데이터베이스가 이미 있는지 확인
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'rhythm_fairy';")
        exists = cursor.fetchone()
        
        if exists:
            print(f"\n✅ rhythm_fairy 데이터베이스가 이미 존재합니다.")
        else:
            print(f"\n🏗️  rhythm_fairy 데이터베이스 생성 중...")
            cursor.execute("CREATE DATABASE rhythm_fairy;")
            print(f"✅ rhythm_fairy 데이터베이스 생성 완료!")
        
        cursor.close()
        connection.close()
        
        print(f"\n🎉 작업 완료!")
        print(f"이제 .env 파일의 DB_NAME을 rhythm_fairy로 변경하세요.")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())