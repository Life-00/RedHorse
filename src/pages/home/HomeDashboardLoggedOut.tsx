// src/pages/home/HomeDashboard.tsx
import { motion } from "framer-motion";
import {
  Moon,
  Zap,
  ChevronRight,
  Clock,
  Coffee,
  AlertTriangle,
  CheckCircle2,
  Circle,
  LogOut,
} from "lucide-react";
import type { ScreenType } from "../../types/app";
import BottomNav from "../../components/layout/BottomNav";
import RiskBadge from "../../components/shared/RiskBadge";
import { authSignOut } from "../../lib/auth";

type Props = {
  onNavigate: (s: ScreenType) => void;
  onLogoutDone: () => void;
};

export default function HomeDashboard({ onNavigate, onLogoutDone }: Props) {
  const handleLogout = async () => {
    try {
      await authSignOut(); // ✅ Cognito 세션 로그아웃
    } finally {
      onLogoutDone(); // ✅ 화면 전환
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F8F9FD]">
      <div className="px-7 pt-4 pb-6 bg-white rounded-b-[32px] shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-gray-400 text-[12px] font-black mb-1 uppercase tracking-widest">
              2026. 01. 27 TUE
            </div>
            <h1 className="text-[26px] font-black tracking-tight">안녕하세요, 지연님</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* 로그아웃(임시 위치: 상단) */}
            <button
              onClick={handleLogout}
              className="p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700"
              aria-label="로그아웃"
              title="로그아웃"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* 프로필 이동 */}
            <button
              onClick={() => onNavigate("profile")}
              className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner hover:bg-gray-100"
              aria-label="프로필"
              title="프로필"
            >
              👤
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-[#F8F7FF] rounded-[24px] border border-indigo-50 shadow-sm">
          <div className="w-11 h-11 bg-[#5843E4] rounded-2xl flex items-center justify-center shadow-lg shadow-[#5843E4]/20">
            <Moon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-black text-gray-900">오늘의 스케줄: 야간</div>
            <div className="text-[12px] text-gray-400 font-bold">22:00 – 07:00 근무 예정</div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-7 pt-7 space-y-5 overflow-y-auto pb-36">
        <motion.div
          whileTap={{ scale: 0.98 }}
          className="bg-gradient-to-br from-[#5843E4] to-[#7D6DF2] rounded-[32px] p-7 text-white shadow-2xl shadow-[#5843E4]/30"
        >
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div className="text-[11px] font-black px-3 py-1.5 bg-white/20 rounded-full backdrop-blur-md">
              OPTIMIZER
            </div>
          </div>
          <div className="text-[14px] opacity-80 font-bold mb-1">권장 수면창</div>
          <div className="text-[30px] font-black mb-6 tracking-tight">08:00 – 15:30</div>
          <div className="h-[1px] bg-white/20 mb-6" />
          <div className="flex justify-between items-center text-[13.5px] font-black">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 opacity-70" />
              <span>7.5시간 숙면 목표</span>
            </div>
            <ChevronRight className="w-5 h-5 opacity-70" />
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-[30px] shadow-sm border border-gray-50">
            <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
              <Coffee className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-[12px] text-gray-400 font-black mb-1">카페인 컷오프</div>
            <div className="text-[18px] font-black text-gray-900">21:00 이전</div>
          </div>

          <div className="bg-white p-5 rounded-[30px] shadow-sm border border-gray-50">
            <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div className="text-[12px] text-gray-400 font-black mb-1">피로 위험도</div>
            <div className="flex items-center gap-2">
              <div className="text-[18px] font-black text-gray-900">중간</div>
              <RiskBadge level="medium" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50">
          <h3 className="text-[16px] font-black mb-5 tracking-tight">오늘의 체크리스트</h3>
          <div className="space-y-3.5">
            {[
              { text: "메인 수면 7시간 달성", done: true },
              { text: "퇴근 시 선글라스 착용", done: false },
              { text: "근무 전 카페인 섭취", done: false },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50"
              >
                {item.done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-200" />
                )}
                <span className={`text-[14px] font-bold ${item.done ? "text-gray-300 line-through" : "text-gray-600"}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav active="home" onNavigate={onNavigate} />
    </div>
  );
}
