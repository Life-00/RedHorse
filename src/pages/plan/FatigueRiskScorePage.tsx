// src/pages/plan/FatigueRiskScorePage.tsx
import { useMemo } from "react";
import { AlertTriangle, Moon, Car, Bus, ArrowRight } from "lucide-react";
import type { ScreenType } from "../../types/app";
import TopBar from "../../components/layout/TopBar";
import BottomNav from "../../components/layout/BottomNav";

type RiskLevel = "low" | "medium" | "high";

type Props = {
  onNavigate: (screen: ScreenType) => void;
};

function RiskBadge({
  level,
  size = "lg",
}: {
  level: RiskLevel;
  size?: "sm" | "md" | "lg";
}) {
  const cfg = useMemo(() => {
    if (level === "low")
      return {
        label: "낮음",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        ring: "ring-emerald-200",
        dot: "bg-emerald-500",
      };
    if (level === "high")
      return {
        label: "높음",
        bg: "bg-rose-50",
        text: "text-rose-700",
        ring: "ring-rose-200",
        dot: "bg-rose-500",
      };
    return {
      label: "중간",
      bg: "bg-amber-50",
      text: "text-amber-700",
      ring: "ring-amber-200",
      dot: "bg-amber-500",
    };
  }, [level]);

  const pad =
    size === "sm" ? "px-3 py-1.5 text-xs" : size === "md" ? "px-4 py-2 text-sm" : "px-5 py-2.5 text-sm";
  const dotSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";

  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-full ring-1",
        cfg.bg,
        cfg.text,
        cfg.ring,
        pad,
      ].join(" ")}
      aria-label={`risk-badge-${level}`}
    >
      <span className={`${dotSize} rounded-full ${cfg.dot}`} />
      <span className="font-black">{cfg.label}</span>
    </div>
  );
}

export default function FatigueRiskScorePage({ onNavigate }: Props) {
  // 일단은 고정 값(나중에 백엔드/상태 연동)
  const level: RiskLevel = "medium";

  return (
    <div className="h-full w-full bg-[#F8F9FD] flex flex-col overflow-hidden relative">
      <TopBar title="피로 위험도" onNavigate={onNavigate} backTo="home" />

      <div className="flex-1 overflow-y-auto pb-28">
        {/* Header 설명 */}
        <div className="px-7 pt-2 pb-6 border-b border-gray-100 bg-white">
          <div className="text-[12px] font-black text-gray-400">오늘의 안전 상태 평가</div>
          <div className="text-[20px] font-black text-gray-900 mt-1">피로 위험도</div>
        </div>

        {/* Risk Meter */}
        <div className="px-7 py-8">
          <div className="text-center mb-6">
            <div className="text-5xl font-black text-amber-600 mb-2">중간</div>
            <RiskBadge level={level} size="lg" />
          </div>

          {/* Visual Meter */}
          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-emerald-400 to-emerald-500" />
            <div className="absolute inset-y-0 left-1/3 w-1/3 bg-gradient-to-r from-amber-400 to-amber-500" />
            <div className="absolute inset-y-0 left-2/3 w-1/3 bg-gradient-to-r from-rose-400 to-rose-500" />

            {/* Current Indicator (중간 기준 45%) */}
            <div className="absolute top-1/2 -translate-y-1/2 left-[45%] w-4 h-4 bg-white border-2 border-amber-600 rounded-full shadow-lg" />
          </div>

          <div className="flex justify-between mt-2 text-xs font-black text-gray-400">
            <span>낮음</span>
            <span>중간</span>
            <span>높음</span>
          </div>
        </div>

        {/* Inputs Summary */}
        <div className="px-7 pb-6">
          <div className="text-sm font-black text-gray-700 mb-3">위험도 계산 근거</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-sm font-black text-gray-900">평균 수면 시간</div>
                  <div className="text-xs font-black text-gray-400">최근 7일</div>
                </div>
              </div>
              <div className="text-base font-black text-amber-600">5.5시간</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-sm font-black text-gray-900">연속 야간 근무</div>
                  <div className="text-xs font-black text-gray-400">현재 사이클</div>
                </div>
              </div>
              <div className="text-base font-black text-amber-600">3일째</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-sm font-black text-gray-900">통근 운전 시간</div>
                  <div className="text-xs font-black text-gray-400">편도 기준</div>
                </div>
              </div>
              <div className="text-base font-black text-gray-900">30분</div>
            </div>
          </div>
        </div>

        {/* Safety Mode Recommendations */}
        <div className="px-7 pb-6">
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-black text-amber-900">안전 모드 권장사항</h3>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3 p-3 bg-white rounded-xl">
                <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Car className="w-4 h-4 text-rose-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-black text-gray-900 mb-1">퇴근 후 운전 피하기</div>
                  <div className="text-xs font-black text-gray-500">가능하면 대중교통 이용</div>
                </div>
              </div>

              <div className="flex gap-3 p-3 bg-white rounded-xl">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Moon className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-black text-gray-900 mb-1">파워냅 우선 실행</div>
                  <div className="text-xs font-black text-gray-500">근무 전 15-30분 권장</div>
                </div>
              </div>

              <div className="flex gap-3 p-3 bg-white rounded-xl">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bus className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-black text-gray-900 mb-1">대중교통 권장</div>
                  <div className="text-xs font-black text-gray-500">이동 중 휴식 가능</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-center font-black text-gray-400 mt-6">
            의료 진단이 아닌 정보 제공 목적입니다
          </div>
        </div>

        {/* Action Button (고정 위치) */}
        <div className="px-7">
          <div className="sticky bottom-28">
            <button
              className="w-full bg-amber-600 text-white py-4 rounded-full flex items-center justify-center gap-2 shadow-lg active:scale-[0.99]"
              onClick={() => onNavigate("plan")}
            >
              오늘 리스크 줄이기
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <BottomNav active="plan" onNavigate={onNavigate} />
    </div>
  );
}
