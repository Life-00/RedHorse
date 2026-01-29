// src/pages/plan/FatigueRiskScorePage.tsx
import { useMemo, useEffect, useState } from "react";
import { AlertTriangle, Moon, Car, Bus, ArrowRight } from "lucide-react";
import type { ScreenType } from "../../types/app";
import TopBar from "../../components/layout/TopBar";
import BottomNav from "../../components/layout/BottomNav";
import { fatigueApi } from "../../lib/api";
import { useCurrentUser, useToday } from "../../hooks/useApi";

type RiskLevel = "low" | "medium" | "high";

type Props = {
  onNavigate: (screen: ScreenType) => void;
};

interface FatigueAssessment {
  id: number;
  user_id: string;
  assessment_date: string;
  sleep_hours: number;
  consecutive_night_shifts: number;
  commute_time: number;
  risk_level: RiskLevel;
  risk_score: number;
  safety_recommendations: string;
}

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
  const { userId, loading: userLoading } = useCurrentUser();
  const today = useToday();
  
  const [assessment, setAssessment] = useState<FatigueAssessment | null>(null);
  const [loading, setLoading] = useState(true);

  // 피로 위험도 평가 로드
  useEffect(() => {
    if (!userId || userLoading) return;

    const loadFatigueAssessment = async () => {
      try {
        setLoading(true);
        const response = await fatigueApi.getFatigueAssessment(userId, today);
        setAssessment(response.assessment);
      } catch (error) {
        console.error('피로 위험도 로드 실패:', error);
        // 평가가 없으면 생성
        try {
          const createResponse = await fatigueApi.calculateFatigueRisk(userId, today);
          setAssessment(createResponse.assessment);
        } catch (createError) {
          console.error('피로 위험도 생성 실패:', createError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadFatigueAssessment();
  }, [userId, userLoading, today]);

  const level: RiskLevel = assessment?.risk_level || "medium";
  const riskScore = assessment?.risk_score || 0;

  // 위험도 레벨 텍스트
  const riskLevelText = useMemo(() => {
    if (level === "low") return "낮음";
    if (level === "high") return "높음";
    return "중간";
  }, [level]);

  // 위험도 레벨 색상
  const riskLevelColor = useMemo(() => {
    if (level === "low") return "text-emerald-600";
    if (level === "high") return "text-rose-600";
    return "text-amber-600";
  }, [level]);

  // 미터 위치 계산 (0-100 점수를 0-100% 위치로 변환)
  const meterPosition = useMemo(() => {
    return `${riskScore}%`;
  }, [riskScore]);

  if (loading) {
    return (
      <div className="h-full w-full bg-[#F8F9FD] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600 font-bold">피로 위험도를 계산하는 중...</div>
        </div>
      </div>
    );
  }

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
            <div className={`text-5xl font-black ${riskLevelColor} mb-2`}>{riskLevelText}</div>
            <RiskBadge level={level} size="lg" />
          </div>

          {/* Visual Meter */}
          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-emerald-400 to-emerald-500" />
            <div className="absolute inset-y-0 left-1/3 w-1/3 bg-gradient-to-r from-amber-400 to-amber-500" />
            <div className="absolute inset-y-0 left-2/3 w-1/3 bg-gradient-to-r from-rose-400 to-rose-500" />

            {/* Current Indicator */}
            <div 
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 rounded-full shadow-lg ${
                level === "low" ? "border-emerald-600" :
                level === "high" ? "border-rose-600" :
                "border-amber-600"
              }`}
              style={{ left: meterPosition, transform: 'translate(-50%, -50%)' }}
            />
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
              <div className={`text-base font-black ${riskLevelColor}`}>
                {assessment?.sleep_hours || 0}시간
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-sm font-black text-gray-900">연속 야간 근무</div>
                  <div className="text-xs font-black text-gray-400">현재 사이클</div>
                </div>
              </div>
              <div className={`text-base font-black ${riskLevelColor}`}>
                {assessment?.consecutive_night_shifts || 0}일째
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-sm font-black text-gray-900">통근 운전 시간</div>
                  <div className="text-xs font-black text-gray-400">편도 기준</div>
                </div>
              </div>
              <div className="text-base font-black text-gray-900">
                {assessment?.commute_time || 0}분
              </div>
            </div>
          </div>
        </div>

        {/* Safety Mode Recommendations */}
        {assessment?.safety_recommendations && (
          <div className="px-7 pb-6">
            <div className={`p-5 border rounded-2xl ${
              level === "low" ? "bg-emerald-50 border-emerald-200" :
              level === "high" ? "bg-rose-50 border-rose-200" :
              "bg-amber-50 border-amber-200"
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className={`w-5 h-5 ${
                  level === "low" ? "text-emerald-600" :
                  level === "high" ? "text-rose-600" :
                  "text-amber-600"
                }`} />
                <h3 className={`font-black ${
                  level === "low" ? "text-emerald-900" :
                  level === "high" ? "text-rose-900" :
                  "text-amber-900"
                }`}>안전 모드 권장사항</h3>
              </div>

              <div className="text-sm font-medium leading-relaxed whitespace-pre-line">
                {assessment.safety_recommendations}
              </div>
            </div>

            <div className="text-xs text-center font-black text-gray-400 mt-6">
              의료 진단이 아닌 정보 제공 목적입니다
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="px-7">
          <div className="sticky bottom-28">
            <button
              className={`w-full text-white py-4 rounded-full flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] ${
                level === "low" ? "bg-emerald-600" :
                level === "high" ? "bg-rose-600" :
                "bg-amber-600"
              }`}
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
