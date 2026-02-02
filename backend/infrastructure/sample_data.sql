-- 샘플 데이터 삽입

-- 오디오 파일 데이터 (S3에 실제 파일이 있다고 가정)
INSERT INTO audio_files (file_name, file_type, title, description, duration_seconds, s3_key) VALUES
-- 명상 오디오
('meditation_1.mp3', 'meditation', '기본 호흡 명상', '초보자를 위한 기본 호흡 명상 가이드', 900, 'audio/meditation/meditation_1.mp3'),
('meditation_2.mp3', 'meditation', '바디 스캔 명상', '몸의 긴장을 풀어주는 바디 스캔 명상', 1200, 'audio/meditation/meditation_2.mp3'),
('meditation_3.mp3', 'meditation', '수면 유도 명상', '깊은 잠에 빠지도록 도와주는 명상', 1800, 'audio/meditation/meditation_3.mp3'),
('meditation_4.mp3', 'meditation', '스트레스 해소 명상', '교대근무 스트레스 해소를 위한 명상', 1500, 'audio/meditation/meditation_4.mp3'),

-- 백색소음 오디오
('rain.mp3', 'whitenoise', '빗소리', '차분한 빗소리로 집중력 향상', 3600, 'audio/whitenoise/rain.mp3'),
('ocean.mp3', 'whitenoise', '파도소리', '바다 파도소리로 마음의 평안', 3600, 'audio/whitenoise/ocean.mp3'),
('forest.mp3', 'whitenoise', '숲속소리', '새소리와 바람소리가 어우러진 숲속', 3600, 'audio/whitenoise/forest.mp3'),
('cafe.mp3', 'whitenoise', '카페 소음', '집중력을 높여주는 카페 배경음', 3600, 'audio/whitenoise/cafe.mp3'),
('fan.mp3', 'whitenoise', '선풍기 소리', '일정한 선풍기 소리로 숙면 유도', 3600, 'audio/whitenoise/fan.mp3');

-- 테스트용 사용자 데이터 (실제 Cognito 사용자 생성 후 추가)
-- INSERT INTO users (user_id, email, name, work_type, commute_time, wearable_device, onboarding_completed) VALUES
-- ('test-user-1', 'test@example.com', '테스트 사용자', '2shift', 30, 'none', true);

-- 테스트용 스케줄 데이터 (사용자 생성 후 추가)
-- INSERT INTO schedules (user_id, work_date, shift_type, start_time, end_time) VALUES
-- ('test-user-1', '2026-01-27', 'day', '08:00', '17:00'),
-- ('test-user-1', '2026-01-28', 'night', '22:00', '07:00'),
-- ('test-user-1', '2026-01-29', 'off', NULL, NULL);

-- 기본 점프스타트 템플릿 데이터
-- 사용자별로 동적 생성되는 데이터 예시

-- Now 블록 (15분)
-- INSERT INTO jumpstart_blocks (user_id, block_date, block_type, block_name, total_duration, total_tasks) VALUES
-- ('test-user-1', '2026-01-27', 'now', 'Now', 15, 2);

-- Must-do 블록 (90분)  
-- INSERT INTO jumpstart_blocks (user_id, block_date, block_type, block_name, total_duration, total_tasks) VALUES
-- ('test-user-1', '2026-01-27', 'must_do', 'Must-do', 90, 3);

-- Recovery 블록 (10분)
-- INSERT INTO jumpstart_blocks (user_id, block_date, block_type, block_name, total_duration, total_tasks) VALUES
-- ('test-user-1', '2026-01-27', 'recovery', 'Recovery', 10, 2);

-- 점프스타트 작업 예시
-- Now 블록 작업들
-- INSERT INTO jumpstart_tasks (block_id, user_id, task_date, task_name, duration_minutes, task_order) VALUES
-- (1, 'test-user-1', '2026-01-27', '밝은 빛 노출 (햇빛 또는 블루라이트)', 10, 1),
-- (1, 'test-user-1', '2026-01-27', '가벼운 스트레칭', 5, 2);

-- Must-do 블록 작업들  
-- INSERT INTO jumpstart_tasks (block_id, user_id, task_date, task_name, duration_minutes, task_order) VALUES
-- (2, 'test-user-1', '2026-01-27', '메인 수면 (최우선)', 60, 1),
-- (2, 'test-user-1', '2026-01-27', '식사 (단백질 중심)', 20, 2),
-- (2, 'test-user-1', '2026-01-27', '통근 준비', 10, 3);

-- Recovery 블록 작업들
-- INSERT INTO jumpstart_tasks (block_id, user_id, task_date, task_name, duration_minutes, task_order) VALUES
-- (3, 'test-user-1', '2026-01-27', '근육 전 파워냅', 15, 1),
-- (3, 'test-user-1', '2026-01-27', '심호흡 및 마인드풀니스', 5, 2);

-- 홈화면 일일 체크리스트 (3개 항목)
-- INSERT INTO daily_checklists (user_id, task_date, task_name) VALUES
-- ('test-user-1', '2026-01-27', '충분한 수분 섭취'),
-- ('test-user-1', '2026-01-27', '규칙적인 식사'),
-- ('test-user-1', '2026-01-27', '적절한 운동');