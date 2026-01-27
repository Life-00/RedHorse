// src/pages/plan/DailyJumpstartPage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Zap,
  RefreshCw,
} from "lucide-react";
import type { ScreenType } from "../../types/app";
import TopBar from "../../components/layout/TopBar";
import BottomNav from "../../components/layout/BottomNav";

type Props = {
  onNavigate: (s: ScreenType) => void;
};

type Block = {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string; // tailwind gradient classes
  tasks: { id: string; text: string; time: string }[];
};

const STORAGE_KEY = "dailyJumpstartCheckedTaskIds";

export default function DailyJumpstartPage({ onNavigate }: Props) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // ✅ 로컬스토리지 로드
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const arr = JSON.parse(raw) as string[];
      if (Array.isArray(arr)) setCheckedIds(new Set(arr));
    } catch {
      // 깨진 값이면 무시
    }
  }, []);

  // ✅ 로컬스토리지 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(checkedIds)));
  }, [checkedIds]);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const blocks = useMemo<Block[]>(
    () => [
      {
        id: "now",
        title: "Now",
        subtitle: "지금 바로",
        duration: "15분",
        icon: Zap,
        color: "from-rose-500 to-pink-500",
        tasks: [
          { id: "now-1", text: "밝은 빛 노출 (햇빛 또는 블루라이트)", time: "10분" },
          { id: "now-2", text: "가벼운 스트레칭", time: "5분" },
        ],
      },
      {
        id: "must",
        title: "Must-do",
        subtitle: "필수 실행",
        duration: "90분",
        icon: Clock,
        color: "from-indigo-500 to-purple-500",
        tasks: [
          { id: "must-1", text: "메인 수면 (최우선)", time: "60분" },
          { id: "must-2", text: "식사 (단백질 중심)", time: "20분" },
          { id: "must-3", text: "통근 준비", time: "10분" },
        ],
      },
      {
        id: "recovery",
        title: "Recovery",
        subtitle: "회복 루틴",
        duration: "10분",
        icon: RefreshCw,
        color: "from-emerald-500 to-teal-500",
        tasks: [
          { id: "rec-1", text: "근무 전 파워냅", time: "15분" },
          { id: "rec-2", text: "심호흡 및 마인드풀니스", time: "5분" },
        ],
      },
    ],
    []
  );

  return (
    <div className="h-full w-full bg-[#F8F9FD] flex flex-col overflow-hidden relative">
      <TopBar title="오늘의 점프스타트" onNavigate={onNavigate} backTo="plan" />

      {/* Header */}
      <div className="shrink-0 px-7 pt-3 pb-6 border-b border-gray-100 bg-white">
        <div className="text-[12px] font-black text-gray-400">구조화된 하루 준비 플랜</div>
        <div className="text-[20px] font-black text-gray-900 mt-1">오늘의 점프스타트</div>
      </div>

      {/* Plan Blocks */}
      <div className="flex-1 px-7 py-6 space-y-4 overflow-y-auto pb-28">
        {blocks.map((block) => {
          const Icon = block.icon;

          const completed = block.tasks.filter((t) => checkedIds.has(t.id)).length;
          const total = block.tasks.length;
          const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

          return (
            <div
              key={block.id}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Block Header */}
              <div className={`bg-gradient-to-r ${block.color} p-5 text-white`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xl font-black">{block.title}</div>
                      <div className="text-sm opacity-90 font-bold">{block.subtitle}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs opacity-90 font-bold">예상 시간</div>
                    <div className="text-lg font-black">{block.duration}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-white rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-xs mt-2 opacity-90 font-bold">
                  {completed} / {total} 완료
                </div>
              </div>

              {/* Tasks */}
              <div className="p-5 space-y-3">
                {block.tasks.map((task) => {
                  const isChecked = checkedIds.has(task.id);

                  return (
                    <button
                      key={task.id}
                      onClick={() => toggleCheck(task.id)}
                      className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left active:scale-[0.99]"
                    >
                      {isChecked ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-300 flex-shrink-0" />
                      )}

                      <div className="flex-1">
                        <div
                          className={[
                            "text-sm font-bold",
                            isChecked ? "line-through text-gray-400" : "text-gray-900",
                          ].join(" ")}
                        >
                          {task.text}
                        </div>

                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 font-bold">
                          <Clock className="w-3 h-3" />
                          {task.time}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="text-xs text-center text-gray-400 py-2 font-bold">
          개인 상황에 맞게 조정 가능합니다
        </div>
      </div>

      <div className="shrink-0">
        <BottomNav active="plan" onNavigate={onNavigate} />
      </div>
    </div>
  );
}
