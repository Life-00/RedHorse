import React, { useState } from 'react';

export const OnboardingStep1: React.FC = () => {
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [commuteTime, setCommuteTime] = useState<number>(30);

  const shiftOptions = [
    { 
      id: '2shift', 
      label: '2교대', 
      description: '주간/야간 순환 근무',
      icon: '☀️🌙'
    },
    { 
      id: '3shift', 
      label: '3교대', 
      description: '주간/중간/야간 3교대 시스템',
      icon: '🌅🌆🌙'
    },
    { 
      id: 'fixed_night', 
      label: '고정 야간', 
      description: '밤 근무만 하는 경우',
      icon: '🌙'
    },
    { 
      id: 'irregular', 
      label: '불규칙', 
      description: '매번 바뀌는 스케줄',
      icon: '🔀'
    }
  ];

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-3xl shadow-xl overflow-hidden" style={{ height: '812px' }}>
      {/* Status Bar */}
      <div className="flex justify-between items-center px-6 py-2 text-sm">
        <span>9:41</span>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-2 bg-green-500 rounded-sm"></div>
          <span>100%</span>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center py-6">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
          <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">근무 패턴을 알려주세요</h1>
          <p className="text-gray-600">맞춤형 생체리듬 최적화를 위해 필요합니다</p>
        </div>

        {/* Shift Type Selection */}
        <div className="space-y-4">
          {shiftOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedShift(option.id)}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                selectedShift === option.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{option.icon}</div>
                <div>
                  <div className="font-semibold text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Commute Time Input */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <h3 className="font-semibold text-gray-900 mb-3">통근 시간 (편도)</h3>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={commuteTime}
              onChange={(e) => setCommuteTime(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-right min-w-[60px]">
              <div className="text-lg font-bold text-indigo-600">{commuteTime}분</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">피로도 계산에 중요한 요소입니다</p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 rounded-2xl p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">왜 이 정보가 필요한가요?</h3>
              <p className="text-sm text-blue-800">교대 유형과 통근 시간을 바탕으로 최적의 수면창과 카페인 섭취 시간을 계산합니다.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="absolute bottom-8 left-6 right-6">
        <button
          disabled={!selectedShift}
          className={`w-full py-4 rounded-2xl font-semibold transition-all ${
            selectedShift
              ? 'bg-indigo-500 text-white hover:bg-indigo-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          다음
        </button>
      </div>
    </div>
  );
};