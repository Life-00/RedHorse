-- 수면 계획 테이블을 TIME에서 TIMESTAMP로 마이그레이션
-- 실행 전 백업 권장!

-- 1. 기존 데이터 백업
CREATE TABLE sleep_plans_backup AS SELECT * FROM sleep_plans;

-- 2. 기존 테이블 삭제 (CASCADE로 관련 제약조건도 삭제)
DROP TABLE IF EXISTS sleep_plans CASCADE;

-- 3. 새로운 스키마로 테이블 재생성
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

-- 4. 기존 데이터 복원 (TIME을 TIMESTAMP로 변환)
INSERT INTO sleep_plans (
    id, user_id, plan_date, 
    main_sleep_start, main_sleep_end, main_sleep_duration,
    nap_start, nap_end, nap_duration,
    rationale, created_at, updated_at
)
SELECT 
    id, user_id, plan_date,
    -- TIME을 TIMESTAMP로 변환 (plan_date 기준, UTC 타임존)
    (plan_date::TEXT || ' ' || main_sleep_start::TEXT)::TIMESTAMP AT TIME ZONE 'UTC',
    -- 종료 시간이 시작 시간보다 작으면 다음날로 처리
    CASE 
        WHEN main_sleep_end::TIME < main_sleep_start::TIME THEN 
            ((plan_date + INTERVAL '1 day')::TEXT || ' ' || main_sleep_end::TEXT)::TIMESTAMP AT TIME ZONE 'UTC'
        ELSE 
            (plan_date::TEXT || ' ' || main_sleep_end::TEXT)::TIMESTAMP AT TIME ZONE 'UTC'
    END,
    main_sleep_duration,
    -- 낮잠 시작 (있는 경우)
    CASE 
        WHEN nap_start IS NOT NULL THEN 
            (plan_date::TEXT || ' ' || nap_start::TEXT)::TIMESTAMP AT TIME ZONE 'UTC'
        ELSE NULL
    END,
    -- 낮잠 종료 (있는 경우)
    CASE 
        WHEN nap_end IS NOT NULL THEN 
            CASE 
                WHEN nap_end::TIME < nap_start::TIME THEN 
                    ((plan_date + INTERVAL '1 day')::TEXT || ' ' || nap_end::TEXT)::TIMESTAMP AT TIME ZONE 'UTC'
                ELSE 
                    (plan_date::TEXT || ' ' || nap_end::TEXT)::TIMESTAMP AT TIME ZONE 'UTC'
            END
        ELSE NULL
    END,
    nap_duration,
    rationale, created_at, updated_at
FROM sleep_plans_backup;

-- 5. 시퀀스 재설정
SELECT setval('sleep_plans_id_seq', (SELECT MAX(id) FROM sleep_plans));

-- 6. 확인
SELECT 
    id, user_id, plan_date,
    main_sleep_start, main_sleep_end,
    nap_start, nap_end
FROM sleep_plans
ORDER BY id;

-- 7. 백업 테이블 삭제 (확인 후)
-- DROP TABLE sleep_plans_backup;
