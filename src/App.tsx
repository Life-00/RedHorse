import React, { useState } from 'react';
import { Sun, Layers, Moon, Shuffle, Coffee, AlertCircle, ChevronRight, Apple } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function App() {
  const [step, setStep] = useState(1);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f9fafb] font-sans antialiased">
      <AnimatePresence mode="wait">
        {step === 1 && <Onboarding1 key="step1" onNext={() => setStep(2)} />}
        {step === 2 && <Onboarding2 key="step2" onNext={() => setStep(3)} />}
        {step === 3 && <HomeDashboard key="step3" userName="지연" />}
      </AnimatePresence>
    </div>
  );
}

// --- Screen 1: 근무 형태 선택 ---
function Onboarding1({ onNext }) {
  const shifts = [
    { id: '2', title: '2교대', sub: '주간/야간 순환', icon: Sun },
    { id: '3', title: '3교대', sub: '주간/중간/야간', icon: Layers },
    { id: 'night', title: '고정 야간', sub: '밤 근무 고정', icon: Moon },
    { id: 'irreg', title: '불규칙', sub: '변동 스케줄', icon: Shuffle },
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 bg-white min-h-screen">
      <div className="flex gap-1.5 mb-10 pt-4">
        <div className="h-1.5 w-5 bg-[#5d5cff] rounded-full" />
        <div className="h-1.5 w-1.5 bg-gray-200 rounded-full" />
      </div>
      <h1 className="text-3xl font-bold leading-tight mb-2">근무 형태를<br />선택해주세요</h1>
      <p className="text-gray-400 text-sm mb-10 font-medium">생체리듬 최적화를 위한 첫 단계입니다</p>

      <div className="space-y-3 mb-10">
        {shifts.map((s) => (
          <button key={s.id} onClick={onNext} className="w-full flex items-center gap-4 p-5 border border-gray-100 rounded-[24px] text-left hover:border-[#5d5cff] transition-all active:scale-[0.98]">
            <div className="p-3 bg-gray-50 rounded-xl text-gray-400"><s.icon size={22} /></div>
            <div>
              <div className="font-bold text-lg">{s.title}</div>
              <div className="text-xs text-gray-400 font-medium">{s.sub}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-auto">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">통근 시간 (분)</label>
        <div className="mt-2 p-4 bg-gray-50 rounded-[20px] text-lg font-bold">30</div>
      </div>
    </motion.div>
  );
}

// --- Screen 2: 웨어러블 연결 ---
function Onboarding2({ onNext }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 bg-white min-h-screen flex flex-col">
      <div className="flex gap-1.5 mb-10 pt-4">
        <div className="h-1.5 w-1.5 bg-gray-200 rounded-full" />
        <div className="h-1.5 w-5 bg-[#5d5cff] rounded-full" />
      </div>
      <h1 className="text-3xl font-bold leading-tight mb-2">웨어러블 기기<br />연결 (선택)</h1>
      <p className="text-gray-400 text-sm mb-10 font-medium">수면 데이터로 더 정확한 분석을 제공합니다</p>

      <button onClick={onNext} className="w-full flex items-center gap-4 p-5 border border-gray-100 rounded-[24px] mb-4">
        <div className="p-3 bg-gray-50 rounded-xl"><Apple className="text-gray-800" fill="currentColor" /></div>
        <div className="text-left"><div className="font-bold text-lg">Apple Health</div><div className="text-xs text-gray-400">수면, 심박수 데이터 연동</div></div>
      </button>

      <div className="mt-auto p-6 bg-indigo-50/50 rounded-[32px] border border-indigo-100/50">
        <h4 className="flex items-center gap-2 text-[#5d5cff] font-bold text-sm mb-3">🛡️
          
