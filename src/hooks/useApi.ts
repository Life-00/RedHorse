import { useState, useEffect, useCallback } from 'react';
import { apiServices } from '../config/api';

// API 호출 상태 타입
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// API 훅 반환 타입
interface UseApiReturn<T> extends ApiState<T> {
  refetch: () => Promise<void>;
  reset: () => void;
}

// 제네릭 API 훅
export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = [],
  options?: {
    immediate?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
  }
): UseApiReturn<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: options?.immediate !== false,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
      options?.onSuccess?.(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      options?.onError?.(errorMessage);
    }
  }, dependencies);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (options?.immediate !== false) {
      fetchData();
    }
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
    reset,
  };
}

// 특정 API 서비스를 위한 커스텀 훅들
export const useUserProfile = () => {
  return useApi(() => apiServices.user.getProfile());
};

export const useSchedules = (params?: { startDate?: string; endDate?: string }) => {
  return useApi(() => apiServices.schedule.getSchedules(params), [params]);
};

export const useSleepData = (days?: number) => {
  return useApi(() => apiServices.sleep.getSleepData(days ? { days } : undefined), [days]);
};

export const useCaffeineData = (days?: number) => {
  return useApi(() => apiServices.caffeine.getCaffeineData(days ? { days } : undefined), [days]);
};

export const useWeeklyStats = () => {
  return useApi(() => apiServices.stats.getWeeklyStats());
};

export const useMonthlyStats = () => {
  return useApi(() => apiServices.stats.getMonthlyStats());
};

export const useDashboardStats = () => {
  return useApi(() => apiServices.stats.getDashboardStats());
};

export const useChatHistory = (limit?: number) => {
  return useApi(() => apiServices.chat.getChatHistory(limit), [limit]);
};

export const useHealthInsights = () => {
  return useApi(() => apiServices.analysis.getHealthInsights());
};

export const useWellnessScore = () => {
  return useApi(() => apiServices.analysis.getWellnessScore());
};

// 뮤테이션 훅 (POST, PUT, DELETE)
interface UseMutationOptions<T, P> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  onSettled?: () => void;
}

interface UseMutationReturn<T, P> {
  mutate: (params: P) => Promise<void>;
  mutateAsync: (params: P) => Promise<T>;
  loading: boolean;
  error: string | null;
  data: T | null;
  reset: () => void;
}

export function useMutation<T, P>(
  mutationFn: (params: P) => Promise<T>,
  options?: UseMutationOptions<T, P>
): UseMutationReturn<T, P> {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: T | null;
  }>({
    loading: false,
    error: null,
    data: null,
  });

  const mutateAsync = useCallback(async (params: P): Promise<T> => {
    setState({ loading: true, error: null, data: null });
    
    try {
      const data = await mutationFn(params);
      setState({ loading: false, error: null, data });
      options?.onSuccess?.(data);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState({ loading: false, error: errorMessage, data: null });
      options?.onError?.(errorMessage);
      throw error;
    } finally {
      options?.onSettled?.();
    }
  }, [mutationFn, options]);

  const mutate = useCallback(async (params: P) => {
    try {
      await mutateAsync(params);
    } catch {
      // mutate는 에러를 throw하지 않음
    }
  }, [mutateAsync]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  return {
    mutate,
    mutateAsync,
    reset,
    ...state,
  };
}

// 특정 뮤테이션을 위한 커스텀 훅들

// 인증 관련
export const useLogin = (options?: UseMutationOptions<any, { email: string; password: string }>) => {
  return useMutation(apiServices.auth.login, options);
};

export const useRegister = (options?: UseMutationOptions<any, any>) => {
  return useMutation(apiServices.auth.register, options);
};

// 일정 관리
export const useCreateSchedule = (options?: UseMutationOptions<any, any>) => {
  return useMutation(apiServices.schedule.createSchedule, options);
};

export const useUpdateSchedule = (options?: UseMutationOptions<any, { id: string; data: any }>) => {
  return useMutation(
    ({ id, data }) => apiServices.schedule.updateSchedule(id, data),
    options
  );
};

export const useDeleteSchedule = (options?: UseMutationOptions<any, string>) => {
  return useMutation(apiServices.schedule.deleteSchedule, options);
};

// 수면 관리
export const useLogSleep = (options?: UseMutationOptions<any, any>) => {
  return useMutation(apiServices.sleep.logSleep, options);
};

export const useUpdateSleepPlan = (options?: UseMutationOptions<any, any>) => {
  return useMutation(apiServices.sleep.updateSleepPlan, options);
};

export const useGetSleepRecommendation = (options?: UseMutationOptions<any, any>) => {
  return useMutation(apiServices.sleep.getSleepRecommendation, options);
};

// 카페인 추적
export const useLogCaffeine = (options?: UseMutationOptions<any, any>) => {
  return useMutation(apiServices.caffeine.logCaffeine, options);
};

export const useUpdateCaffeineLimit = (options?: UseMutationOptions<any, number>) => {
  return useMutation(apiServices.caffeine.updateCaffeineLimit, options);
};

// AI 분석 (Fargate)
export const useAnalyzeFatigue = (options?: UseMutationOptions<any, any>) => {
  return useMutation(apiServices.analysis.analyzeFatigue, options);
};

export const useGeneratePersonalizedPlan = (options?: UseMutationOptions<any, any>) => {
  return useMutation(apiServices.analysis.generatePersonalizedPlan, options);
};

export const usePredictHealthRisks = (options?: UseMutationOptions<any, any>) => {
  return useMutation(apiServices.analysis.predictHealthRisks, options);
};

// AI 채팅 (Fargate)
export const useSendMessage = (options?: UseMutationOptions<any, { message: string; context?: any }>) => {
  return useMutation(
    ({ message, context }) => apiServices.chat.sendMessage(message, context),
    options
  );
};

export const useGetHealthAdvice = (options?: UseMutationOptions<any, string[]>) => {
  return useMutation(apiServices.chat.getHealthAdvice, options);
};

// 사용자 프로필
export const useUpdateProfile = (options?: UseMutationOptions<any, any>) => {
  return useMutation(apiServices.user.updateProfile, options);
};

export const useUpdatePreferences = (options?: UseMutationOptions<any, any>) => {
  return useMutation(apiServices.user.updatePreferences, options);
};