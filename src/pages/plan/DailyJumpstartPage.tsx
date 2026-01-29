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
import { generateDummyJumpstart } from "../../utils/dummyData";

type Props = {
  onNavigate: (s: ScreenType) => void;
};

// 더미 데이터 타입 정의
type DummyTask = {
  id: number;
  task_name: string;
  completed: boolean;
};

type DummyBlock = {
  id: number;
  block_type: string;
  block_name: string;
  duration_minutes: number;
  tasks: DummyTask[];
};

export default function DailyJumpstartPage({ onNavigate }: Props) {
  const [blocks, setBlocks] = useState<DummyBlock[]>([]);
  const [loading, setLoading] = useState(true);

  // 더미 점프스타트 데이터 로드
  useEffect(() => {
    const loadJumpstartData = () => {
      try {
        setLoading(true);
        const dummyData = generateDummyJumpstart();
        setBlocks(dummyData.blocks);
      } catch (error) {
        console.error('점프스타트 데이터 로드 실패:', error);
        setBlocks([]);
      } finally {
        setLoading(false);
      }
    };

    // 약간의 로딩 시뮬레이션
    setTimeout(loadJumpstartData, 300);
  }, []);

  // 작업 완료 상태 토글
  const toggleTask = (taskId: number, currentCompleted: boolean) => {
    setBlocks(prevBlocks => 
      prevBlocks.map(block => ({
        ...block,
        tasks: block.tasks.map(task => 
          task.id === taskId 
            ? { ...task, completed: !currentCompleted }
            : task
        )
      }))
    );
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="h-full w-full bg-[#F8F9FD] flex flex-col overflow-hidden relative">
        <TopBar title="오늘의 점프스타트" onNavigate={onNavigate} backTo="plan" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-600 font-bold">점프스타트를 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#F8F9FD] flex flex-col overflow-hidden relative">
      <TopBar title="오늘의 점프스타트" onNavigate={onNavigate} backTo="plan" />

      {/* Header */}
      <div className="shrink-0 px-7 pt-3 pb-6 border-b border-gray-100 bg-white">
        <div className="text-[12px] font-black text-gray-400">구조화된 하루 준비 플랜</div>
        <div className="text-[20px] font-black text-gray-900 mt-1">오늘의 점프스타트</div>
      </div>

      {/* Plan Blocks */}
      <div className="flex-1 px-7 py-6 space-y-4 overflow-y-auto pb-32">
        {blocks.length > 0 ? (
          blocks.map((block) => {
            const getIcon = (blockType: string) => {
              switch (blockType) {
                case 'now': return Zap;
                case 'must_do': return Clock;
                case 'recovery': return RefreshCw;
                default: return Clock;
              }
            };

            const getColor = (blockType: string) => {
              switch (blockType) {
                case 'now': return 'from-rose-500 to-pink-500';
                case 'must_do': return 'from-indigo-500 to-purple-500';
                case 'recovery': return 'from-emerald-500 to-teal-500';
                default: return 'from-gray-500 to-gray-600';
              }
            };

            const Icon = getIcon(block.block_type);
            const color = getColor(block.block_type);
            
            // 완료된 작업 수 계산
            const completedTasks = block.tasks.filter(task => task.completed).length;
            const totalTasks = block.tasks.length;
            const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

            return (
              <div
                key={block.id}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Block Header */}
                <div className={`bg-gradient-to-r ${color} p-5 text-white`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-xl font-black">{block.block_name}</div>
                        <div className="text-sm opacity-90 font-bold">
                          {block.block_type === 'now' && '지금 바로'}
                          {block.block_type === 'must_do' && '필수 실행'}
                          {block.block_type === 'recovery' && '회복 루틴'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs opacity-90 font-bold">예상 시간</div>
                      <div className="text-lg font-black">{block.duration_minutes}분</div>
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
                    {completedTasks} / {totalTasks} 완료
                  </div>
                </div>

                {/* Tasks */}
                <div className="p-5 space-y-3">
                  {block.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(task.id, task.completed)}
                      className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left active:scale-[0.99]"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-300 flex-shrink-0" />
                      )}

                      <div className="flex-1">
                        <div
                          className={[
                            "text-sm font-bold",
                            task.completed ? "line-through text-gray-400" : "text-gray-900",
                          ].join(" ")}
                        >
                          {task.task_name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-[16px] font-bold mb-2">
              점프스타트 데이터가 없습니다
            </div>
            <div className="text-gray-400 text-[14px]">
              새로고침하여 점프스타트를 생성해보세요
            </div>
          </div>
        )}

        <div className="text-xs text-center text-gray-400 py-2 font-bold">
          개인 상황에 맞게 조정 가능합니다
        </div>
      </div>

      <BottomNav active="plan" onNavigate={onNavigate} />
    </div>
  );
}
