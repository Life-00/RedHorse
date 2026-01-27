import React, { useState } from 'react';

export const ScheduleInput: React.FC = () => {
  const [currentWeek, setCurrentWeek] = useState(0);

  const weekData = [
    { day: '월', date: 20, shift: 'day', time: '08:00–17:00', commute: 30, isToday: false },
    { day: '화', date: 21, shift: 'night', time: '22:00–07:00', commute: 30, isToday: false },
    { day: '수', date: 22, shift: 'night', time: '22:00–07:00', commute: 30, isToday: false },
    { day: '목', date: 23, shift: 'off', time: '휴무', commute: 0, isToday: false },
    { day: '금', date: 24, shift: 'night', time: '22:00–07:00', commute: 30, isToday: false },
    { day: '토', date: 25, shift: 'night', time: '22:00–07:00', commute: 30, isToday: false },
    { day: '일', date: 26, shift: 'night', time: '22:00–07:00', commute: 30, isToday: true }
  ];

  const getShiftColor = (shift: string) => {
    switch (shift) {
      case 'day': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'night': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'off': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getShiftLabel = (shift: string) => {
    switch (shift) {
      case 'day': return '주간';
      case 'night': return '야간';
      case 'off': return '휴무';
      default: return '미정';
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
          <h1 className="text-lg font-semibold text-gray-900">근무표 관리</h1>
          <button className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium">
            가져오기
          </button>
        </div>
      </div>

      {/* Week Navigator */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setCurrentWeek(currentWeek - 1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <div className="font-semibold text-gray-900">2026년 1월</div>
            <div className="text-sm text-gray-600">3주차 (20-26일)</div>
          </div>
          <button 
            onClick={() => setCurrentWeek(currentWeek + 1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="px-6 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: '500px' }}>
        {weekData.map((day, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-2xl border-2 ${
              day.isToday 
                ? 'bg-indigo-50 border-indigo-200' 
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  day.isToday ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <div className="text-center">
                    <div className="text-xs">{day.day}</div>
                    <div className="text-sm font-bold">{day.date}</div>
                  </div>
                </div>
                <div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getShiftColor(day.shift)}`}>
                    {getShiftLabel(day.shift)}
                  </div>
                  {day.shift !== 'off' && (
                    <div className="text-sm text-gray-600 mt-1">{day.time}</div>
                  )}
                </div>
              </div>
              <button className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg">
                수정
              </button>
            </div>
            
            {day.shift !== 'off' && (
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>통근: {day.commute}분</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="px-6 py-4 border-t border-gray-100">
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-sky-500 rounded-full"></div>
            <span className="text-gray-600">주간</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
            <span className="text-gray-600">야간</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="text-gray-600">휴무</span>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4">
        <div className="flex justify-around">
          <button className="flex flex-col items-center space-y-1">
            <div className="w-6 h-6 bg-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L9 5.414V17a1 1 0 102 0V5.414l5.293 5.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
            <span className="text-xs text-gray-400">홈</span>
          </button>
          <button className="flex flex-col items-center space-y-1">
            <div className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs text-indigo-500 font-medium">근무표</span>
          </button>
          <button className="flex flex-col items-center space-y-1">
            <div className="w-6 h-6 bg-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            </div>
            <span className="text-xs text-gray-400">플랜</span>
          </button>
          <button className="flex flex-col items-center space-y-1">
            <div className="w-6 h-6 bg-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <span className="text-xs text-gray-400">인사이트</span>
          </button>
          <button className="flex flex-col items-center space-y-1">
            <div className="w-6 h-6 bg-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs text-gray-400">설정</span>
          </button>
        </div>
      </div>
    </div>
  );
};