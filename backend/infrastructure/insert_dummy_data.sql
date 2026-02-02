-- 더미 데이터 삽입 스크립트
-- 테스트용 피로 위험도 데이터

-- 피로 위험도 더미 데이터 (오늘 날짜 기준)
INSERT INTO fatigue_assessments (user_id, assessment_date, sleep_hours, consecutive_night_shifts, commute_time, risk_level, risk_score, safety_recommendations)
VALUES 
    ('test-user-1', CURRENT_DATE, 5.5, 3, 30, 'medium', 55,
     '중간 수준의 피로 위험도입니다. 퇴근 후 운전 시 주의가 필요하며, 가능하면 대중교통을 이용하세요. 근무 전 15-30분 파워냅을 권장합니다.'),
    ('test-user-2', CURRENT_DATE, 7.0, 0, 20, 'low', 25,
     '낮은 피로 위험도입니다. 현재 컨디션이 양호하지만, 규칙적인 수면 패턴을 유지하세요.')
ON CONFLICT (user_id, assessment_date)
DO UPDATE SET
    sleep_hours = EXCLUDED.sleep_hours,
    consecutive_night_shifts = EXCLUDED.consecutive_night_shifts,
    commute_time = EXCLUDED.commute_time,
    risk_level = EXCLUDED.risk_level,
    risk_score = EXCLUDED.risk_score,
    safety_recommendations = EXCLUDED.safety_recommendations,
    updated_at = CURRENT_TIMESTAMP;

-- 어제 데이터도 추가 (히스토리 확인용)
INSERT INTO fatigue_assessments (user_id, assessment_date, sleep_hours, consecutive_night_shifts, commute_time, risk_level, risk_score, safety_recommendations)
VALUES 
    ('test-user-1', CURRENT_DATE - INTERVAL '1 day', 6.5, 2, 30, 'medium', 45,
     '중간 수준의 피로 위험도입니다. 충분한 휴식을 취하세요.')
ON CONFLICT (user_id, assessment_date) DO NOTHING;

-- 내일 데이터도 추가 (예측용)
INSERT INTO fatigue_assessments (user_id, assessment_date, sleep_hours, consecutive_night_shifts, commute_time, risk_level, risk_score, safety_recommendations)
VALUES 
    ('test-user-1', CURRENT_DATE + INTERVAL '1 day', 5.0, 4, 30, 'high', 75,
     '높은 피로 위험도가 예상됩니다. 충분한 수면과 휴식이 필요합니다.')
ON CONFLICT (user_id, assessment_date) DO NOTHING;
