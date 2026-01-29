import { useMemo, useEffect, useState } from "react";
import {
  Coffee,
  Sun,
  Lightbulb,
  Activity,
  Timer,
  AlertTriangle,
} from "lucide-react";

import type { ScreenType } from "../../types/app";
import TopBar from "../../components/layout/TopBar";
import BottomNav from "../../components/layout/BottomNav";
import { aiApi } from "../../lib/api";
import { useCurrentUser, useToday } from "../../hooks/useApi";
import type { CaffeinePlan } from "../../types/api";

type Props = {
  onNavigate: (s: ScreenType) => void;
};

export default function CaffeineCutoffPage({ onNavigate }: Props) {
  const { userId, loading: userLoading } = useCurrentUser();
  const today = useToday();
  
  const [caffeinePlan, setCaffeinePlan] = useState<CaffeinePlan | null>(null);
  const [loading, setLoading] = useState(true);

  // 카페인 계획 로드
  useEffect(() => {
    if (!userId || userLoading) return;

    const loadCaffeinePlan = async () => {
      try {
        setLoading(true);
        const response = await aiApi.getCaffeinePlan(userId, today);
        setCaffeinePlan(response.caffeine_plan);
      } catch (error) {
        console.error('카페인 계획 로드 실패:', error);
        // 계획이 없으면 생성
        try {
          const createResponse = await aiApi.generateCaffeinePlan(userId, today);
          setCaffeinePlan(createResponse.caffeine_plan);
        } catch (createError) {
          console.error('카페인 계획 생성 실패:', createError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadCaffeinePlan();
  }, [userId, userLoading, today]);

  // cutoff_time에서 시간 추출 (HH:MM:SS 형식)
  const cutoffHour = useMemo(() => {
    if (!caffeinePlan?.cutoff_time) return 21;
    const timeStr = caffeinePlan.cutoff_time;
    const hour = parseInt(timeStr.split(':')[0], 10);
    return hour;
  }, [caffeinePlan]);

  // 원 둘레(대략) = 2πr, r=90 -> 약 565.486...
  const circumference = 565;

  const safeDash = useMemo(
    () => `${(cutoffHour / 24) * circumference} ${circumference}`,
    [cutoffHour]
  );

  const dangerDash = useMemo(
    () => `${((24 - cutoffHour) / 24) * circumference} ${circumference}`,
    [cutoffHour]
  );

  const dangerOffset = useMemo(
    () => `${-(cutoffHour / 24) * circumference}`,
    [cutoffHour]
  );

  if (loading) {
    return (
      <div className="h-full w-full bg-[#F8F9FD] flex flex-col overflow-hidden relative">
        <TopBar title="카페인 컷오프" onNavigate={onNavigate} backTo="wellness" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-600 font-bold">카페인 계획을 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#F8F9FD] flex flex-col overflow-hidden">
      <TopBar title="카페인 컷오프" onNavigate={onNavigate} backTo="wellness" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        {/* Header 설명 */}
        <div className="px-7 pt-2 pb-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => onNavigate("wellness")}
              className="flex items-center justify-center text-indigo-600 hover:text-indigo-700 active:scale-95 transition-all"
              aria-label="뒤로가기"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-[20px] font-black text-gray-900">카페인 컷오프</div>
          </div>
          <div className="text-[12px] font-black text-gray-400 ml-9">수면 품질을 위한 마지막 허용 시각</div>
        </div>

        <div className="px-6 py-8">
        {/* Clock */}
        <div className="relative w-64 h-64 mx-auto">
          <svg className="w-full h-full" viewBox="0 0 200 200">
            {/* Background */}
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="20"
            />

            {/* Danger zone - 매우 연한 회색 (먹으면 안되는 시간, 끝이 각지게) - 먼저 그리기 */}
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="20"
              strokeDasharray={dangerDash}
              strokeDashoffset={dangerOffset}
              strokeLinecap="butt"
              transform="rotate(-90 100 100)"
            />

            {/* Safe zone - 주황색 (먹어도 되는 시간, 끝이 둥글게) - 나중에 그려서 위에 표시 */}
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#fb923c"
              strokeWidth="20"
              strokeDasharray={safeDash}
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
            />
          </svg>

          {/* Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Coffee className="w-8 h-8 text-amber-600 mb-2" />
            <div className="text-3xl font-semibold text-gray-900">
              {caffeinePlan?.cutoff_time || '21:00'}
            </div>
            <div className="text-sm text-gray-500">이전까지</div>
          </div>

          {/* Markers */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4">
            <div className="text-xs text-gray-400">00:00</div>
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4">
            <div className="text-xs text-gray-400">12:00</div>
          </div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8">
            <div className="text-xs text-gray-400">18:00</div>
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-8">
            <div className="text-xs text-gray-400">06:00</div>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-amber-900 mb-1">
              {caffeinePlan?.recommendations || '카페인 반감기: 약 5시간'}
            </div>
            <div className="text-xs text-amber-700">
              최대 권장 섭취량: {caffeinePlan?.max_intake_mg || 400}mg
            </div>
          </div>
        </div>
      </div>

      {/* Quick log */}
      <div className="px-6 pb-4">
        <div className="text-sm font-medium text-gray-700 mb-3">
          카페인 섭취 기록
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            {
              icon: Coffee,
              label: "커피",
              color: "bg-amber-50 text-amber-700 border-amber-200",
            },
            {
              icon: Coffee,
              label: "에너지",
              color: "bg-blue-50 text-blue-700 border-blue-200",
            },
            {
              icon: Coffee,
              label: "차",
              color: "bg-green-50 text-green-700 border-green-200",
            },
            {
              icon: Sun,
              label: "없음",
              color: "bg-gray-50 text-gray-700 border-gray-200",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={`p-3 rounded-xl border ${item.color} flex flex-col items-center gap-2 text-xs font-bold`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Alternatives */}
      <div className="px-6 pb-6">
        <div className="text-sm font-medium text-gray-700 mb-3">
          대체 각성 방법
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-blue-900">
                밝은 빛 노출
              </div>
              <div className="text-xs text-blue-700">10-15분 효과적</div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-purple-900">
                가벼운 활동
              </div>
              <div className="text-xs text-purple-700">혈액순환 개선</div>
            </div>
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Timer className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-indigo-900">
                15분 파워냅
              </div>
              <div className="text-xs text-indigo-700">피로 회복 최고</div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <BottomNav active="wellness" onNavigate={onNavigate} />
    </div>
  );
}
