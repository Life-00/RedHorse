import { useMemo } from "react";
import { motion } from "framer-motion";
import { Bell, HelpCircle, Moon, Zap,ArrowRight, AlertTriangle } from "lucide-react";
import type { ScreenType } from "../../types/app";
import BottomNav from "../../components/layout/BottomNav";

type Props = {
  onNavigate: (s: ScreenType) => void;
};

type BlockType = "sleep-start" | "sleep-end" | "nap-start" | "nap-end" | "none";

type TimeBlock = {
  time: string;
  label: string;
  type?: BlockType;
};

export default function PlanPage({ onNavigate }: Props) {
  const timeBlocks = useMemo<TimeBlock[]>(
    () => [
      { time: "06:00", label: "야간 근무 종료", type: "none" },
      { time: "08:00", label: "메인 수면 시작", type: "sleep-start" },
      { time: "12:00", label: "", type: "none" },
      { time: "15:00", label: "메인 수면 종료", type: "sleep-end" },
      { time: "19:00", label: "파워냅 시작", type: "nap-start" },
      { time: "19:30", label: "파워냅 종료", type: "nap-end" },
      { time: "22:00", label: "야간 근무 시작", type: "none" },
    ],
    []
  );

  return (
    // ✅ 핵심: 높이 고정 + flex column + overflow hidden
    <div className="h-full w-full bg-[#F8F9FD] rounded-3xl overflow-hidden border border-slate-100 flex flex-col">
     {/* Header (고정) */}
<div className="shrink-0 px-7 pt-6 pb-6 bg-white shadow-sm border-b border-gray-100">
  <div className="flex items-start justify-between gap-4">
    <div>
      <h1 className="text-[24px] font-bold text-[#1A1A1A] mb-1">수면창 계획</h1>
      <p className="text-[14px] text-[#8E8E8E] font-medium">
        오늘의 최적화된 수면 시간표
      </p>
    </div>

    {/* ✅ 피로 위험도 진입 버튼 */}
    <button
      onClick={() => onNavigate("fatigue-risk")}
      className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-bold text-[13px] active:scale-95"
    >
      <AlertTriangle className="w-4 h-4" />
      피로 위험도
      <ArrowRight className="w-4 h-4" />
    </button>
  </div>
</div>


      {/* ✅ 스크롤 영역(여기만 스크롤) */}
      <div className="flex-1 overflow-y-auto px-7 py-8 pb-40">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-gray-100" />

          <div className="space-y-8">
            {timeBlocks.map((block, idx) => {
              const type = block.type ?? "none";
              const isSleep = type === "sleep-start" || type === "sleep-end";
              const isNap = type === "nap-start" || type === "nap-end";

              return (
                <div key={idx} className="relative flex gap-6">
                  {/* Indicator */}
                  <div
                    className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-all ${
                      isSleep
                        ? "bg-[#5843E4] text-white shadow-indigo-100"
                        : isNap
                        ? "bg-purple-500 text-white shadow-purple-100"
                        : "bg-white border-2 border-gray-100 text-gray-300"
                    }`}
                  >
                    {isSleep || isNap ? (
                      <Moon className="w-6 h-6" />
                    ) : (
                      <div className="w-2 h-2 bg-gray-200 rounded-full" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="text-[13px] font-black text-gray-400 mb-1 tracking-wider uppercase">
                      {block.time}
                    </div>

                    {block.label && (
                      <div
                        className={`text-[16px] font-bold ${
                          isSleep
                            ? "text-[#5843E4]"
                            : isNap
                            ? "text-purple-600"
                            : "text-gray-700"
                        }`}
                      >
                        {block.label}
                      </div>
                    )}

                    {/* Detail cards */}
                    {type === "sleep-start" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-5 bg-indigo-50/80 rounded-[24px] border border-indigo-100"
                      >
                        <div className="flex items-center gap-2.5 mb-2">
                          <Moon className="w-4 h-4 text-[#5843E4]" />
                          <span className="text-[13px] font-bold text-indigo-900">
                            메인 수면 세션
                          </span>
                        </div>
                        <div className="text-[26px] font-black text-indigo-900 mb-1 leading-tight tracking-tight">
                          7시간
                        </div>
                        <div className="text-[12px] text-indigo-700 font-medium opacity-80 uppercase tracking-wide">
                          08:00 – 15:00
                        </div>
                      </motion.div>
                    )}

                    {type === "nap-start" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-5 bg-purple-50/80 rounded-[24px] border border-purple-100"
                      >
                        <div className="flex items-center gap-2.5 mb-2">
                          <Zap className="w-4 h-4 text-purple-600" />
                          <span className="text-[13px] font-bold text-purple-900">
                            회복 파워냅
                          </span>
                        </div>
                        <div className="text-[26px] font-black text-purple-900 mb-1 leading-tight tracking-tight">
                          30분
                        </div>
                        <div className="text-[12px] text-purple-700 font-medium opacity-80 uppercase tracking-wide">
                          19:00 – 19:30
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rationale */}
        <div className="mt-12 p-6 bg-white rounded-[32px] shadow-sm border border-gray-50">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-[16px] font-bold text-gray-900">왜 이 시간인가요?</h3>
          </div>

          <div className="space-y-4">
            {[
              "야간 근무 후 최소 7시간의 회복 수면이 필요합니다",
              "생체리듬상 오전 수면이 상대적으로 효율적입니다",
              "근무 전 30분 파워냅으로 각성도를 올릴 수 있습니다",
            ].map((text, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 bg-gray-200" />
                <div className="text-[14px] text-gray-600 font-medium leading-relaxed">
                  {text}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-center text-gray-300 mt-10 font-bold tracking-tight">
          불확실하면 표시하지 않음 원칙을 따릅니다
        </div>
      </div>

      {/* ✅ 하단 액션 버튼: sticky로 고정 (스크롤과 충돌 X) */}
      <div className="shrink-0 px-6 pb-6">
        <div className="sticky bottom-24">
          <button className="w-full bg-[#5843E4] text-white py-4.5 rounded-[22px] flex items-center justify-center gap-3 font-bold text-lg shadow-xl shadow-indigo-100 transition-all active:scale-95">
            <Bell className="w-5 h-5" />
            수면 알림 설정
          </button>
        </div>
      </div>

      {/* Bottom Navigation (고정 네비를 공통 레이아웃에서 뺄 거면 여기 삭제) */}
      <div className="shrink-0">
        <BottomNav active="plan" onNavigate={onNavigate} />
      </div>
    </div>
  );
}
