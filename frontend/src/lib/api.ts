// API 클라이언트 라이브러리
import { fetchAuthSession } from "aws-amplify/auth";

// API 기본 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// API 응답 타입
export interface ApiResponse<T = any> {
  statusCode: number;
  data?: T;
  error?: string;
}

// HTTP 클라이언트 클래스
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      // 디버깅: 토큰 정보 출력
      if (session.tokens?.idToken?.payload) {
        console.log('🔍 API 호출 시 사용자 ID:', session.tokens.idToken.payload.sub);
        console.log('🔍 API 호출 시 사용자 이메일:', session.tokens.idToken.payload.email);
      }
      
      return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
    } catch {
      return {
        'Content-Type': 'application/json'
      };
    }
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// API 클라이언트 인스턴스
export const apiClient = new ApiClient(API_BASE_URL);

// 사용자 관리 API
export const userApi = {
  // 사용자 프로필 조회
  getProfile: (userId: string) => 
    apiClient.get<{ user: any }>(`/users/${userId}`),
  
  // 사용자 프로필 생성
  createProfile: (userData: {
    user_id: string;
    email: string;
    name: string;
    work_type?: string;
    commute_time?: number;
    wearable_device?: string;
    onboarding_completed?: boolean;
  }) => 
    apiClient.post<{ user: any }>('/users', userData),
  
  // 사용자 프로필 업데이트
  updateProfile: (userId: string, userData: any) => 
    apiClient.put<{ user: any }>(`/users/${userId}`, userData),
  
  // 사용자 프로필 삭제
  deleteProfile: (userId: string) => 
    apiClient.delete<{ message: string }>(`/users/${userId}`),
};

// 스케줄 관리 API
export const scheduleApi = {
  // 스케줄 목록 조회
  getSchedules: (userId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    
    return apiClient.get<{ schedules: any[] }>(`/users/${userId}/schedules${query}`);
  },
  
  // 스케줄 생성
  createSchedule: (userId: string, scheduleData: {
    work_date: string;
    shift_type: string;
    start_time?: string;
    end_time?: string;
  }) => 
    apiClient.post<{ schedule: any }>(`/users/${userId}/schedules`, scheduleData),
  
  // 스케줄 업데이트
  updateSchedule: (userId: string, scheduleId: number, scheduleData: any) => 
    apiClient.put<{ schedule: any }>(`/users/${userId}/schedules/${scheduleId}`, scheduleData),
  
  // 스케줄 삭제
  deleteSchedule: (userId: string, scheduleId: number) => 
    apiClient.delete<{ message: string }>(`/users/${userId}/schedules/${scheduleId}`),
  
  // 스케줄 이미지 업로드
  uploadScheduleImage: (userId: string) => 
    apiClient.post<{ upload: any }>(`/users/${userId}/schedule-images`),
  
  // 업로드된 이미지 목록 조회
  getScheduleImages: (userId: string) => 
    apiClient.get<{ images: any[] }>(`/users/${userId}/schedule-images`),
};

// AI 서비스 API
export const aiApi = {
  // 수면 계획 생성
  generateSleepPlan: (userId: string, planDate: string) => 
    apiClient.post<{ sleep_plan: any }>(`/users/${userId}/sleep-plans`, { plan_date: planDate }),
  
  // 수면 계획 조회
  getSleepPlan: (userId: string, date: string) => 
    apiClient.get<{ sleep_plan: any }>(`/users/${userId}/sleep-plans?date=${date}`),
  
  // 카페인 계획 생성
  generateCaffeinePlan: (userId: string, planDate: string) => 
    apiClient.post<{ caffeine_plan: any }>(`/users/${userId}/caffeine-plans`, { plan_date: planDate }),
  
  // 카페인 계획 조회
  getCaffeinePlan: (userId: string, date: string) => 
    apiClient.get<{ caffeine_plan: any }>(`/users/${userId}/caffeine-plans?date=${date}`),
  
  // AI 챗봇 상담
  chatWithAI: (userId: string, message: string) => 
    apiClient.post<{ chat: any }>(`/users/${userId}/chat`, { message }),
  
  // 채팅 기록 조회
  getChatHistory: (userId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiClient.get<{ chat_history: any[] }>(`/users/${userId}/chat${query}`);
  },
};

// 피로 위험도 평가 API
export const fatigueApi = {
  // 피로 위험도 계산
  calculateFatigueRisk: (userId: string, assessmentDate?: string) => 
    apiClient.post<{ assessment: any }>(`/users/${userId}/fatigue-assessment`, 
      assessmentDate ? { assessment_date: assessmentDate } : {}),
  
  // 피로 위험도 조회
  getFatigueAssessment: (userId: string, date?: string) => {
    const query = date ? `?date=${date}` : '';
    return apiClient.get<{ assessment: any }>(`/users/${userId}/fatigue-assessment${query}`);
  },
  
  // 피로 위험도 기록 조회
  getFatigueHistory: (userId: string, days?: number) => {
    const query = days ? `?days=${days}` : '';
    return apiClient.get<{ history: any[] }>(`/users/${userId}/fatigue-assessment/history${query}`);
  },
  
  // 피로 위험도 통계
  getFatigueStatistics: (userId: string) => 
    apiClient.get<{ statistics: any }>(`/users/${userId}/fatigue-assessment/statistics`),
};

// 점프스타트 API
export const jumpstartApi = {
  // 일일 점프스타트 생성
  createDailyJumpstart: (userId: string, blockDate?: string) => 
    apiClient.post<{ jumpstart: any }>(`/users/${userId}/jumpstart`, 
      blockDate ? { block_date: blockDate } : {}),
  
  // 일일 점프스타트 조회
  getDailyJumpstart: (userId: string, date?: string) => {
    const query = date ? `?date=${date}` : '';
    return apiClient.get<{ jumpstart: any }>(`/users/${userId}/jumpstart${query}`);
  },
  
  // 작업 완료 상태 업데이트
  updateTaskCompletion: (userId: string, taskId: number, completed: boolean) => 
    apiClient.put<{ task: any }>(`/users/${userId}/jumpstart/tasks/${taskId}`, { completed }),
  
  // 사용자 정의 작업 추가
  addCustomTask: (userId: string, blockId: number, taskData: {
    task_name: string;
    duration_minutes?: number;
  }) => 
    apiClient.post<{ task: any }>(`/users/${userId}/jumpstart/blocks/${blockId}/tasks`, taskData),
  
  // 점프스타트 통계
  getJumpstartStatistics: (userId: string, days?: number) => {
    const query = days ? `?days=${days}` : '';
    return apiClient.get<{ statistics: any }>(`/users/${userId}/jumpstart/statistics${query}`);
  },
};

// 웰니스 API
export const wellnessApi = {
  // 오디오 파일 목록 조회
  getAudioFiles: (fileType?: 'meditation' | 'whitenoise') => {
    const query = fileType ? `?type=${fileType}` : '';
    return apiClient.get<{ audio_files: any[] }>(`/audio-files${query}`);
  },
  
  // 특정 오디오 파일 조회
  getAudioFile: (fileId: number) => 
    apiClient.get<{ audio_file: any }>(`/audio-files/${fileId}`),
  
  // 일일 체크리스트 생성
  createDailyChecklist: (userId: string, taskDate?: string) => 
    apiClient.post<{ checklist: any[] }>(`/users/${userId}/daily-checklist`, 
      taskDate ? { task_date: taskDate } : {}),
  
  // 일일 체크리스트 조회
  getDailyChecklist: (userId: string, date?: string) => {
    const query = date ? `?date=${date}` : '';
    return apiClient.get<{ checklist: any[] }>(`/users/${userId}/daily-checklist${query}`);
  },
  
  // 체크리스트 작업 완료 상태 업데이트
  updateChecklistTask: (userId: string, taskId: number, completed: boolean) => 
    apiClient.put<{ task: any }>(`/users/${userId}/daily-checklist/${taskId}`, { completed }),
  
  // 사용자 정의 체크리스트 작업 추가
  addCustomChecklistTask: (userId: string, taskName: string, taskDate?: string) => 
    apiClient.post<{ task: any }>(`/users/${userId}/daily-checklist/custom`, {
      task_name: taskName,
      task_date: taskDate
    }),
};

// 유틸리티 함수들
export const apiUtils = {
  // 현재 사용자 ID 가져오기 (Cognito에서)
  getCurrentUserId: async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.payload?.sub as string || null;
    } catch {
      return null;
    }
  },
  
  // 오늘 날짜 문자열 (YYYY-MM-DD)
  getTodayString: (): string => {
    return new Date().toISOString().split('T')[0];
  },
  
  // 날짜 포맷팅
  formatDate: (date: Date): string => {
    return date.toISOString().split('T')[0];
  },
};