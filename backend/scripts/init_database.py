#!/usr/bin/env python3
"""
데이터베이스 초기화 스크립트
RDS 인스턴스 생성 후 실행하여 테이블 생성 및 기본 데이터 삽입
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

def read_sql_file(file_path):
    """SQL 파일 읽기"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except FileNotFoundError:
        print(f"파일을 찾을 수 없습니다: {file_path}")
        return None

def execute_sql_script(connection, sql_script):
    """SQL 스크립트 실행"""
    try:
        cursor = connection.cursor()
        cursor.execute(sql_script)
        connection.commit()
        cursor.close()
        return True
    except Exception as e:
        print(f"SQL 실행 오류: {e}")
        connection.rollback()
        return False

def main():
    # .env 파일 로드
    load_env_file()
    
    # 환경 변수에서 데이터베이스 연결 정보 가져오기
    db_config = {
        'host': os.getenv('DB_HOST'),
        'port': os.getenv('DB_PORT', '5432'),
        'database': os.getenv('DB_NAME', 'rhythm_fairy'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD')
    }
    
    # 필수 환경 변수 확인
    if not all([db_config['host'], db_config['password']]):
        print("오류: DB_HOST와 DB_PASSWORD 환경 변수가 필요합니다.")
        print("예시: export DB_HOST=your-rds-endpoint.amazonaws.com")
        print("예시: export DB_PASSWORD=your-password")
        sys.exit(1)
    
    try:
        # 데이터베이스 연결
        print("데이터베이스에 연결 중...")
        connection = psycopg2.connect(**db_config)
        connection.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        print("연결 성공!")
        
        # 스키마 생성
        print("\n테이블 생성 중...")
        schema_sql = read_sql_file('../infrastructure/complete_schema.sql')
        if schema_sql and execute_sql_script(connection, schema_sql):
            print("✅ 모든 테이블 생성 완료")
        else:
            print("❌ 테이블 생성 실패")
            sys.exit(1)
        
        # 샘플 데이터 삽입
        print("\n기본 데이터 삽입 중...")
        sample_data_sql = read_sql_file('../infrastructure/sample_data.sql')
        if sample_data_sql and execute_sql_script(connection, sample_data_sql):
            print("✅ 기본 데이터 삽입 완료")
        else:
            print("❌ 기본 데이터 삽입 실패")
        
        # 테이블 확인
        print("\n생성된 테이블 확인:")
        cursor = connection.cursor()
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        for table in tables:
            print(f"  - {table[0]}")
        
        # 오디오 파일 데이터 확인
        print("\n오디오 파일 데이터 확인:")
        cursor.execute("SELECT COUNT(*) FROM audio_files;")
        audio_count = cursor.fetchone()[0]
        print(f"  - 총 {audio_count}개의 오디오 파일 등록됨")
        
        cursor.close()
        connection.close()
        
        print("\n🎉 데이터베이스 초기화 완료!")
        print("\n다음 단계:")
        print("1. S3 버킷에 오디오 파일 업로드")
        print("2. Lambda 함수 배포")
        print("3. API Gateway 설정")
        
    except psycopg2.Error as e:
        print(f"데이터베이스 오류: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"예상치 못한 오류: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()