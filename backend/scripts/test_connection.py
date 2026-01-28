#!/usr/bin/env python3
"""
데이터베이스 연결 테스트 스크립트
RDS 인스턴스 생성 후 연결 확인용
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
            print(f"✅ .env 파일 로드 완료: {env_path}")
        except UnicodeDecodeError:
            # UTF-8로 안 되면 cp949로 시도
            with open(env_path, 'r', encoding='cp949') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        os.environ[key] = value
            print(f"✅ .env 파일 로드 완료 (cp949): {env_path}")
    else:
        print(f"❌ .env 파일을 찾을 수 없습니다: {env_path}")

def test_database_connection():
    """데이터베이스 연결 테스트"""
    
    # 환경 변수에서 연결 정보 가져오기
    db_config = {
        'host': os.getenv('DB_HOST'),
        'port': os.getenv('DB_PORT', '5432'),
        'database': os.getenv('DB_NAME', 'shift_worker_wellness'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD')
    }
    
    print("🔍 데이터베이스 연결 테스트")
    print(f"호스트: {db_config['host']}")
    print(f"포트: {db_config['port']}")
    print(f"데이터베이스: {db_config['database']}")
    print(f"사용자: {db_config['user']}")
    print()
    
    # 필수 환경 변수 확인
    if not all([db_config['host'], db_config['password']]):
        print("❌ 환경 변수가 설정되지 않았습니다.")
        print("다음 명령어를 실행하세요:")
        print("source ../.env")
        return False
    
    try:
        # 데이터베이스 연결
        print("⏳ 연결 시도 중...")
        connection = psycopg2.connect(**db_config)
        
        # 기본 쿼리 테스트
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        
        # PostgreSQL 버전 확인
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"✅ 연결 성공!")
        print(f"PostgreSQL 버전: {version['version'][:50]}...")
        print()
        
        # 테이블 목록 확인
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        if tables:
            print("📋 기존 테이블 목록:")
            for table in tables:
                print(f"  - {table['table_name']}")
        else:
            print("📋 테이블이 없습니다. init_database.py를 실행하세요.")
        
        print()
        
        # 연결 정보 확인
        cursor.execute("""
            SELECT 
                current_database() as database_name,
                current_user as current_user,
                inet_server_addr() as server_ip,
                inet_server_port() as server_port;
        """)
        
        info = cursor.fetchone()
        print("🔗 연결 정보:")
        print(f"  데이터베이스: {info['database_name']}")
        print(f"  현재 사용자: {info['current_user']}")
        print(f"  서버 IP: {info['server_ip']}")
        print(f"  서버 포트: {info['server_port']}")
        
        cursor.close()
        connection.close()
        
        print()
        print("🎉 데이터베이스 연결 테스트 성공!")
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ 연결 실패: {e}")
        print()
        print("🔧 해결 방법:")
        print("1. RDS 인스턴스가 'available' 상태인지 확인")
        print("2. 보안 그룹에서 내 IP가 허용되었는지 확인")
        print("3. 환경 변수가 올바르게 설정되었는지 확인")
        return False
        
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {e}")
        return False

def test_s3_access():
    """S3 접근 테스트"""
    try:
        import boto3
        from botocore.exceptions import ClientError
        
        print("🔍 S3 접근 테스트")
        
        s3_client = boto3.client('s3')
        bucket_name = 'redhorse-s3-frontend-0126'
        
        # 버킷 존재 확인
        try:
            s3_client.head_bucket(Bucket=bucket_name)
            print(f"✅ S3 버킷 접근 성공: {bucket_name}")
            
            # 폴더 구조 확인
            folders_to_check = ['audio/', 'schedule-images/', 'temp/']
            
            for folder in folders_to_check:
                try:
                    response = s3_client.list_objects_v2(
                        Bucket=bucket_name,
                        Prefix=folder,
                        MaxKeys=1
                    )
                    print(f"  📁 {folder} - 접근 가능")
                except ClientError:
                    print(f"  📁 {folder} - 폴더 없음 (자동 생성됨)")
            
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                print(f"❌ S3 버킷을 찾을 수 없습니다: {bucket_name}")
            elif error_code == '403':
                print(f"❌ S3 버킷 접근 권한이 없습니다: {bucket_name}")
            else:
                print(f"❌ S3 오류: {e}")
            return False
            
    except ImportError:
        print("⚠️  boto3가 설치되지 않았습니다.")
        print("설치: pip install boto3")
        return False
    except Exception as e:
        print(f"❌ S3 테스트 오류: {e}")
        return False

def main():
    print("=" * 50)
    print("🧪 AWS 리소스 연결 테스트")
    print("=" * 50)
    print()
    
    # .env 파일 로드
    load_env_file()
    print()
    
    # 데이터베이스 연결 테스트
    db_success = test_database_connection()
    print()
    
    # S3 접근 테스트
    s3_success = test_s3_access()
    print()
    
    # 결과 요약
    print("=" * 50)
    print("📊 테스트 결과 요약")
    print("=" * 50)
    print(f"데이터베이스 연결: {'✅ 성공' if db_success else '❌ 실패'}")
    print(f"S3 버킷 접근: {'✅ 성공' if s3_success else '❌ 실패'}")
    print()
    
    if db_success and s3_success:
        print("🎉 모든 테스트 통과! 백엔드 개발을 시작할 수 있습니다.")
        return 0
    else:
        print("⚠️  일부 테스트가 실패했습니다. 설정을 확인해주세요.")
        return 1

if __name__ == "__main__":
    sys.exit(main())