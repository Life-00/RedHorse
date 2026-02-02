#!/usr/bin/env python3
"""
데이터베이스 마이그레이션 실행 스크립트
"""
import os
import sys
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

# .env 파일 로드
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

def run_migration():
    """마이그레이션 SQL 파일 실행"""
    try:
        # 데이터베이스 연결
        conn = psycopg2.connect(
            host=os.environ['DB_HOST'],
            port=os.environ.get('DB_PORT', '5432'),
            database=os.environ.get('DB_NAME', 'rhythm_fairy'),
            user=os.environ.get('DB_USER', 'postgres'),
            password=os.environ['DB_PASSWORD']
        )
        
        print("✅ 데이터베이스 연결 성공")
        
        # 마이그레이션 파일 읽기
        migration_file = Path(__file__).parent.parent / 'infrastructure' / 'migrate_sleep_plans_to_timestamp.sql'
        
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        print(f"📄 마이그레이션 파일 로드: {migration_file}")
        
        # 마이그레이션 실행
        cursor = conn.cursor()
        
        # SQL 문을 세미콜론으로 분리하여 실행
        statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]
        
        for i, statement in enumerate(statements, 1):
            if statement:
                print(f"\n🔄 실행 중 ({i}/{len(statements)})...")
                try:
                    cursor.execute(statement)
                    conn.commit()
                    print(f"✅ 완료")
                except Exception as e:
                    print(f"⚠️  경고: {e}")
                    conn.rollback()
        
        # 결과 확인
        cursor.execute("""
            SELECT 
                id, user_id, plan_date,
                main_sleep_start::TEXT, main_sleep_end::TEXT,
                nap_start::TEXT, nap_end::TEXT
            FROM sleep_plans
            ORDER BY id
            LIMIT 5
        """)
        
        results = cursor.fetchall()
        
        print("\n" + "="*50)
        print("📊 마이그레이션 결과 확인")
        print("="*50)
        
        if results:
            print(f"\n✅ {len(results)}개의 레코드 확인:")
            for row in results:
                print(f"  ID: {row[0]}, User: {row[1]}, Date: {row[2]}")
                print(f"    메인 수면: {row[3]} ~ {row[4]}")
                if row[5]:
                    print(f"    낮잠: {row[5]} ~ {row[6]}")
        else:
            print("\nℹ️  기존 데이터 없음 (새로운 테이블)")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 마이그레이션 완료!")
        
    except Exception as e:
        print(f"\n❌ 마이그레이션 실패: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("="*50)
    print("🔄 데이터베이스 마이그레이션 시작")
    print("="*50)
    print("\n⚠️  주의: 이 작업은 sleep_plans 테이블을 재생성합니다.")
    print("계속하시겠습니까? (y/n): ", end='')
    
    response = input().strip().lower()
    
    if response == 'y':
        run_migration()
    else:
        print("\n❌ 마이그레이션 취소됨")
        sys.exit(0)
