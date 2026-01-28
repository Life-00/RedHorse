// src/pages/wellness/WellnessPage.tsx
import { useEffect, useState } from "react";
import type { ScreenType } from "../../types/app";
import BottomNav from "../../components/layout/BottomNav";
import { Coffee, Moon, Sparkles, ChevronRight, Waves } from "lucide-react";
import { aiApi, wellnessApi } from "../../lib/api";
import { useCurrentUser, useToday } from "../../hooks/useApi";
import type { CaffeinePlan, SleepPlan } from "../../types/api";

export default function WellnessPage({
  onNavigate,
}: {
  onNavigate: (s: ScreenType) => void;
}) {
  const { userId, loading: userLoading } = useCurrentUser();
  const today = useToday();
  
  const [caffeinePlan, setCaffeinePlan] = useState<CaffeinePlan | null>(null);
  const [sleepPlan, setSleepPlan] = useState<SleepPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // 웰니스 데이터 로드
  useEffect(() => {
    if (!userId || userLoading) return;

    const loadWellnessData = async () => {
      try {
        setLoading(true);

        // 병렬로 데이터 로드
        const [caffeineResponse, sleepResponse] = await Promise.allSettled([
          aiApi.getCaffeinePlan(userId, today),
          aiApi.getSleepPlan(userId, today)
        ]);

        // 카페인 계획
        if (caffeineResponse.status === 'fulfilled') {
          setCaffeinePlan(caffeineResponse.value.caffeine_plan);
        } else {
          // 카페인 계획이 없으면 생성
          try {
            const createResponse = await aiApi.generateCaffeinePlan(userId, today);
            setCaffeinePlan(createResponse.caffeine_plan);
          } catch (error) {
            console.error('카페인 계획 생성 실패:', error);
          }
        }

        // 수면 계획
        if (sleepResponse.status === 'fulfilled') {
          setSleepPlan(sleepResponse.value.sleep_plan);
        } else {
          // 수면 계획이 없으면 생성
          try {
            const createResponse = await aiApi.generateSleepPlan(userId, today);
            setSleepPlan(createResponse.sleep_plan);
          } catch (error) {
            console.error('수면 계획 생성 실패:', error);
          }
        }

      } catch (error) {
        console.error('웰니스 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWellnessData();
  }, [userId, userLoading, today]);
  return (
    <div className="relative h-full flex flex-col bg-[#F8F9FD]">
      {/* Header */}
      <div className="px-7 pt-6 pb-6 bg-white rounded-b-[32px] shadow-sm border-b border-gray-100">
        <h1 className="text-[24px] font-black text-[#1A1A1A] mb-1">웰빙</h1>
        <p className="text-[14px] text-gray-400 font-bold">
          컨디션을 올리는 오늘의 추천
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-7 pt-6 pb-36 space-y-4 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-600 font-bold">웰니스 데이터를 불러오는 중...</div>
          </div>
        ) : (
          <>
            {/* Caffeine Cutoff */}
            <button
              onClick={() => onNavigate("caffeine")}
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

            {/* Sleep Window Plan */}
            <button
              onClick={() => onNavigate("plan")}
              className="w-full bg-white rounded-[28px] p-5 shadow-sm border border-gray-50 text-left active:scale-[0.99] transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <Moon className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-black text-gray-900">
                    수면창 계획
                  </div>
                  <div className="text-[12px] text-gray-400 font-bold">
                    오늘의 최적 수면 타임라인
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-4 rounded-[22px] bg-indigo-50/50 border border-indigo-100">
                  <div className="text-[12px] text-indigo-700 font-bold mb-1">
                    메인 수면
                  </div>
                  <div className="text-[14px] font-black text-indigo-900">
                    {sleepPlan ? `${sleepPlan.main_sleep_start}–${sleepPlan.main_sleep_end}` : '계산 중...'}
                  </div>
                </div>
                <div className="p-4 rounded-[22px] bg-purple-50/50 border border-purple-100">
                  <div className="text-[12px] text-purple-700 font-bold mb-1">
                    파워냅
                  </div>
                  <div className="text-[14px] font-black text-purple-900">
                    {sleepPlan && sleepPlan.nap_start && sleepPlan.nap_end 
                      ? `${sleepPlan.nap_start}–${sleepPlan.nap_end}`
                      : '권장 없음'
                    }
                  </div>
                </div>
              </div>
            </button>

            {/* ✅ Relaxation Hub */}
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
                곧 컨디션 카드, 피로 위험도, 회복 루틴이 추가됩니다.
              </p>
            </div>
          </>
        )}
      </div>

      <BottomNav active="wellness" onNavigate={onNavigate} />
    </div>
  );
}
