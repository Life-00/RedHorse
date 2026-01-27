import React, { useState } from 'react';

export const MeditationGuide: React.FC = () => {
  const [selectedProgram, setSelectedProgram] = useState('sleep');
  const [isPlaying, setIsPlaying] = useState(false);

  // 추천 프로그램 (상단 히어로 카드)
  const featuredProgram = {
    id: 'sleep',
    name: '수면 유도 명상',
    duration: '10분',
    description: '주간 수면 전 마음 안정',
    color: 'from-indigo-500 to-purple-600'
  };

  // 5가지 명상 프로그램
  const programs = [
    {
      id: 'morning',
      name: '아침 각성 명상',
      duration: '5분',
      description: '야간 근무 후 활력 회복',
      icon: '☀️',
      color: 'bg-orange-50 border-orange-200',
      tag: '에너지'
    },
    {
      id: 'sleep',
      name: '수면 유도 명상',
      duration: '10분',
      description: '주간 수면 전 마음 안정',
      icon: '🌙',
      color: 'bg-indigo-50 border-indigo-200',
      tag: '수면'
    },
    {
      id: 'breathing',
      name: '호흡 운동',
      duration: '5분',
      description: '4-7-8 호흡법으로 긴장 완화',
      icon: '💨',
      color: 'bg-sky-50 border-sky-200',
      tag: '이완'
    },
    {
      id: 'bodyscan',
      name: '바디 스캔',
      duration: '8분',
      description: '근무 전 신체 긴장 해소',
      icon: '💆',
      color: 'bg-pink-50 border-pink-200',
      tag: '이완'
    },
    {
      id: 'mindfulness',
      name: '마인드풀니스',
      duration: '7분',
      description: '현재에 집중하는 연습',
      icon: '🧠',
      color: 'bg-purple-50 border-purple-200',
      tag: '집중'
    }
  ];

  // 호흡 운동 가이드
  const breathingPatterns = [
    {
      name: '4-7-8 호흡법',
      pattern: '들이쉬기 4초 → 참기 7초 → 내쉬기 8초',
      color: 'bg-blue-100 text-blue-800'
    },
    {
      name: '박스 호흡',
      pattern: '각 4초씩 (불안 감소)',
      color: 'bg-green-100 text-green-800'
    },
    {
      name: '깊은 호흡',
      pattern: '들이쉬기 6초, 참기 2초, 내쉬기 6초',
      color: 'bg-purple-100 text-purple-800'
    }
  ];

  const selectedProgramData = programs.find(p => p.id === selectedProgram) || featuredProgram;

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

      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button className="p-2 -ml-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">명상 & 이완 가이드</h1>
          <button className="p-2 -mr-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6 overflow-y-auto" style={{ maxHeight: '600px' }}>
        
        {/* 추천 프로그램 (상단 히어로 카드) */}
        <div className={`bg-gradient-to-r ${featuredProgram.color} rounded-2xl p-6 text-white`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold">{featuredProgram.name}</div>
              <div className="text-sm opacity-90">{featuredProgram.description}</div>
            </div>
            <div className="text-3xl">🌙</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{featuredProgram.duration}</div>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 5가지 명상 프로그램 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">명상 프로그램</h3>
          <div className="space-y-3">
            {programs.map((program) => (
              <button
                key={program.id}
                onClick={() => setSelectedProgram(program.id)}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                  selectedProgram === program.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : program.color
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{program.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="font-semibold text-gray-900">{program.name}</div>
                      <div className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                        {program.tag}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">{program.description}</div>
                    <div className="text-sm font-medium text-gray-800 mt-1">{program.duration}</div>
                  </div>
                  {selectedProgram === program.id && (
                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 호흡 운동 가이드 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">호흡 운동 가이드</h3>
          <div className="space-y-3">
            {breathingPatterns.map((pattern, index) => (
              <div key={index} className={`p-4 rounded-2xl ${pattern.color}`}>
                <div className="font-semibold mb-1">{pattern.name}</div>
                <div className="text-sm">{pattern.pattern}</div>
                <button className="mt-2 px-3 py-1 bg-white/50 rounded-lg text-sm font-medium hover:bg-white/70 transition-all">
                  시작하기
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 효과적인 명상 팁 */}
        <div className="bg-green-50 rounded-2xl p-4">
          <h3 className="font-semibold text-green-900 mb-3">🧘‍♀️ 효과적인 명상 팁</h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• 조용하고 어두운 공간에서 진행</li>
            <li>• 수면 30분 전 명상이 가장 효과적</li>
            <li>• 편안한 자세로 시작하기</li>
            <li>• 꾸준한 연습이 핵심</li>
          </ul>
        </div>

        {/* 이번 주 명상 기록 */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <h3 className="font-semibold text-gray-900 mb-3">이번 주 명상 기록</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-600">5</div>
              <div className="text-sm text-gray-600">연속 일수</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">42</div>
              <div className="text-sm text-gray-600">총 세션</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">3.5h</div>
              <div className="text-sm text-gray-600">총 시간</div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            의료 진단이 아닌 정보 제공 목적입니다
          </p>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="absolute bottom-8 left-6 right-6">
        <button className="w-full py-4 rounded-2xl font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-all">
          명상 시작하기
        </button>
      </div>
    </div>
  );
};