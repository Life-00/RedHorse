import React from 'react';

export const ShiftToSleepPlan: React.FC = () => {
  const timelineEvents = [
    { time: '06:00', type: 'work_end', label: '야간 근무 종료', icon: '🏢' },
    { time: '08:00', type: 'sleep_start', label: '메인 수면 시작', icon: '🌙', duration: '7시간' },
    { time: '15:00', type: 'sleep_end', label: '메인 수면 종료', icon: '🌙' },
    { time: '19:00', type: 'nap_start', label: '파워냅 시작', icon: '💤', duration: '30분' },
    { time: '19:30', type: 'nap_end', label: '파워냅 종료', icon: '💤' },
    { time: '22:00', type: 'work_start', label: '야간 근무 시작', icon: '🏢' }
  ];

  const getEventColor = (type: string) => {
    switch (type) {
      case 'sleep_start':
      case 'sleep_end':
        return 'bg-indigo-500 text-white';
      case 'nap_start':
      case 'nap_end':
        return 'bg-purple-500 text-white';
      case 'work_start':
      case 'work_end':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-300 text-gray-700';
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
          <h1 className="text-lg font-semibold text-gray-900">수면창 계획</h1>
          <button className="p-2 -mr-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l2.828 2.828M4.828 7l2.828-2.828M4.828 7l9.899 9.899m0 0l2.828-2.828M14.727 16.899L11.899 14.07" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6 overflow-y-auto" style={{ maxHeight: '600px' }}>
        
        {/* Today's Plan Header */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">오늘의 최적 수면창</h2>
          <p className="text-gray-600">24시간 타임라인</p>
        </div>

        {/* Main Sleep Block */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">메인 수면</h3>
            <div className="text-2xl">🌙</div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">08:00 – 15:00</div>
            <div className="text-indigo-100">7시간 수면</div>
          </div>
        </div>

        {/* Power Nap Block */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">파워냅</h3>
            <div className="text-xl">💤</div>
          </div>
          <div className="space-y-1">
            <div className="text-lg font-bold">19:00 – 19:30</div>
            <div className="text-purple-100">30분 휴식</div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">24시간 타임라인</h3>
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300"></div>
            
            {/* Timeline Events */}
            <div className="space-y-6">
              {timelineEvents.map((event, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${getEventColor(event.type)}`}>
                    {event.time.split(':')[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{event.label}</div>
                    {event.duration && (
                      <div className="text-sm text-gray-600">{event.duration}</div>
                    )}
                  </div>
                  <div className="text-xl">{event.icon}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scientific Explanation */}
        <div className="bg-blue-50 rounded-2xl p-4">
          <h3 className="font-semibold text-blue-900 mb-3">왜 이 시간인가요?</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• 야간 근무 후 최소 7시간 회복 수면 필요</li>
            <li>• 생체리듬상 오전 수면이 가장 효율적</li>
            <li>• 근무 전 30분 파워냅으로 각성도 향상</li>
            <li>• 불확실하면 표시하지 않음 원칙</li>
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
        <button className="w-full py-4 rounded-2xl font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-all">
          알림 설정
        </button>
      </div>
    </div>
  );
};