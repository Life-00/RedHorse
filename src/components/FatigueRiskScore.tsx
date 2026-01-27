import React from 'react';

export const FatigueRiskScore: React.FC = () => {
  const riskScore = 45; // 중간 위험도 (45%)
  const riskLevel = '중간';

  const factors = [
    { name: '평균 수면 시간', value: '5.5시간', status: 'warning', icon: '😴' },
    { name: '연속 야간 근무', value: '3일째', status: 'warning', icon: '🌙' },
    { name: '통근 운전 시간', value: '30분', status: 'normal', icon: '🚗' }
  ];

  const safetyRecommendations = [
    { title: '퇴근 후 운전 피하기', description: '가능하면 대중교통 이용', icon: '🚌' },
    { title: '파워냅 우선 실행', description: '근무 전 15-30분 권장', icon: '💤' },
    { title: '대중교통 권장', description: '이동 중 휴식 가능', icon: '🚇' }
  ];

  const getFactorColor = (status: string) => {
    switch (status) {
      case 'warning': return 'text-orange-600 bg-orange-50';
      case 'danger': return 'text-red-600 bg-red-50';
      case 'normal': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

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
          <h1 className="text-lg font-semibold text-gray-900">피로 위험도</h1>
          <button className="p-2 -mr-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6 overflow-y-auto" style={{ maxHeight: '600px' }}>
        
        {/* Risk Meter */}
        <div className="text-center">
          <div className="relative w-40 h-40 mx-auto mb-4">
            {/* Gradient Background */}
            <svg className="w-40 h-40" viewBox="0 0 160 160">
              <defs>
                <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="url(#riskGradient)"
                strokeWidth="12"
                strokeDasharray="220 440"
                strokeDashoffset="110"
                transform="rotate(-90 80 80)"
              />
              {/* Current Position Indicator */}
              <circle
                cx={80 + 60 * Math.cos((riskScore / 100 * Math.PI) - Math.PI/2)}
                cy={80 + 60 * Math.sin((riskScore / 100 * Math.PI) - Math.PI/2)}
                r="6"
                fill="white"
                stroke="#374151"
                strokeWidth="2"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{riskLevel}</div>
                <div className="text-sm text-gray-600">위험도</div>
              </div>
            </div>
          </div>
          
          <div className="inline-block px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
            {riskScore}% 위험도
          </div>
        </div>

        {/* Risk Factors */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">위험도 계산 근거</h2>
          <div className="space-y-3">
            {factors.map((factor, index) => (
              <div key={index} className={`p-4 rounded-2xl ${getFactorColor(factor.status)}`}>
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{factor.icon}</div>
                  <div className="flex-1">
                    <div className="font-semibold">{factor.name}</div>
                    <div className="text-sm opacity-80">{factor.value}</div>
                  </div>
                  {factor.status === 'warning' && (
                    <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Mode Recommendations */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center mb-3">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mr-2">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="font-semibold text-orange-900">안전 모드 권장사항</h3>
          </div>
          <div className="space-y-3">
            {safetyRecommendations.map((rec, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="text-xl">{rec.icon}</div>
                <div>
                  <div className="font-semibold text-orange-900">{rec.title}</div>
                  <div className="text-sm text-orange-800">{rec.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Level Explanation */}
        <div className="bg-blue-50 rounded-2xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📊 위험도 단계</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>낮음 (0-30%): 정상 상태</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>중간 (31-70%): 주의 필요 ← 현재</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>높음 (71-100%): 즉시 조치</span>
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
        <button className="w-full py-4 rounded-2xl font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-all">
          오늘 리스크 줄이기
        </button>
      </div>
    </div>
  );
};