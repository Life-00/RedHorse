import React, { useState } from 'react';

export const CaffeineCutoff: React.FC = () => {
  const [selectedCaffeine, setSelectedCaffeine] = useState<string>('');

  const caffeineOptions = [
    { id: 'coffee', label: '커피', color: 'bg-orange-500', icon: '☕' },
    { id: 'energy', label: '에너지 드링크', color: 'bg-blue-500', icon: '🥤' },
    { id: 'tea', label: '차', color: 'bg-green-500', icon: '🍵' },
    { id: 'none', label: '없음', color: 'bg-gray-500', icon: '🚫' }
  ];

  const alternatives = [
    { title: '밝은 빛 노출', description: '10-15분 효과적', color: 'bg-yellow-50 text-yellow-800', icon: '💡' },
    { title: '가벼운 활동', description: '혈액순환 개선', color: 'bg-green-50 text-green-800', icon: '🚶' },
    { title: '15분 파워냅', description: '피로 회복 최고', color: 'bg-purple-50 text-purple-800', icon: '💤' }
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

      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button className="p-2 -ml-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">카페인 컷오프</h1>
          <button className="p-2 -mr-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6 overflow-y-auto" style={{ maxHeight: '600px' }}>
        
        {/* Clock Visual */}
        <div className="text-center">
          <div className="relative w-48 h-48 mx-auto mb-4">
            {/* Clock Circle */}
            <svg className="w-48 h-48" viewBox="0 0 200 200">
              {/* Safe Zone (Green) */}
              <path
                d="M 100 100 L 100 20 A 80 80 0 1 1 100 180 Z"
                fill="#10b981"
                opacity="0.2"
              />
              {/* Danger Zone (Orange) */}
              <path
                d="M 100 100 L 100 180 A 80 80 0 0 1 100 20 Z"
                fill="#f59e0b"
                opacity="0.2"
              />
              {/* Clock Border */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="2"
              />
              {/* Time Markers */}
              <g stroke="#6b7280" strokeWidth="2">
                <line x1="100" y1="20" x2="100" y2="30" /> {/* 12 */}
                <line x1="180" y1="100" x2="170" y2="100" /> {/* 3 */}
                <line x1="100" y1="180" x2="100" y2="170" /> {/* 6 */}
                <line x1="20" y1="100" x2="30" y2="100" /> {/* 9 */}
              </g>
              {/* Time Labels */}
              <text x="100" y="15" textAnchor="middle" className="text-xs fill-gray-600">00:00</text>
              <text x="185" y="105" textAnchor="middle" className="text-xs fill-gray-600">06:00</text>
              <text x="100" y="195" textAnchor="middle" className="text-xs fill-gray-600">12:00</text>
              <text x="15" y="105" textAnchor="middle" className="text-xs fill-gray-600">18:00</text>
            </svg>
            
            {/* Center Display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">21:00</div>
                <div className="text-sm text-gray-600">이전까지</div>
                <div className="text-2xl mt-1">☕</div>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="text-center space-y-2">
            <div className="font-semibold text-orange-900">카페인 반감기: 약 5시간</div>
            <div className="text-sm text-orange-800">자정 수면 기준으로 계산된 권장 시각입니다</div>
          </div>
        </div>

        {/* Caffeine Intake Logging */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">카페인 섭취 기록</h3>
          <div className="grid grid-cols-2 gap-3">
            {caffeineOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedCaffeine(option.id)}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  selectedCaffeine === option.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-center space-y-2">
                  <div className="text-2xl">{option.icon}</div>
                  <div className="font-semibold text-gray-900">{option.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Alternative Methods */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">대체 각성 방법</h3>
          <div className="space-y-3">
            {alternatives.map((alt, index) => (
              <div key={index} className={`p-4 rounded-2xl ${alt.color}`}>
                <div className="flex items-center space-x-3">
                  <div className="text-xl">{alt.icon}</div>
                  <div>
                    <div className="font-semibold">{alt.title}</div>
                    <div className="text-sm opacity-80">{alt.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 rounded-2xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 카페인 관리 팁</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 수면 5-6시간 전까지만 카페인 섭취</li>
            <li>• 하루 400mg 이하로 제한 (커피 4잔)</li>
            <li>• 공복에 카페인 섭취 피하기</li>
            <li>• 물을 충분히 마셔 탈수 방지</li>
          </ul>
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
        <button className="w-full py-4 rounded-2xl font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-all">
          카페인 기록 추가
        </button>
      </div>
    </div>
  );
};