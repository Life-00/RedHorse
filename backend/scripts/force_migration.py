#!/usr/bin/env python3
import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

conn = psycopg2.connect(
    host=os.environ['DB_HOST'],
    port=os.environ.get('DB_PORT', '5432'),
    database=os.environ.get('DB_NAME', 'rhythm_fairy'),
    user=os.environ.get('DB_USER', 'postgres'),
    password=os.environ['DB_PASSWORD']
)

cursor = conn.cursor()

print("="*60)
print("🔄 강제 마이그레이션 시작")
print("="*60)

# 1. 백업 테이블 생성
print("\n1️⃣  기존 데이터 백업 중...")
cursor.execute("DROP TABLE IF EXISTS sleep_plans_backup CASCADE")
cursor.execute("CREATE TABLE sleep_plans_backup AS SELECT * FROM sleep_plans")
conn.commit()
print("✅ 백업 완료")

# 2. 기존 테이블 삭제
print("\n2️⃣  기존 테이블 삭제 중...")
cursor.execute("DROP TABLE IF EXISTS sleep_plans CASCADE")
conn.commit()
print("✅ 삭제 완료")

# 3. 새 테이블 생성
print("\n3️⃣  새 테이블 생성 중 (TIMESTAMP 타입)...")
cursor.execute("""
CREATE TABLE sleep_plans (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    plan_date DATE NOT NULL,
    main_sleep_start TIMESTAMP WITH TIME ZONE NOT NULL,
    main_sleep_end TIMESTAMP WITH TIME ZONE NOT NULL,
    main_sleep_duration INTEGER NOT NULL,
    nap_start TIMESTAMP WITH TIME ZONE,
    nap_end TIMESTAMP WITH TIME ZONE,
    nap_duration INTEGER,
    rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (user_id, plan_date)
)
""")
conn.commit()
print("✅ 생성 완료")

# 4. 데이터 복원
print("\n4️⃣  데이터 복원 중 (TIME → TIMESTAMP 변환)...")
cursor.execute("""
INSERT INTO sleep_plans (
    id, user_id, plan_date, 
    main_sleep_start, main_sleep_end, main_sleep_duration,
    nap_start, nap_end, nap_duration,
    rationale, created_at, updated_at
)
SELECT 
    id, user_id, plan_date,
    (plan_date::TIMESTAMP + main_sleep_start::TIME) AT TIME ZONE 'UTC',
    CASE 
        WHEN main_sleep_end::TIME < main_sleep_start::TIME THEN 
            ((plan_date::TIMESTAMP + INTERVAL '1 day') + main_sleep_end::TIME) AT TIME ZONE 'UTC'
        ELSE 
            (plan_date::TIMESTAMP + main_sleep_end::TIME) AT TIME ZONE 'UTC'
    END,
    main_sleep_duration,
    CASE 
        WHEN nap_start IS NOT NULL THEN 
            (plan_date::TIMESTAMP + nap_start::TIME) AT TIME ZONE 'UTC'
        ELSE NULL
    END,
    CASE 
        WHEN nap_end IS NOT NULL THEN 
            CASE 
                WHEN nap_end::TIME < nap_start::TIME THEN 
                    ((plan_date::TIMESTAMP + INTERVAL '1 day') + nap_end::TIME) AT TIME ZONE 'UTC'
                ELSE 
                    (plan_date::TIMESTAMP + nap_end::TIME) AT TIME ZONE 'UTC'
            END
        ELSE NULL
    END,
    nap_duration,
    rationale, created_at, updated_at
FROM sleep_plans_backup
""")
conn.commit()
print("✅ 복원 완료")

# 5. 시퀀스 재설정
print("\n5️⃣  시퀀스 재설정 중...")
cursor.execute("SELECT setval('sleep_plans_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sleep_plans))")
conn.commit()
print("✅ 재설정 완료")

# 6. 결과 확인
print("\n6️⃣  결과 확인 중...")
cursor.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'sleep_plans' AND column_name LIKE '%sleep%'
""")
print("\n📋 컬럼 타입:")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]}")

cursor.execute("""
    SELECT 
        id, plan_date,
        main_sleep_start,
        main_sleep_end
    FROM sleep_plans
    ORDER BY plan_date DESC
    LIMIT 3
""")
print("\n📊 샘플 데이터:")
for row in cursor.fetchall():
    print(f"  ID {row[0]}, {row[1]}: {row[2]} ~ {row[3]}")

cursor.close()
conn.close()

print("\n" + "="*60)
print("🎉 마이그레이션 완료!")
print("="*60)
