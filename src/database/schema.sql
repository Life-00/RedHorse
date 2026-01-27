-- 교대근무자 수면 최적화 백엔드 시스템 데이터베이스 스키마
-- PostgreSQL 14+ 기준
-- 리전: us-east-1
-- 암호화: RDS 기본 암호화 적용

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- 1. users (사용자 프로필)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_sub VARCHAR(255) UNIQUE NOT NULL, -- Cognito User Pool subject
    shift_type VARCHAR(20) NOT NULL CHECK (shift_type IN ('TWO_SHIFT', 'THREE_SHIFT', 'FIXED_NIGHT', 'IRREGULAR')),
    commute_min INTEGER NOT NULL CHECK (commute_min >= 0 AND commute_min <= 240),
    wearable_connected BOOLEAN DEFAULT FALSE,
    org_id VARCHAR(255), -- B2B 조직 ID (V2)
    last_active_at TIMESTAMPTZ DEFAULT NOW(), -- ADR-009: 활성 사용자 정의
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_users_cognito_sub ON users(cognito_sub);
CREATE INDEX idx_users_org_id ON users(org_id); -- B2B 조회용 (V2)
CREATE INDEX idx_users_last_active ON users(last_active_at); -- 배치 작업용

-- 2. shift_schedules (근무표)
CREATE TABLE shift_schedules (
    schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift_type VARCHAR(10) NOT NULL CHECK (shift_type IN ('DAY', 'MID', 'NIGHT', 'OFF')),
    start_at TIMESTAMPTZ, -- OFF일 때 NULL
    end_at TIMESTAMPTZ,   -- OFF일 때 NULL
    commute_min INTEGER NOT NULL CHECK (commute_min >= 0 AND commute_min <= 240),
    note TEXT CHECK (LENGTH(note) <= 200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 제약 조건
    CONSTRAINT unique_user_date UNIQUE (user_id, date),
    CONSTRAINT valid_work_hours CHECK (
        (shift_type = 'OFF' AND start_at IS NULL AND end_at IS NULL) OR
        (shift_type != 'OFF' AND start_at IS NOT NULL AND end_at IS NOT NULL AND 
         EXTRACT(EPOCH FROM (end_at - start_at))/3600 BETWEEN 4 AND 16)
    )
);

-- 인덱스 (ADR-004: 커서 기반 페이지네이션)
CREATE INDEX idx_schedules_user_date ON shift_schedules(user_id, date);
CREATE INDEX idx_schedules_date_range ON shift_schedules(user_id, date) WHERE shift_type != 'OFF';
CREATE INDEX idx_schedules_cursor ON shift_schedules(user_id, date, schedule_id); -- 커서 기반 페이지네이션용

-- 3. engine_cache (엔진 계산 캐시) - ADR-003: TTL 48시간
CREATE TABLE engine_cache (
    cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    engine_type VARCHAR(20) NOT NULL CHECK (engine_type IN ('SHIFT_TO_SLEEP', 'CAFFEINE_CUTOFF', 'FATIGUE_RISK')),
    target_date DATE NOT NULL,
    result JSONB NOT NULL, -- 엔진별 결과 데이터
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
    
    -- 제약 조건
    CONSTRAINT unique_user_engine_date UNIQUE (user_id, engine_type, target_date)
);

-- 인덱스
CREATE INDEX idx_cache_user_engine_date ON engine_cache(user_id, engine_type, target_date);
CREATE INDEX idx_cache_expires_at ON engine_cache(expires_at); -- TTL 정리용
CREATE INDEX idx_cache_generated_at ON engine_cache(generated_at); -- 배치 작업용

-- 4. file_metadata (파일 메타데이터)
CREATE TABLE file_metadata (
    file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('SHIFT_SCHEDULE', 'WEARABLE_DATA', 'ATTACHMENT')),
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    s3_key VARCHAR(500) NOT NULL, -- S3 객체 키
    status VARCHAR(20) DEFAULT 'UPLOADING' CHECK (status IN ('UPLOADING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_files_user_type ON file_metadata(uploaded_by, file_type);
CREATE INDEX idx_files_status ON file_metadata(status);
CREATE INDEX idx_files_s3_key ON file_metadata(s3_key);

-- 5. jumpstart_checklists (점프스타트 체크리스트)
CREATE TABLE jumpstart_checklists (
    checklist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    item_key VARCHAR(100) NOT NULL, -- 체크리스트 항목 식별자
    title VARCHAR(200) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 제약 조건
    CONSTRAINT unique_user_item UNIQUE (user_id, item_key)
);

-- 인덱스
CREATE INDEX idx_checklist_user ON jumpstart_checklists(user_id);
CREATE INDEX idx_checklist_completed ON jumpstart_checklists(user_id, completed);

-- 6. b2b_stats_aggregates (B2B 통계 집계 - V2) - ADR-007: 3명 미만 그룹 제외
CREATE TABLE b2b_stats_aggregates (
    aggregate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id VARCHAR(255) NOT NULL,
    period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    group_by VARCHAR(50), -- 'shift_type', 'department' 등
    group_value VARCHAR(100),
    metric_name VARCHAR(50) NOT NULL, -- 'avg_sleep_hours', 'fatigue_score' 등
    metric_value DECIMAL(10,2) NOT NULL,
    participant_count INTEGER NOT NULL CHECK (participant_count >= 3), -- 최소 3명
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 제약 조건
    CONSTRAINT unique_org_period_metric UNIQUE (org_id, period_type, period_start, group_by, group_value, metric_name)
);

-- 인덱스
CREATE INDEX idx_b2b_stats_org_period ON b2b_stats_aggregates(org_id, period_type, period_start);
CREATE INDEX idx_b2b_stats_participant_count ON b2b_stats_aggregates(participant_count);

-- 7. system_logs (시스템 로그 - 관측가능성)
CREATE TABLE system_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id VARCHAR(255) NOT NULL,
    level VARCHAR(10) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
    service VARCHAR(50) NOT NULL, -- Lambda 함수명
    message TEXT NOT NULL,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    duration INTEGER, -- 처리 시간 (ms)
    error_details JSONB, -- 에러 상세 정보
    metadata JSONB, -- 추가 메타데이터
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_logs_correlation_id ON system_logs(correlation_id);
CREATE INDEX idx_logs_level_created ON system_logs(level, created_at);
CREATE INDEX idx_logs_service_created ON system_logs(service, created_at);
CREATE INDEX idx_logs_user_created ON system_logs(user_id, created_at);

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 적용
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_schedules_updated_at BEFORE UPDATE ON shift_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_metadata_updated_at BEFORE UPDATE ON file_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 뷰: 활성 사용자 (ADR-009: 7일 이내 활동)
CREATE VIEW active_users AS
SELECT user_id, cognito_sub, shift_type, commute_min, wearable_connected, org_id, last_active_at
FROM users 
WHERE last_active_at >= NOW() - INTERVAL '7 days';

-- 뷰: 유효한 캐시 (TTL 고려)
CREATE VIEW valid_engine_cache AS
SELECT cache_id, user_id, engine_type, target_date, result, generated_at, expires_at
FROM engine_cache 
WHERE expires_at > NOW();

-- 함수: 캐시 TTL 정리 (배치 작업용)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM engine_cache WHERE expires_at < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    INSERT INTO system_logs (correlation_id, level, service, message, metadata, created_at)
    VALUES (
        'cache-cleanup-' || extract(epoch from now())::text,
        'INFO',
        'cache-cleanup',
        'Expired cache cleanup completed',
        jsonb_build_object('deleted_count', deleted_count),
        NOW()
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 함수: 근무표 겹침 검증
CREATE OR REPLACE FUNCTION check_schedule_overlap(
    p_user_id UUID,
    p_date DATE,
    p_start_at TIMESTAMPTZ,
    p_end_at TIMESTAMPTZ,
    p_exclude_schedule_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    overlap_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO overlap_count
    FROM shift_schedules 
    WHERE user_id = p_user_id 
      AND date = p_date 
      AND shift_type != 'OFF'
      AND (start_at, end_at) OVERLAPS (p_start_at, p_end_at)
      AND (p_exclude_schedule_id IS NULL OR schedule_id != p_exclude_schedule_id);
    
    RETURN overlap_count > 0;
END;
$$ LANGUAGE plpgsql;

-- 함수: 사용자 활성도 업데이트 (API 호출 시마다 실행)
CREATE OR REPLACE FUNCTION update_user_activity(p_cognito_sub VARCHAR(255))
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET last_active_at = NOW() 
    WHERE cognito_sub = p_cognito_sub;
END;
$$ LANGUAGE plpgsql;

-- 초기 데이터: 기본 점프스타트 체크리스트 템플릿
INSERT INTO jumpstart_checklists (user_id, item_key, title, description) 
SELECT 
    '00000000-0000-0000-0000-000000000000'::UUID, -- 템플릿용 더미 UUID
    item_key,
    title,
    description
FROM (VALUES
    ('setup_profile', '프로필 설정 완료', '교대 유형과 통근 시간을 설정해보세요'),
    ('first_schedule', '첫 근무표 입력', '이번 주 근무 일정을 입력해보세요'),
    ('sleep_recommendation', '수면 권장사항 확인', '개인화된 수면 권장사항을 확인해보세요'),
    ('caffeine_timing', '카페인 타이밍 확인', '최적의 카페인 섭취 시간을 확인해보세요'),
    ('fatigue_assessment', '피로도 평가', '현재 피로도 상태를 확인해보세요')
) AS templates(item_key, title, description);

-- 권한 설정: Lambda 함수용 데이터베이스 사용자
-- 실제 배포 시 RDS Proxy를 통해 연결되므로 여기서는 스키마만 정의

-- 성능 최적화: 통계 정보 수집 활성화
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';

-- 코멘트 추가
COMMENT ON TABLE users IS '사용자 프로필 정보 - Cognito와 연동';
COMMENT ON TABLE shift_schedules IS '근무표 데이터 - 커서 기반 페이지네이션 지원';
COMMENT ON TABLE engine_cache IS '엔진 계산 결과 캐시 - TTL 48시간';
COMMENT ON TABLE file_metadata IS '파일 메타데이터 - S3 연동';
COMMENT ON TABLE jumpstart_checklists IS '점프스타트 체크리스트';
COMMENT ON TABLE b2b_stats_aggregates IS 'B2B 통계 집계 데이터 - 3명 이상 그룹만';
COMMENT ON TABLE system_logs IS '시스템 로그 - 관측가능성';

COMMENT ON COLUMN users.cognito_sub IS 'Cognito User Pool subject - 인증 식별자';
COMMENT ON COLUMN users.last_active_at IS '마지막 활동 시간 - 배치 작업 최적화용';
COMMENT ON COLUMN shift_schedules.date IS '근무 날짜 - 커서 페이지네이션 기준';
COMMENT ON COLUMN engine_cache.expires_at IS '캐시 만료 시간 - TTL 48시간';
COMMENT ON COLUMN b2b_stats_aggregates.participant_count IS '참여자 수 - 최소 3명 이상';

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '교대근무자 수면 최적화 백엔드 데이터베이스 스키마 생성 완료';
    RAISE NOTICE '리전: us-east-1';
    RAISE NOTICE '암호화: RDS 기본 암호화 적용';
    RAISE NOTICE '테이블 수: %', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE');
    RAISE NOTICE '인덱스 수: %', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public');
END $$;