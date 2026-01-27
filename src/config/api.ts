// API 설정 및 클라이언트
export const API_CONFIG = {
  // 단일 API Gateway 진입점 - 백엔드 Lambda/Fargate 구분 없이 사용
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 
           (process.env.NODE_ENV === 'production' 
             ? 'https://api.shifthealth.com' 
             : 'http://localhost:3001'),
  
  // API 엔드포인트들 - API Gateway가 자동으로 Lambda/Fargate로 라우팅
  ENDPOINTS: {
    // Lambda 기반 엔드포인트들 (빠른 응답, 간단한 CRUD)
    USER: '/user',           // -> Lambda
    SCHEDULE: '/schedule',   // -> Lambda  
    SLEEP: '/sleep',         // -> Lambda
    CAFFEINE: '/caffeine',   // -> Lambda
    STATS: '/stats',         // -> Lambda
    AUTH: '/auth',           // -> Lambda
    
    // Fargate 기반 엔드포인트들 (AI/ML 처리, 복잡한 연산)
    ANALYSIS: '/analysis',   // -> Fargate (ALB 경유)
    CHAT: '/chat',          // -> Fargate (ALB 경유)
    FATIGUE_ANALYSIS: '/analysis/fatigue',      // -> Fargate
    SLEEP_RECOMMENDATION: '/analysis/sleep',    // -> Fargate
    AI_INSIGHTS: '/analysis/insights',          // -> Fargate
    HEALTH_PREDICTION: '/analysis/prediction',  // -> Fargate
  },
  
  // 환경별 설정
  ENVIRONMENTS: {
    development: {
      BASE_URL: 'http://localhost:3001',
      TIMEOUT: 10000,
    },
    staging: {
      BASE_URL: 'https://api-staging.shifthealth.com',
      TIMEOUT: 20000,
    },
    production: {
      BASE_URL: 'https://api.shifthealth.com',
      TIMEOUT: 30000,
    },
  },
  
  // 요청 타임아웃 설정 (Fargate는 더 긴 타임아웃)
  TIMEOUT: {
    DEFAULT: 15000,      // Lambda 엔드포인트용
    AI_ANALYSIS: 60000,  // Fargate AI 분석용
    CHAT: 30000,         // Fargate 채팅용
  },
  
  // 재시도 설정
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  
  // 헤더 설정
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': '1.0.0',
    'X-Platform': 'web',
  },
};

// HTTP 클라이언트 클래스
class ApiClient {
  private baseURL: string;
  private defaultTimeout: number;

  constructor(baseURL: string, timeout: number = API_CONFIG.TIMEOUT.DEFAULT) {
    this.baseURL = baseURL;
    this.defaultTimeout = timeout;
  }

  // 엔드포인트별 타임아웃 결정
  private getTimeoutForEndpoint(endpoint: string): number {
    if (endpoint.includes('/analysis') || endpoint.includes('/chat')) {
      return endpoint.includes('/chat') 
        ? API_CONFIG.TIMEOUT.CHAT 
        : API_CONFIG.TIMEOUT.AI_ANALYSIS;
    }
    return this.defaultTimeout;
  }

  // 환경별 헤더 설정
  private getEnvironmentHeaders(): Record<string, string> {
    const env = process.env.NODE_ENV || 'development';
    const headers = { ...API_CONFIG.DEFAULT_HEADERS };
    
    // 개발 환경에서는 CORS 헤더 추가
    if (env === 'development') {
      headers['X-Requested-With'] = 'XMLHttpRequest';
    }
    
    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const timeout = this.getTimeoutForEndpoint(endpoint);
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getEnvironmentHeaders(),
        ...options.headers,
      },
    };

    // 인증 토큰이 있다면 추가
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    // 사용자 ID가 있다면 추가 (개인화된 응답을 위해)
    const userId = localStorage.getItem('userId');
    if (userId) {
      config.headers = {
        ...config.headers,
        'X-User-ID': userId,
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        // API Gateway 에러 응답 처리
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // JSON 파싱 실패시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }

      // 응답이 비어있는 경우 처리
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return {} as T;
      }
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      
      // 네트워크 에러 vs 서버 에러 구분
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('네트워크 연결을 확인해주세요.');
      }
      
      throw error;
    }
  }

  // GET 요청
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST 요청
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT 요청
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE 요청
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// 싱글톤 API 클라이언트 인스턴스
const getApiBaseUrl = () => {
  const env = process.env.NODE_ENV || 'development';
  return API_CONFIG.ENVIRONMENTS[env as keyof typeof API_CONFIG.ENVIRONMENTS]?.BASE_URL || API_CONFIG.BASE_URL;
};

export const apiClient = new ApiClient(getApiBaseUrl());

// API 서비스 함수들 - 단일 진입점을 통한 Lambda/Fargate 라우팅
export const apiServices = {
  // 인증 관련 (Lambda)
  auth: {
    login: (credentials: { email: string; password: string }) => 
      apiClient.post(`${API_CONFIG.ENDPOINTS.AUTH}/login`, credentials),
    register: (userData: any) => 
      apiClient.post(`${API_CONFIG.ENDPOINTS.AUTH}/register`, userData),
    logout: () => 
      apiClient.post(`${API_CONFIG.ENDPOINTS.AUTH}/logout`),
    refreshToken: () => 
      apiClient.post(`${API_CONFIG.ENDPOINTS.AUTH}/refresh`),
  },

  // 사용자 관련 (Lambda - 빠른 CRUD)
  user: {
    getProfile: () => 
      apiClient.get(`${API_CONFIG.ENDPOINTS.USER}/profile`),
    updateProfile: (data: any) => 
      apiClient.put(`${API_CONFIG.ENDPOINTS.USER}/profile`, data),
    getPreferences: () => 
      apiClient.get(`${API_CONFIG.ENDPOINTS.USER}/preferences`),
    updatePreferences: (data: any) => 
      apiClient.put(`${API_CONFIG.ENDPOINTS.USER}/preferences`, data),
  },

  // 일정 관리 (Lambda - 빠른 CRUD)
  schedule: {
    getSchedules: (params?: { startDate?: string; endDate?: string }) => 
      apiClient.get(`${API_CONFIG.ENDPOINTS.SCHEDULE}${params ? `?${new URLSearchParams(params).toString()}` : ''}`),
    createSchedule: (data: any) => 
      apiClient.post(`${API_CONFIG.ENDPOINTS.SCHEDULE}`, data),
    updateSchedule: (id: string, data: any) => 
      apiClient.put(`${API_CONFIG.ENDPOINTS.SCHEDULE}/${id}`, data),
    deleteSchedule: (id: string) => 
      apiClient.delete(`${API_CONFIG.ENDPOINTS.SCHEDULE}/${id}`),
    getShiftPatterns: () => 
      apiClient.get(`${API_CONFIG.ENDPOINTS.SCHEDULE}/patterns`),
  },

  // 수면 관리 (Lambda - 기본 데이터, Fargate - AI 분석)
  sleep: {
    getSleepData: (params?: { days?: number }) => 
      apiClient.get(`${API_CONFIG.ENDPOINTS.SLEEP}${params ? `?${new URLSearchParams(params as any).toString()}` : ''}`),
    logSleep: (data: any) => 
      apiClient.post(`${API_CONFIG.ENDPOINTS.SLEEP}`, data),
    updateSleepPlan: (data: any) => 
      apiClient.post(`${API_CONFIG.ENDPOINTS.SLEEP}/plan`, data),
    // AI 기반 수면 추천 (Fargate)
    getSleepRecommendation: (data: any) => 
      apiClient.post(`${API_CONFIG.ENDPOINTS.SLEEP_RECOMMENDATION}`, data),
    analyzeSleepPattern: (data: any) => 
      apiClient.post(`${API_CONFIG.ENDPOINTS.ANALYSIS}/sleep-pattern`, data),
  },

  // 카페인 추적 (Lambda)
  caffeine: {
    getCaffeineData: (params?: { days?: number }) => 
      apiClient.get(`${API_CONFIG.ENDPOINTS.CAFFEINE}${params ? `?${new URLSearchParams(params as any).toString()}` : ''}`),
    logCaffeine: (data: any) => 
      apiClient.post(`${API_CONFIG.ENDPOINTS.CAFFEINE}`, data),
    getCaffeineRecommendation: () => 
      apiClient.get(`${API_CONFIG.ENDPOINTS.CAFFEINE}/recommendation`),
    updateCaffeineLimit: (limit: number) => 
      apiClient.put(`${API_CONFIG.ENDPOINTS.CAFFEINE}/limit`, { limit }),
  },

  // 통계 (Lambda - 기본 통계, Fargate - 고급 분석)
  stats: {
    getWeeklyStats: () => 
      apiClient.get(`${API_CONFIG.ENDPOINTS.STATS}/weekly`),
    getMonthlyStats: () => 
      apiClient.get(`${API_CONFIG.ENDPOINTS.STATS}/monthly`),
    getDashboardStats: () => 
      apiClient.get(`${API_CONFIG.ENDPOINTS.STATS}/dashboard`),
    // 고급 통계 분석 (Fargate)
    getAdvancedAnalytics: (params: any) => 
      apiClient.post(`${API_CONFIG.ENDPOINTS.ANALYSIS}/advanced-stats`, params),
  },

  // AI 분석 (Fargate - 복잡한 ML 처리)
  analysis: {
    // 피로도 분석
    analyzeFatigue: (data: any) => 
      apiClient.post(`${API_CONFIG.ENDPOINTS.FATIGUE_ANALYSIS}`, data),
    getFatigueHistory: () => 
      apiClient.get(`${API_CONFIG.ENDPOINTS.FATIGUE_ANALYSIS}/history`),
    
    // 건강 인사이트
    getHealthInsights: () => 
      apiClient.get(`${API_CONFIG.ENDPOINTS.AI_INSIGHTS}`),
    generatePersonalizedPlan: (data: any) => 
      apiClient.post(`${API_CONFIG.ENDPOINTS.AI_INSIGHTS}/plan`, data),
    
    // 건강 예측
    predictHealthRisks: (data: any) => 
      apiClient.post(`${API_CONFIG.ENDPOINTS.HEALTH_PREDICTION}`, data),
    getWellnessScore: () => 
      apiClient.get(`${API_CONFIG.ENDPOINTS.ANALYSIS}/wellness-score`),
  },

  // AI 채팅 (Fargate - NLP 처리)
  chat: {
    sendMessage: (message: string, context?: any) => 
      apiClient.post(`${API_CONFIG.ENDPOINTS.CHAT}`, { message, context }),
    getChatHistory: (limit?: number) => 
      apiClient.get(`${API_CONFIG.ENDPOINTS.CHAT}/history${limit ? `?limit=${limit}` : ''}`),
    clearChatHistory: () => 
      apiClient.delete(`${API_CONFIG.ENDPOINTS.CHAT}/history`),
    getHealthAdvice: (symptoms: string[]) => 
      apiClient.post(`${API_CONFIG.ENDPOINTS.CHAT}/health-advice`, { symptoms }),
  },
};