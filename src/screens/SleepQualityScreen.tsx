import React, { useState } from 'react';
import { useAroma } from '../context/AromaContext';

const SleepQualityScreen: React.FC = () => {
  const { currentTheme } = useAroma();
  const [sleepData, setSleepData] = useState({
    bedTime: '23:00',
    wakeTime: '07:00',
    quality: 7,
    duration: 8,
    interruptions: 2,
  });

  const qualityLabels = ['매우 나쁨', '나쁨', '보통', '좋음', '매우 좋음'];
  const getQualityLabel = (score: number) => {
    if (score <= 2) return qualityLabels[0];
    if (score <= 4) return qualityLabels[1];
    if (score <= 6) return qualityLabels[2];
    if (score <= 8) return qualityLabels[3];
    return qualityLabels[4];
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
          <h1 className="text-lg font-semibold text-gray-900">수면 품질 추적</h1>
          <button className="p-2 -mr-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 space-y-6">
        {/* Sleep Quality Score */}
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
                stroke={currentTheme.primary}
                strokeWidth="8"
                strokeDasharray={`${(sleepData.quality / 10) * 314} 314`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{sleepData.quality}</div>
                <div className="text-sm text-gray-500">/ 10</div>
              </div>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {getQualityLabel(sleepData.quality)}
          </h2>
          <p className="text-gray-600">오늘 밤 수면 품질</p>
        </div>

        {/* Sleep Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">{sleepData.duration}h</div>
            <div className="text-sm text-gray-600">수면 시간</div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">{sleepData.interruptions}</div>
            <div className="text-sm text-gray-600">중간 깸</div>
          </div>
        </div>

        {/* Sleep Schedule */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">수면 일정</h3>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">취침 시간</div>
                <div className="text-sm text-gray-600">매일 밤</div>
              </div>
            </div>
            <div className="text-lg font-semibold text-gray-900">{sleepData.bedTime}</div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">기상 시간</div>
                <div className="text-sm text-gray-600">매일 아침</div>
              </div>
            </div>
            <div className="text-lg font-semibold text-gray-900">{sleepData.wakeTime}</div>
          </div>
        </div>

        {/* Sleep Tips */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">수면 개선 팁</h3>
          <div className="space-y-2">
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-xl">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div className="text-sm text-gray-700">
                취침 1시간 전 스마트폰 사용을 줄이세요
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-xl">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="text-sm text-gray-700">
                라벤더 아로마로 수면 환경을 조성하세요
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-xl">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <div className="text-sm text-gray-700">
                일정한 수면 패턴을 유지하세요
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="px-6 py-6 border-t border-gray-100">
        <button 
          className="w-full py-4 rounded-2xl font-semibold text-white"
          style={{ backgroundColor: currentTheme.primary }}
        >
          수면 기록 저장
        </button>
      </div>
    </div>
  );
};

export default SleepQualityScreen;