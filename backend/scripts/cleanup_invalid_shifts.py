#!/usr/bin/env python3
"""
교대 근무 유형 불일치 데이터 정리 스크립트

사용자의 work_type에 맞지 않는 shift_type을 'off'로 변경합니다.

사용법:
    python cleanup_invalid_shifts.py --dry-run  # 영향받는 레코드만 확인
    python cleanup_invalid_shifts.py            # 실제 업데이트 실행
"""

import os
import sys
import argparse
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# 근무 유형별 허용 교대 타입 매핑
WORK_TYPE_SHIFT_MAPPING = {
    '2shift': ['day', 'night', 'off'],
    '3shift': ['day', 'evening', 'night', 'off'],
    'fixed_night': ['night', 'off'],
    'irregular': ['day', 'evening', 'night', 'off']
}

def get_db_connection():
    """데이터베이스 연결"""
    return psycopg2.connect(
        host=os.environ['DB_HOST'],
        port=os.environ.get('DB_PORT', '5432'),
        database=os.environ.get('DB_NAME', 'rhythm_fairy'),
        user=os.environ.get('DB_USER', 'postgres'),
        password=os.environ['DB_PASSWORD']
    )

def check_invalid_schedules(conn):
    """허용되지 않는 교대 타입 확인"""
    print("\n" + "="*80)
    print("허용되지 않는 교대 타입 확인")
    print("="*80 + "\n")
    
    query = """
    SELECT 
        u.work_type,
        s.shift_type,
        COUNT(*) as invalid_count,
        STRING_AGG(DISTINCT u.name, ', ') as affected_users
    FROM schedules s
    JOIN users u ON s.user_id = u.user_id
    WHERE 
        -- 2교대: evening 불가
        (u.work_type = '2shift' AND s.shift_type = 'evening')
        OR
        -- 고정 야간: day, evening 불가
        (u.work_type = 'fixed_night' AND s.shift_type IN ('day', 'evening'))
    GROUP BY u.work_type, s.shift_type
    ORDER BY u.work_type, s.shift_type
    """
    
    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(query)
        results = cursor.fetchall()
        
        if not results:
            print("✅ 허용되지 않는 교대 타입이 없습니다!")
            return 0
        
        total_count = 0
        for row in results:
            print(f"❌ {row['work_type']} 사용자의 {row['shift_type']} 교대: {row['invalid_count']}개")
            print(f"   영향받는 사용자: {row['affected_users']}")
            total_count += row['invalid_count']
        
        print(f"\n총 {total_count}개의 잘못된 레코드가 발견되었습니다.")
        return total_count

def cleanup_invalid_schedules(conn, dry_run=True):
    """허용되지 않는 교대 타입을 'off'로 변경"""
    
    if dry_run:
        print("\n🔍 DRY RUN 모드: 실제 변경은 하지 않습니다.\n")
    else:
        print("\n⚠️  실제 데이터를 변경합니다!\n")
    
    # 2교대 사용자의 evening 교대 처리
    query_2shift = """
    UPDATE schedules s
    SET 
        shift_type = 'off',
        start_time = NULL,
        end_time = NULL,
        updated_at = CURRENT_TIMESTAMP
    FROM users u
    WHERE s.user_id = u.user_id
      AND u.work_type = '2shift'
      AND s.shift_type = 'evening'
    """
    
    # 고정 야간 사용자의 day/evening 교대 처리
    query_fixed_night = """
    UPDATE schedules s
    SET 
        shift_type = 'off',
        start_time = NULL,
        end_time = NULL,
        updated_at = CURRENT_TIMESTAMP
    FROM users u
    WHERE s.user_id = u.user_id
      AND u.work_type = 'fixed_night'
      AND s.shift_type IN ('day', 'evening')
    """
    
    with conn.cursor() as cursor:
        if not dry_run:
            # 2교대 처리
            cursor.execute(query_2shift)
            count_2shift = cursor.rowcount
            print(f"✅ 2교대 사용자: {count_2shift}개 레코드 업데이트")
            
            # 고정 야간 처리
            cursor.execute(query_fixed_night)
            count_fixed = cursor.rowcount
            print(f"✅ 고정 야간 사용자: {count_fixed}개 레코드 업데이트")
            
            conn.commit()
            print(f"\n총 {count_2shift + count_fixed}개 레코드가 업데이트되었습니다.")
        else:
            print("DRY RUN 모드이므로 실제 변경은 하지 않았습니다.")
            print("실제 변경하려면 --no-dry-run 옵션을 사용하세요.")

def verify_cleanup(conn):
    """정리 결과 검증"""
    print("\n" + "="*80)
    print("정리 결과 검증")
    print("="*80 + "\n")
    
    # 각 work_type별 교대 타입 분포 확인
    query = """
    SELECT 
        u.work_type,
        s.shift_type,
        COUNT(*) as count
    FROM schedules s
    JOIN users u ON s.user_id = u.user_id
    GROUP BY u.work_type, s.shift_type
    ORDER BY u.work_type, s.shift_type
    """
    
    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(query)
        results = cursor.fetchall()
        
        current_work_type = None
        for row in results:
            if row['work_type'] != current_work_type:
                current_work_type = row['work_type']
                print(f"\n{current_work_type}:")
            
            allowed = WORK_TYPE_SHIFT_MAPPING.get(current_work_type, [])
            status = "✅" if row['shift_type'] in allowed else "❌"
            print(f"  {status} {row['shift_type']}: {row['count']}개")

def main():
    parser = argparse.ArgumentParser(description='교대 근무 유형 불일치 데이터 정리')
    parser.add_argument('--dry-run', action='store_true', default=True,
                        help='영향받는 레코드만 확인 (기본값)')
    parser.add_argument('--no-dry-run', action='store_true',
                        help='실제 데이터 업데이트 실행')
    
    args = parser.parse_args()
    dry_run = not args.no_dry_run
    
    try:
        print("\n" + "="*80)
        print("교대 근무 유형 불일치 데이터 정리 스크립트")
        print("="*80)
        print(f"실행 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"모드: {'DRY RUN (확인만)' if dry_run else '실제 업데이트'}")
        print("="*80)
        
        # 데이터베이스 연결
        conn = get_db_connection()
        print("✅ 데이터베이스 연결 성공")
        
        # 1. 잘못된 레코드 확인
        invalid_count = check_invalid_schedules(conn)
        
        if invalid_count == 0:
            print("\n정리할 데이터가 없습니다.")
            return
        
        # 2. 정리 실행
        if not dry_run:
            response = input(f"\n{invalid_count}개의 레코드를 'off'로 변경하시겠습니까? (yes/no): ")
            if response.lower() != 'yes':
                print("작업이 취소되었습니다.")
                return
        
        cleanup_invalid_schedules(conn, dry_run)
        
        # 3. 결과 검증
        if not dry_run:
            verify_cleanup(conn)
        
        conn.close()
        print("\n✅ 작업 완료!")
        
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
