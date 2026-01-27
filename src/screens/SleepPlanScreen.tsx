import React, { useState } from 'react';
import { useAroma } from '../context/AromaContext';
import { Moon, Sun, Clock, Calendar } from 'lucide-react';
import { SleepPlan } from '../types';

interface SleepPlanData {
  currentPlan: SleepPlan | null;
  weeklyPlan: SleepPlan[];
  sleepDebt: number;
  averageSleep: number;
  circadianRhythm: 'morning' | 'evening';
}

const SleepPlanScreen: React.FC = () => {
  const { currentTheme } = useAroma();
  const [sleepData] = useState<SleepPlanData>({
    currentPlan: {
      day: '오늘',
      date: '2026-01-26',
      sleepTime: '08:00',
      wakeTime: '15:30',
      duration: 7.5,
      quality: 'good',
      workShift: 'night'
    },
    weeklyPlan: [
      { day: '월', date: '2026-01-27', sleepTime: '08:00', wakeTime: '15:30', duration: 7.5, quality: 'good', workShift: 'night' },
      { day: '화', date: '2026-01-28', sleepTime: '08:00', wakeTime: '15:30', duration: 7.5, quality: 'good', workShift: 'night' },
      { day: '수', date: '2026-01-29', sleepTime: '08:00', wakeTime: '15:30', duration: 7.5, quality: 'good', workShift: 'night' },
    ],
    sleepDebt: -0.5,
    averageSleep: 7.2,
    circadianRhythm: 'evening'
  });

  const getShiftIcon = (shift: string) => {
    switch (shift) {
      case 'day': return <Sun className="text-yellow-500" size={16} />;
      case 'night': return <Moon className="text-blue-500" size={16} />;
      default: return <Clock className="text-gray-500" size={16} />;
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'good': return 'bg-green-100 text-green-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">수면 계획</h1>
          <p className="text-gray-600">최적화된 수면 스케줄로 컨디션을 관리하세요</p>
        </div>

        {/* Today's Plan */}
        {sleepData.currentPlan && (
          <div className="bg-[#5d5cff] text-white rounded-3xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-white" size={20} />
              <span className="font-semibold">오늘의 수면 계획</span>
            </div>
            
            <div className="text-center mb-6">
              <div className="text-3xl font-black mb-2">
                {sleepData.currentPlan.sleepTime} - {sleepData.currentPlan.wakeTime}
              </div>
              <div className="text-sm opacity-80">
                {sleepData.currentPlan.duration}시간 수면
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getShiftIcon(sleepData.currentPlan.workShift)}
                <span className="text-sm">
                  {sleepData.currentPlan.workShift === 'night' ? '야간 근무' : '주간 근무'}
                </span>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${getQualityColor(sleepData.currentPlan.quality)}`}>
                {sleepData.currentPlan.quality === 'good' ? '좋음' : 
                 sleepData.currentPlan.quality === 'fair' ? '보통' : '나쁨'}
              </div>
            </div>
          </div>
        )}

        {/* Weekly Overview */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">주간 계획</h3>
          
          <div className="space-y-3">
            {sleepData.weeklyPlan.map((plan, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm font-medium">
                    {plan.day}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {plan.sleepTime} - {plan.wakeTime}
                    </div>
                    <div className="text-xs text-gray-500">
                      {plan.duration}시간
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getShiftIcon(plan.workShift)}
                  <div className={`px-2 py-1 rounded-full text-xs ${getQualityColor(plan.quality)}`}>
                    {plan.quality === 'good' ? '좋음' : 
                     plan.quality === 'fair' ? '보통' : '나쁨'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sleep Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-gray-100">
            <div className="text-sm text-gray-600 mb-1">평균 수면</div>
            <div className="text-2xl font-bold text-gray-900">{sleepData.averageSleep}h</div>
            <div className="text-xs text-green-600">목표 달성</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100">
            <div className="text-sm text-gray-600 mb-1">수면 부채</div>
            <div className="text-2xl font-bold text-gray-900">
              {sleepData.sleepDebt > 0 ? '+' : ''}{sleepData.sleepDebt}h
            </div>
            <div className={`text-xs ${sleepData.sleepDebt <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {sleepData.sleepDebt <= 0 ? '양호' : '부족'}
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-3xl p-6 border border-green-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">수면 개선 팁</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
              <p>근무 시작 1시간 전에 밝은 조명을 사용하세요</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
              <p>수면 전 2시간은 스크린 사용을 줄이세요</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
              <p>일정한 수면 루틴을 유지하세요</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SleepPlanScreen;