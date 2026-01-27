import React, { useState } from 'react';

export const SleepQualityTracker: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState('이번 주');
  
  const sleepScore = 78;
  
  // 주간 트렌드 데이터 (월~일)
  const weeklyTrend = [
    { day: '월', score: 72 },
    { day: '화', score: 68 },
    { day: '수', score: 75 },
    { day: '목', score: 82 },
    { day: '금', score: 78 },
    { day: '토', score: 85 },
    { day: '일', score: 78 }
  ];

  // 상세 지표
  const metrics = [
    { label: '평균 심박수', value: '58', unit: 'bpm', icon: '💓' },
    { label: '뒤척임 횟수', value: '12', unit: '회', icon: '🔄' },
    { label: 'REM 비율', value: '22', unit: '%', icon: '🧠' }
  ];

  // 수면 단계 분석
  const sleepStages = [
    { stage: '깊은 수면', percentage: 28, hours: '2.0h', color: 'bg-indigo-500' },
    { stage: 'REM 수면', percentage: 22, hours: '1.6h', color: 'bg-purple-500' },
    { stage: '얕은 수면', percentage: 42, hours: '3.0h', color: 'bg-sky-400' },
    { stage: '깨어있음', percentage: 8, hours: '0.6h', color: 'bg-gray-400' }
  ];

  // 자동 인사이트
  const insights = [
    { text: '깊은 수면 비율이 이상적입니다', type: 'positive', icon: '✓' },
    { text: '뒤척임 횟수가 평소보다 높습니다', type: 'warning', icon: '!' }
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
          <h1 className="text-lg font-semibold text-gray-900">수면 품질 트래커</h1>
          <button className="p-2 -mr-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6 overflow-y-auto" style={{ maxHeight: '600px' }}>
        
        {/* 오늘의 수면 점수 */}
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="8"
                strokeDasharray={`${(sleepScore / 100) * 314} 314`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{sleepScore}</div>
                <div className="text-sm text-gray-500">/ 100</div>
              </div>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">오늘의 수면 점수</h2>
          <p className="text-gray-600">100점 만점</p>
        </div>

        {/* 주간 트렌드 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">주간 트렌드</h3>
            <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
              {selectedWeek}
            </button>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex justify-between items-end h-24 mb-3">
              {weeklyTrend.map((day, index) => (
                <div key={index} className="flex flex-col items-center space-y-2">
                  <div 
                    className="w-6 bg-blue-500 rounded-t transition-all"
                    style={{ height: `${(day.score / 100) * 80}px` }}
                  ></div>
                  <span className="text-xs text-gray-600">{day.day}</span>
                </div>
              ))}
            </div>
            <div className="text-center text-sm text-gray-600">수면 품질 점수 (0-100)</div>
          </div>
        </div>

        {/* 상세 지표 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">상세 지표</h3>
          <div className="grid grid-cols-3 gap-3">
            {metrics.map((metric, index) => (
              <div key={index} className="bg-gray-50 rounded-2xl p-3 text-center">
                <div className="text-xl mb-1">{metric.icon}</div>
                <div className="text-lg font-bold text-gray-900">{metric.value}</div>
                <div className="text-xs text-gray-600">{metric.unit}</div>
                <div className="text-xs text-gray-500 mt-1">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 수면 단계 분석 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">수면 단계 분석</h3>
          <div className="space-y-3">
            {sleepStages.map((stage, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-4 h-4 ${stage.color} rounded`}></div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                    <span className="text-sm text-gray-600">{stage.hours}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${stage.color}`}
                      style={{ width: `${stage.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900">{stage.percentage}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* 자동 인사이트 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">자동 인사이트</h3>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div key={index} className={`p-3 rounded-2xl flex items-center space-x-3 ${
                insight.type === 'positive' ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold ${
                  insight.type === 'positive' ? 'bg-green-500' : 'bg-orange-500'
                }`}>
                  {insight.icon}
                </div>
                <span className="text-sm">{insight.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Apple Health 연동 */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Apple Health 연동</div>
              <div className="text-sm text-gray-600">웨어러블 데이터 동기화됨</div>
            </div>
            <div className="ml-auto">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
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
        <button className="w-full py-4 rounded-2xl font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all">
          수면 기록 상세보기
        </button>
      </div>
    </div>
  );
};