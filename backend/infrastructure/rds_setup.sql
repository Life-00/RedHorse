-- PostgreSQL RDS 설정
-- 인스턴스 타입: db.t3.micro (프리티어 또는 저비용)
-- 스토리지: 20GB gp2 (최소 비용)
-- Multi-AZ: 비활성화 (개발 환경)

-- 데이터베이스 생성
CREATE DATABASE rhythm_fairy;

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

-- 체크리스트 테이블
CREATE TABLE checklists (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    task_date DATE NOT NULL,
    task_type VARCHAR(20) CHECK (task_type IN ('daily', 'jumpstart')) NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (user_id, task_date, task_type, task_name)
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

-- 오디오 파일 테이블
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
CREATE INDEX idx_checklists_user_date ON checklists(user_id, task_date);
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