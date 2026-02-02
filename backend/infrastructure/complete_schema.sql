-- PostgreSQL 테이블 스키마
-- 데이터베이스: rhythm_fairy (이미 생성됨)

-- 기본 테이블들

-- 사용자 테이블
CREATE TABLE users (
    user_id VARCHAR(255) PRIMARY KEY,  -- Cognito user ID
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    work_type VARCHAR(20) CHECK (work_type IN ('2shift', '3shift', 'fixed_night', 'irregular')),
    commute_time INTEGER DEFAULT 30,
    wearable_device VARCHAR(20) CHECK (wearable_device IN ('apple', 'google', 'galaxy', 'none')),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 근무 스케줄 테이블
CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    work_date DATE NOT NULL,
    shift_type VARCHAR(20) CHECK (shift_type IN ('day', 'evening', 'night', 'off')) NOT NULL,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (user_id, work_date)
);

-- OCR 업로드 이미지 메타데이터 테이블
CREATE TABLE schedule_images (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    file_size INTEGER,
    upload_status VARCHAR(20) CHECK (upload_status IN ('uploaded', 'processing', 'processed', 'failed')) DEFAULT 'uploaded',
    ocr_result JSONB, -- OCR 파싱 결과 JSON
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 수면 계획 테이블 (AI 생성)
CREATE TABLE sleep_plans (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    plan_date DATE NOT NULL,
    main_sleep_start TIMESTAMP WITH TIME ZONE NOT NULL,
    main_sleep_end TIMESTAMP WITH TIME ZONE NOT NULL,
    main_sleep_duration INTEGER NOT NULL, -- 분 단위
    nap_start TIMESTAMP WITH TIME ZONE,
    nap_end TIMESTAMP WITH TIME ZONE,
    nap_duration INTEGER, -- 분 단위
    rationale TEXT, -- AI가 생성한 근거 설명
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (user_id, plan_date)
);

-- 카페인 계획 테이블 (AI 생성)
CREATE TABLE caffeine_plans (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    plan_date DATE NOT NULL,
    cutoff_time TIME NOT NULL,
    max_intake_mg INTEGER DEFAULT 400, -- 최대 카페인 섭취량 (mg)
    recommendations TEXT, -- AI 추천사항
    alternative_methods TEXT, -- 대체 각성 방법
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (user_id, plan_date)
);

-- 피로 위험도 테이블 (백엔드 계산)
CREATE TABLE fatigue_assessments (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    assessment_date DATE NOT NULL,
    sleep_hours DECIMAL(3,1) NOT NULL, -- 수면 시간 (시간.분)
    consecutive_night_shifts INTEGER DEFAULT 0,
    commute_time INTEGER NOT NULL, -- 분 단위
    risk_level VARCHAR(10) CHECK (risk_level IN ('low', 'medium', 'high')) NOT NULL,
    risk_score INTEGER NOT NULL, -- 0-100 점수
    safety_recommendations TEXT, -- 안전 권장사항
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (user_id, assessment_date)
);

-- 점프스타트 블록 테이블
CREATE TABLE jumpstart_blocks (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    block_date DATE NOT NULL,
    block_type VARCHAR(20) CHECK (block_type IN ('now', 'must_do', 'recovery')) NOT NULL,
    block_name VARCHAR(50) NOT NULL, -- 'Now', 'Must-do', 'Recovery'
    total_duration INTEGER NOT NULL, -- 총 예상 시간 (분)
    completed_tasks INTEGER DEFAULT 0, -- 완료된 작업 수
    total_tasks INTEGER NOT NULL, -- 전체 작업 수
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (user_id, block_date, block_type)
);

-- 점프스타트 작업 테이블 (기존 checklists 대체)
CREATE TABLE jumpstart_tasks (
    id SERIAL PRIMARY KEY,
    block_id INTEGER NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    task_date DATE NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    duration_minutes INTEGER NOT NULL, -- 예상 소요 시간
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    task_order INTEGER NOT NULL, -- 작업 순서
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id) REFERENCES jumpstart_blocks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (user_id, task_date, block_id, task_order)
);

-- 일일 체크리스트 테이블 (홈화면용 - 별도 유지)
CREATE TABLE daily_checklists (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    task_date DATE NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (user_id, task_date, task_name)
);

-- AI 상담 내역 테이블
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 오디오 파일 테이블 (이완 & 휴식)
CREATE TABLE audio_files (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) CHECK (file_type IN ('meditation', 'whitenoise')) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_seconds INTEGER,
    s3_key VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_schedules_user_date ON schedules(user_id, work_date);
CREATE INDEX idx_schedule_images_user ON schedule_images(user_id);
CREATE INDEX idx_schedule_images_status ON schedule_images(upload_status);
CREATE INDEX idx_sleep_plans_user_date ON sleep_plans(user_id, plan_date);
CREATE INDEX idx_caffeine_plans_user_date ON caffeine_plans(user_id, plan_date);
CREATE INDEX idx_fatigue_assessments_user_date ON fatigue_assessments(user_id, assessment_date);
CREATE INDEX idx_jumpstart_blocks_user_date ON jumpstart_blocks(user_id, block_date);
CREATE INDEX idx_jumpstart_tasks_user_date ON jumpstart_tasks(user_id, task_date);
CREATE INDEX idx_jumpstart_tasks_block ON jumpstart_tasks(block_id);
CREATE INDEX idx_daily_checklists_user_date ON daily_checklists(user_id, task_date);
CREATE INDEX idx_chat_history_user ON chat_history(user_id);
CREATE INDEX idx_audio_files_type ON audio_files(file_type);

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 업데이트 트리거 적용
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sleep_plans_updated_at BEFORE UPDATE ON sleep_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_caffeine_plans_updated_at BEFORE UPDATE ON caffeine_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fatigue_assessments_updated_at BEFORE UPDATE ON fatigue_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jumpstart_blocks_updated_at BEFORE UPDATE ON jumpstart_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();