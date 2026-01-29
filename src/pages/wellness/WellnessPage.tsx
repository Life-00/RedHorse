// src/pages/wellness/WellnessPage.tsx
import { useEffect, useState } from "react";
import type { ScreenType } from "../../types/app";
import BottomNav from "../../components/layout/BottomNav";
import { Coffee, AlertTriangle, Waves, ChevronRight, Sparkles } from "lucide-react";
import { aiApi, fatigueApi } from "../../lib/api";
import { useCurrentUser, useToday } from "../../hooks/useApi";
import type { CaffeinePlan } from "../../types/api";

export default function WellnessPage({
  onNavigate,
}: {
  onNavigate: (s: ScreenType) => void;
}) {
  const { userId, loading: userLoading } = useCurrentUser();
  const today = useToday();
  
  const [caffeinePlan, setCaffeinePlan] = useState<CaffeinePlan | null>(null);
  const [fatigueScore, setFatigueScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // 웰니스 데이터 로드
  useEffect(() => {
    if (!userId || userLoading) return;

    const loadWellnessData = async () => {
      try {
        setLoading(true);

        // 병렬로 데이터 로드
        const [caffeineResponse, fatigueResponse] = await Promise.allSettled([
          aiApi.getCaffeinePlan(userId, today),
          fatigueApi.getFatigueAssessment(userId, today)
        ]);

        // 카페인 계획
        if (caffeineResponse.status === 'fulfilled') {
          setCaffeinePlan(caffeineResponse.value.caffeine_plan);
        } else {
          console.error('카페인 계획 로드 실패:', caffeineResponse.reason);
        }

        // 피로 위험도 점수
        if (fatigueResponse.status === 'fulfilled') {
          setFatigueScore(fatigueResponse.value.assessment.risk_score);
        } else {
          console.error('피로 점수 로드 실패:', fatigueResponse.reason);
        }

      } catch (error) {
        console.error('웰니스 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWellnessData();
  }, [userId, userLoading, today]);

  // 피로 위험도 레벨 계산
  const getFatigueLevel = (score: number | null) => {
    if (score === null) return { text: '계산 중...', color: 'gray' };
    if (score < 30) return { text: '낮음', color: 'green' };
    if (score < 60) return { text: '보통', color: 'yellow' };
    if (score < 80) return { text: '높음', color: 'orange' };
    return { text: '매우 높음', color: 'red' };
  };

  const fatigueLevel = getFatigueLevel(fatigueScore);

  return (
    <div className="h-full flex flex-col bg-[#F8F9FD]">
      {/* Header */}
      <div className="px-7 pt-6 pb-6 bg-white rounded-b-[32px] shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => onNavigate("home")}
            className="flex items-center justify-center text-indigo-600 hover:text-indigo-700 active:scale-95 transition-all"
            aria-label="뒤로가기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[24px] font-black text-[#1A1A1A]">웰빙</h1>
        </div>
        <p className="text-[14px] text-gray-400 font-bold ml-9">
          컨디션을 올리는 오늘의 추천
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-7 pt-6 pb-32 space-y-4 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-600 font-bold">웰니스 데이터를 불러오는 중...</div>
          </div>
        ) : (
          <>
            {/* 피로 위험도 */}
            <button
              onClick={() => onNavigate("fatigue-risk-score")}
              className="w-full bg-white rounded-[28px] p-5 shadow-sm border border-gray-50 text-left active:scale-[0.99] transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-black text-gray-900">
                    피로 위험도
                  </div>
                  <div className="text-[12px] text-gray-400 font-bold">
                    오늘의 피로 수준과 안전 관리
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>

              <div className="mt-4 p-4 rounded-[22px] bg-rose-50/60 border border-rose-100">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] text-rose-700 font-bold">
                    현재 위험도
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`text-[16px] font-black ${
                      fatigueLevel.color === 'green' ? 'text-green-900' :
                      fatigueLevel.color === 'yellow' ? 'text-yellow-900' :
                      fatigueLevel.color === 'orange' ? 'text-orange-900' :
                      fatigueLevel.color === 'red' ? 'text-red-900' :
                      'text-gray-900'
                    }`}>
                      {fatigueScore !== null ? `${fatigueScore}점` : '계산 중...'}
                    </div>
                    <div className={`text-[12px] font-bold px-2 py-1 rounded-full ${
                      fatigueLevel.color === 'green' ? 'bg-green-100 text-green-700' :
                      fatigueLevel.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                      fatigueLevel.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                      fatigueLevel.color === 'red' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {fatigueLevel.text}
                    </div>
                  </div>
                </div>
              </div>
            </button>

            {/* 카페인 컷오프 */}
            <button
              onClick={() => onNavigate("caffeine-cutoff")}
              className="w-full bg-white rounded-[28px] p-5 shadow-sm border border-gray-50 text-left active:scale-[0.99] transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <Coffee className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-black text-gray-900">
                    카페인 컷오프
                  </div>
                  <div className="text-[12px] text-gray-400 font-bold">
                    수면 품질을 위한 마지막 허용 시각
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>

              <div className="mt-4 p-4 rounded-[22px] bg-amber-50/60 border border-amber-100">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] text-amber-700 font-bold">
                    오늘 권장 컷오프
                  </div>
                  <div className="text-[16px] font-black text-amber-900">
                    {caffeinePlan ? caffeinePlan.cutoff_time : '계산 중...'}
                  </div>
                </div>
              </div>
            </button>

            {/* 이완 & 휴식 */}
            <button
              onClick={() => onNavigate("relax")}
              className="w-full bg-white rounded-[28px] p-5 shadow-sm border border-gray-50 text-left active:scale-[0.99] transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center">
                  <Waves className="w-6 h-6 text-sky-600" />
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-black text-gray-900">
                    이완 & 휴식
                  </div>
                  <div className="text-[12px] text-gray-400 font-bold">
                    명상 · 호흡 · 백색소음으로 빠른 회복
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>

              <div className="mt-4 p-4 rounded-[22px] bg-sky-50/60 border border-sky-100">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] text-sky-700 font-bold">
                    추천
                  </div>
                  <div className="text-[14px] font-black text-sky-900">
                    빗소리 + 30분 타이머
                  </div>
                </div>
              </div>
            </button>

            {/* Placeholder: More coming */}
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-50">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-[15px] font-black text-gray-900">
                  더 많은 웰빙 기능
                </div>
              </div>
              <p className="text-[13px] text-gray-400 font-bold leading-relaxed">
                곧 컨디션 카드, 회복 루틴이 추가됩니다.
              </p>
            </div>
          </>
        )}
      </div>

      <BottomNav active="wellness" onNavigate={onNavigate} />
    </div>
  );
}
