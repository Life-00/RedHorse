-- 추가 필요한 테이블들

-- 수면 계획 테이블 (AI 생성)
CREATE TABLE sleep_plans (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    plan_date DATE NOT NULL,
    main_sleep_start TIME NOT NULL,
    main_sleep_end TIME NOT NULL,
    main_sleep_duration INTEGER NOT NULL, -- 분 단위
    nap_start TIME,
    nap_end TIME,
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

-- 인덱스 추가
CREATE INDEX idx_sleep_plans_user_date ON sleep_plans(user_id, plan_date);
CREATE INDEX idx_caffeine_plans_user_date ON caffeine_plans(user_id, plan_date);
CREATE INDEX idx_fatigue_assessments_user_date ON fatigue_assessments(user_id, assessment_date);
CREATE INDEX idx_schedule_images_user ON schedule_images(user_id);
CREATE INDEX idx_schedule_images_status ON schedule_images(upload_status);

-- 업데이트 트리거 적용
CREATE TRIGGER update_sleep_plans_updated_at BEFORE UPDATE ON sleep_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_caffeine_plans_updated_at BEFORE UPDATE ON caffeine_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fatigue_assessments_updated_at BEFORE UPDATE ON fatigue_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();