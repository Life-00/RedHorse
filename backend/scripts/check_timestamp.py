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

# 테이블 스키마 확인
print("="*60)
print("📋 sleep_plans 테이블 스키마:")
print("="*60)
cursor.execute("""
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'sleep_plans'
    ORDER BY ordinal_position
""")

for row in cursor.fetchall():
    print(f"  {row[0]:<25} {row[1]:<30} NULL: {row[2]}")

# 실제 데이터 확인
print("\n" + "="*60)
print("📊 실제 데이터 (TIMESTAMP 전체 표시):")
print("="*60)
cursor.execute("""
    SELECT 
        id, 
        plan_date,
        main_sleep_start,
        main_sleep_end,
        nap_start,
        nap_end
    FROM sleep_plans
    WHERE user_id = 'e478f488-f0a1-703a-17ab-462c0c3f5012'
    ORDER BY plan_date DESC
    LIMIT 3
""")

for row in cursor.fetchall():
    print(f"\nID: {row[0]}, Date: {row[1]}")
    print(f"  메인 수면 시작: {row[2]}")
    print(f"  메인 수면 종료: {row[3]}")
    if row[4]:
        print(f"  낮잠 시작: {row[4]}")
        print(f"  낮잠 종료: {row[5]}")

cursor.close()
conn.close()
