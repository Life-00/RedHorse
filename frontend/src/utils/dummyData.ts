// 김소연님을 위한 더미 데이터
export const DUMMY_USER_ID = 'e478f488-f0a1-703a-17ab-462c0c3f5012';

// 더미 스케줄 데이터 (최근 2주 + 앞으로 2주)
export function generateDummySchedules() {
  const schedules = [];
  const today = new Date();
  const schedulePattern = ['day', 'day', 'night', 'night', 'off', 'off', 'evening'];
  
  for (let i = -14; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const shiftType = schedulePattern[Math.abs(i) % schedulePattern.length];
    
    schedules.push({
      id: Date.now() + i,
      user_id: DUMMY_USER_ID,
      work_date: date.toISOString().split('T')[0],
      shift_type: shiftType,
      start_time: shiftType === 'day' ? '09:00' : shiftType === 'night' ? '22:00' : shiftType === 'evening' ? '17:00' : null,
      end_time: shiftType === 'day' ? '18:00' : shiftType === 'night' ? '07:00' : shiftType === 'evening' ? '02:00' : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  return schedules;
}

// 더미 점프스타트 데이터
export function generateDummyJumpstart() {
  const today = new Date().toISOString().split('T')[0];
  
  return {
    id: 1,
    user_id: DUMMY_USER_ID,
    block_date: today,
    blocks: [
      {
        id: 1,
        block_type: 'now',
        block_name: 'Now (15분)',
        duration_minutes: 15,
        tasks: [
          { id: 1, task_name: '물 한 잔 마시기', completed: true },
          { id: 2, task_name: '간단한 스트레칭', completed: false },
          { id: 3, task_name: '심호흡 3회', completed: true }
        ]
      },
      {
        id: 2,
        block_type: 'must_do',
        block_name: 'Must-do (90분)',
        duration_minutes: 90,
        tasks: [
          { id: 4, task_name: '업무 준비 및 확인', completed: true },
          { id: 5, task_name: '중요 업무 처리', completed: false },
          { id: 6, task_name: '동료와 소통', completed: false }
        ]
      },
      {
        id: 3,
        block_type: 'recovery',
        block_name: 'Recovery (10분)',
        duration_minutes: 10,
        tasks: [
          { id: 7, task_name: '목과 어깨 마사지', completed: false },
          { id: 8, task_name: '눈 운동', completed: false }
        ]
      }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// 더미 웰니스 체크리스트
export function generateDummyWellnessChecklist() {
  const today = new Date().toISOString().split('T')[0];
  
  return [
    { id: 1, user_id: DUMMY_USER_ID, task_date: today, task_name: '충분한 수분 섭취', completed: true },
    { id: 2, user_id: DUMMY_USER_ID, task_date: today, task_name: '규칙적인 식사', completed: true },
    { id: 3, user_id: DUMMY_USER_ID, task_date: today, task_name: '30분 이상 운동', completed: false },
    { id: 4, user_id: DUMMY_USER_ID, task_date: today, task_name: '명상 또는 휴식', completed: false },
    { id: 5, user_id: DUMMY_USER_ID, task_date: today, task_name: '카페인 적정 섭취', completed: true }
  ];
}

// 더미 피로 위험도 데이터
export function generateDummyFatigueAssessment() {
  return {
    id: 1,
    user_id: DUMMY_USER_ID,
    assessment_date: new Date().toISOString().split('T')[0],
    risk_level: 'medium',
    risk_score: 65,
    sleep_hours: 6.5,
    consecutive_work_days: 3,
    night_shifts_week: 2,
    commute_time: 30,
    factors: {
      sleep_quality: 'fair',
      stress_level: 'medium',
      caffeine_intake: 'moderate'
    },
    recommendations: [
      '오늘은 카페인 섭취를 오후 2시 이전으로 제한하세요',
      '근무 전 15분간 가벼운 스트레칭을 해보세요',
      '수면 전 1시간은 스마트폰 사용을 자제하세요'
    ],
    created_at: new Date().toISOString()
  };
}

// 더미 수면 계획
export function generateDummySleepPlan() {
  return {
    id: 1,
    user_id: DUMMY_USER_ID,
    plan_date: new Date().toISOString().split('T')[0],
    main_sleep_start: '23:00',
    main_sleep_end: '07:00',
    main_sleep_duration: 8,
    nap_recommended: true,
    nap_start: '14:00',
    nap_duration: 20,
    sleep_tips: [
      '잠들기 1시간 전부터 블루라이트 차단',
      '침실 온도를 18-20도로 유지',
      '규칙적인 수면 시간 유지'
    ],
    created_at: new Date().toISOString()
  };
}

// 더미 카페인 계획
export function generateDummyCaffeinePlan() {
  return {
    id: 1,
    user_id: DUMMY_USER_ID,
    plan_date: new Date().toISOString().split('T')[0],
    cutoff_time: '14:00',
    max_daily_intake: 400,
    recommended_times: ['07:00', '10:00', '13:00'],
    caffeine_tips: [
      '오후 2시 이후 카페인 섭취 금지',
      '하루 최대 400mg (커피 4잔) 이하',
      '물과 함께 섭취하여 탈수 방지'
    ],
    created_at: new Date().toISOString()
  };
}

// 로컬 스토리지에 더미 데이터 저장
export function initializeDummyData(userId: string) {
  if (userId !== DUMMY_USER_ID) return;
  
  // 스케줄 데이터
  const existingSchedules = localStorage.getItem(`schedules_${userId}`);
  if (!existingSchedules) {
    localStorage.setItem(`schedules_${userId}`, JSON.stringify(generateDummySchedules()));
  }
  
  // 점프스타트 데이터
  const existingJumpstart = localStorage.getItem(`jumpstart_${userId}`);
  if (!existingJumpstart) {
    localStorage.setItem(`jumpstart_${userId}`, JSON.stringify(generateDummyJumpstart()));
  }
  
  // 웰니스 체크리스트
  const existingWellness = localStorage.getItem(`wellness_${userId}`);
  if (!existingWellness) {
    localStorage.setItem(`wellness_${userId}`, JSON.stringify(generateDummyWellnessChecklist()));
  }
  
  // 피로 위험도
  const existingFatigue = localStorage.getItem(`fatigue_${userId}`);
  if (!existingFatigue) {
    localStorage.setItem(`fatigue_${userId}`, JSON.stringify(generateDummyFatigueAssessment()));
  }
  
  // 수면 계획
  const existingSleep = localStorage.getItem(`sleep_plan_${userId}`);
  if (!existingSleep) {
    localStorage.setItem(`sleep_plan_${userId}`, JSON.stringify(generateDummySleepPlan()));
  }
  
  // 카페인 계획
  const existingCaffeine = localStorage.getItem(`caffeine_plan_${userId}`);
  if (!existingCaffeine) {
    localStorage.setItem(`caffeine_plan_${userId}`, JSON.stringify(generateDummyCaffeinePlan()));
  }
  
  console.log('✅ 김소연님을 위한 더미 데이터 초기화 완료');
}