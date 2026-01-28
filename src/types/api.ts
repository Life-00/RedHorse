// API 관련 타입 정의

// 사용자 프로필
export interface UserProfile {
  user_id: string;
  email: string;
  name: string;
  work_type: 'day' | 'evening' | 'night' | 'irregular' | '';
  commute_time: number;
  wearable_device: 'apple' | 'google' | 'galaxy' | 'none' | '';
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// 스케줄
export interface Schedule {
  id: number;
  user_id: string;
  work_date: string;
  shift_type: 'day' | 'evening' | 'night' | 'off';
  start_time?: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
}

// 스케줄 이미지
export interface ScheduleImage {
  id: number;
  user_id: string;
  original_filename: string;
  s3_key: string;
  file_size: number;
  upload_status: 'uploaded' | 'processing' | 'processed' | 'failed';
  ocr_result?: any;
  processed_at?: string;
  created_at: string;
}

// 수면 계획
export interface SleepPlan {
  id: number;
  user_id: string;
  plan_date: string;
  main_sleep_start: string;
  main_sleep_end: string;
  main_sleep_duration: number;
  nap_start?: string;
  nap_end?: string;
  nap_duration?: number;
  rationale: string;
  created_at: string;
  updated_at: string;
}

// 카페인 계획
export interface CaffeinePlan {
  id: number;
  user_id: string;
  plan_date: string;
  cutoff_time: string;
  max_intake_mg: number;
  recommendations: string;
  alternative_methods: string;
  created_at: string;
  updated_at: string;
}

// 피로 위험도 평가
export interface FatigueAssessment {
  id: number;
  user_id: string;
  assessment_date: string;
  sleep_hours: number;
  consecutive_night_shifts: number;
  commute_time: number;
  risk_level: 'low' | 'medium' | 'high';
  risk_score: number;
  safety_recommendations: string;
  created_at: string;
  updated_at: string;
  calculation_details?: {
    sleep_score: number;
    night_shift_score: number;
    commute_score: number;
    pattern_score: number;
    total_schedules: number;
  };
}

// 점프스타트 블록
export interface JumpstartBlock {
  id: number;
  user_id: string;
  block_date: string;
  block_type: 'now' | 'must_do' | 'recovery';
  block_name: string;
  total_duration: number;
  completed_tasks: number;
  total_tasks: number;
  created_at: string;
  updated_at: string;
  tasks: JumpstartTask[];
}

// 점프스타트 작업
export interface JumpstartTask {
  id: number;
  block_id: number;
  user_id: string;
  task_date: string;
  task_name: string;
  duration_minutes: number;
  completed: boolean;
  completed_at?: string;
  task_order: number;
  created_at: string;
}

// 일일 체크리스트
export interface DailyChecklistTask {
  id: number;
  user_id: string;
  task_date: string;
  task_name: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
}

// AI 채팅
export interface ChatMessage {
  id: number;
  user_id: string;
  message: string;
  response: string;
  created_at: string;
}

// 오디오 파일
export interface AudioFile {
  id: number;
  file_name: string;
  file_type: 'meditation' | 'whitenoise';
  title: string;
  description?: string;
  duration_seconds?: number;
  s3_key: string;
  streaming_url?: string;
  created_at: string;
}

// 통계 타입들
export interface FatigueStatistics {
  period_days: number;
  total_assessments: number;
  average_risk_score: number;
  average_sleep_hours: number;
  risk_distribution: {
    low: number;
    medium: number;
    high: number;
  };
  max_consecutive_night_shifts: number;
}

export interface JumpstartStatistics {
  period_days: number;
  active_days: number;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  total_completed_minutes: number;
  average_task_duration: number;
  block_statistics: Array<{
    block_type: string;
    block_name: string;
    total_tasks: number;
    completed_tasks: number;
    completion_rate: number;
    completed_minutes: number;
  }>;
}