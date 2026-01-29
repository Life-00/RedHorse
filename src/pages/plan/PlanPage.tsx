import { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, HelpCircle, Moon, Zap } from "lucide-react";
import type { ScreenType } from "../../types/app";
import BottomNav from "../../components/layout/BottomNav";
import { aiApi } from "../../lib/api";
import { useCurrentUser, useToday } from "../../hooks/useApi";
import type { SleepPlan } from "../../types/api";

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
  const { userId, loading: userLoading } = useCurrentUser();
  const today = useToday();
  
  const [sleepPlan, setSleepPlan] = useState<SleepPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Sleep plan 데이터 로드
  useEffect(() => {
    if (!userId || userLoading) return;

    const loadSleepPlan = async () => {
      try {
        setLoading(true);
        const response = await aiApi.getSleepPlan(userId, today);
        setSleepPlan(response.sleep_plan);
        console.log('✅ 수면 계획 로드 성공:', response.sleep_plan);
      } catch (error) {
        console.error('❌ 수면 계획 로드 실패:', error);
        // 수면 계획이 없으면 생성
        try {
          const createResponse = await aiApi.generateSleepPlan(userId, today);
          setSleepPlan(createResponse.sleep_plan);
          console.log('✅ 수면 계획 생성 성공:', createResponse.sleep_plan);
        } catch (createError) {
          console.error('❌ 수면 계획 생성 실패:', createError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadSleepPlan();
  }, [userId, userLoading, today]);

  const timeBlocks = useMemo<TimeBlock[]>(
    () => {
      if (!sleepPlan) {
        // 기본 더미 데이터
        return [
          { time: "08:00", label: "메인 수면", type: "sleep-start" },
          { time: "19:00", label: "파워냅", type: "nap-start" },
        ];
      }

      // API 데이터로 타임블록 생성
      const blocks: TimeBlock[] = [];
      
      // ISO 형식의 TIMESTAMP를 Date 객체로 변환하여 정렬용으로 사용
      const mainSleepStartDate = new Date(sleepPlan.main_sleep_start);
      
      // 메인 수면 (시작 시간만 표시)
      blocks.push({
        time: sleepPlan.main_sleep_start,
        label: "메인 수면",
        type: "sleep-start"
      });

      // 파워냅이 있으면 추가 (시작 시간만 표시)
      if (sleepPlan.nap_start && sleepPlan.nap_end && sleepPlan.nap_duration) {
        const napStartDate = new Date(sleepPlan.nap_start);
        
        blocks.push({
          time: sleepPlan.nap_start,
          label: "파워냅",
          type: "nap-start"
        });
      }

      // TIMESTAMP 기준으로 정렬 (날짜+시간 모두 고려)
      return blocks.sort((a, b) => {
        const dateA = new Date(a.time);
        const dateB = new Date(b.time);
        return dateA.getTime() - dateB.getTime();
      });
    },
    [sleepPlan]
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
  </div>
</div>


      {/* ✅ 스크롤 영역(여기만 스크롤) */}
      <div className="flex-1 overflow-y-auto px-7 py-8 pb-32">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-gray-100" />

          <div className="space-y-8">
            {timeBlocks.map((block, idx) => {
              const type = block.type ?? "none";
              const isSleep = type === "sleep-start";
              const isNap = type === "nap-start";

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
                      {/* ISO 형식에서 시간만 추출 (HH:MM) */}
                      {block.time && block.time.includes('T') 
                        ? new Date(block.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                        : block.time || '시간 미정'}
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
                    {type === "sleep-start" && sleepPlan && (
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
                        <div className="space-y-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[11px] text-indigo-600 font-bold uppercase tracking-wide">권장 수면 시간</span>
                            <span className="text-[24px] font-black text-indigo-900 leading-none">
                              {Math.floor(sleepPlan.main_sleep_duration)}시간 {Math.round((sleepPlan.main_sleep_duration % 1) * 60)}분
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[13px] font-bold text-indigo-700">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-indigo-500 uppercase tracking-wide">취침</span>
                              <span className="text-[15px] font-black">
                                {sleepPlan.main_sleep_start && sleepPlan.main_sleep_start.includes('T') 
                                  ? new Date(sleepPlan.main_sleep_start).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                                  : sleepPlan.main_sleep_start || '미정'}
                              </span>
                            </div>
                            <span className="text-indigo-300">→</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-indigo-500 uppercase tracking-wide">기상</span>
                              <span className="text-[15px] font-black">
                                {sleepPlan.main_sleep_end && sleepPlan.main_sleep_end.includes('T')
                                  ? new Date(sleepPlan.main_sleep_end).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                                  : sleepPlan.main_sleep_end || '미정'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {type === "nap-start" && sleepPlan && sleepPlan.nap_duration && (
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
                        <div className="space-y-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[11px] text-purple-600 font-bold uppercase tracking-wide">파워냅 시간</span>
                            <span className="text-[24px] font-black text-purple-900 leading-none">
                              {Math.round(sleepPlan.nap_duration * 60)}분
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[13px] font-bold text-purple-700">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-purple-500 uppercase tracking-wide">시작</span>
                              <span className="text-[15px] font-black">
                                {sleepPlan.nap_start && sleepPlan.nap_start.includes('T')
                                  ? new Date(sleepPlan.nap_start).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                                  : sleepPlan.nap_start || '미정'}
                              </span>
                            </div>
                            <span className="text-purple-300">→</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-purple-500 uppercase tracking-wide">종료</span>
                              <span className="text-[15px] font-black">
                                {sleepPlan.nap_end && sleepPlan.nap_end.includes('T')
                                  ? new Date(sleepPlan.nap_end).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                                  : sleepPlan.nap_end || '미정'}
                              </span>
                            </div>
                          </div>
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

          {loading ? (
            <div className="text-center py-4">
              <div className="text-gray-400 text-[14px] font-medium">로딩 중...</div>
            </div>
          ) : sleepPlan && sleepPlan.rationale ? (
            <div className="text-[14px] text-gray-600 font-medium leading-relaxed">
              {sleepPlan.rationale}
            </div>
          ) : (
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
          )}
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

      {/* Bottom Navigation */}
      <BottomNav active="plan" onNavigate={onNavigate} />
    </div>
  );
}
