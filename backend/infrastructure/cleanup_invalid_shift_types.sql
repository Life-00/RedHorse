-- 교대 근무 유형 불일치 데이터 정리 스크립트
-- 
-- 이 스크립트는 사용자의 work_type에 맞지 않는 shift_type을 'off'로 변경합니다.
-- 
-- 실행 전 주의사항:
-- 1. 프로덕션 데이터베이스 백업 필수
-- 2. 테스트 환경에서 먼저 실행 권장
-- 3. 영향받는 레코드 수를 먼저 확인

-- ============================================
-- 1. 영향받는 레코드 확인 (실행 전 확인용)
-- ============================================

-- 2교대 사용자의 evening 교대 확인
SELECT 
    s.id,
    s.user_id,
    u.name,
    s.work_date,
    s.shift_type,
    u.work_type
FROM schedules s
JOIN users u ON s.user_id = u.user_id
WHERE u.work_type = '2shift'
  AND s.shift_type = 'evening';

-- 고정 야간 사용자의 day/evening 교대 확인
SELECT 
    s.id,
    s.user_id,
    u.name,
    s.work_date,
    s.shift_type,
    u.work_type
FROM schedules s
JOIN users u ON s.user_id = u.user_id
WHERE u.work_type = 'fixed_night'
  AND s.shift_type IN ('day', 'evening');

-- ============================================
-- 2. 데이터 정리 (실제 업데이트)
-- ============================================

-- 2교대 사용자의 evening 교대를 off로 변경
UPDATE schedules s
SET 
    shift_type = 'off',
    start_time = NULL,
    end_time = NULL,
    updated_at = CURRENT_TIMESTAMP
FROM users u
WHERE s.user_id = u.user_id
  AND u.work_type = '2shift'
  AND s.shift_type = 'evening';

-- 고정 야간 사용자의 day/evening 교대를 off로 변경
UPDATE schedules s
SET 
    shift_type = 'off',
    start_time = NULL,
    end_time = NULL,
    updated_at = CURRENT_TIMESTAMP
FROM users u
WHERE s.user_id = u.user_id
  AND u.work_type = 'fixed_night'
  AND s.shift_type IN ('day', 'evening');

-- ============================================
-- 3. 정리 결과 확인
-- ============================================

-- 2교대 사용자의 교대 타입 분포 확인
SELECT 
    u.work_type,
    s.shift_type,
    COUNT(*) as count
FROM schedules s
JOIN users u ON s.user_id = u.user_id
WHERE u.work_type = '2shift'
GROUP BY u.work_type, s.shift_type
ORDER BY s.shift_type;

-- 고정 야간 사용자의 교대 타입 분포 확인
SELECT 
    u.work_type,
    s.shift_type,
    COUNT(*) as count
FROM schedules s
JOIN users u ON s.user_id = u.user_id
WHERE u.work_type = 'fixed_night'
GROUP BY u.work_type, s.shift_type
ORDER BY s.shift_type;

-- ============================================
-- 4. 전체 사용자별 교대 타입 검증
-- ============================================

-- 각 work_type별 허용되지 않는 shift_type 확인
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
ORDER BY u.work_type, s.shift_type;
