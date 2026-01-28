// API 호출을 위한 커스텀 훅들
import { useState, useEffect } from 'react';
import { apiUtils } from '../lib/api';

// 현재 사용자 ID를 가져오는 훅
export function useCurrentUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const id = await apiUtils.getCurrentUserId();
        console.log('🔍 useCurrentUser 훅에서 가져온 사용자 ID:', id);
        setUserId(id);
      } catch (error) {
        console.error('Failed to get current user:', error);
        setUserId(null);
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();
  }, []);

  return { userId, loading };
}

// API 호출 상태를 관리하는 제네릭 훅
export function useApiCall<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const execute = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, loading, error, refetch: execute };
}

// 오늘 날짜 문자열을 반환하는 훅
export function useToday() {
  const [today] = useState(() => apiUtils.getTodayString());
  return today;
}