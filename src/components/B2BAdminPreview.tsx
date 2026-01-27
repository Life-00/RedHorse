import React from 'react';

export const B2BAdminPreview: React.FC = () => {
  // 상단 통계 데이터
  const stats = {
    totalMembers: 24,
    highRiskPercentage: 38,
    averageSleep: 6.2
  };

  // 차트 1: 연속 야간근무 vs 위험도 데이터
  const consecutiveWorkData = [
    { days: '1-2일', risk: 25 },
    { days: '3-4일', risk: 45 },
    { days: '5-6일', risk: 70 },
    { days: '7일+', risk: 90 }
  ];

  // 차트 2: 조별 위험 급증 시간대 데이터
  const timeRiskData = [
    { time: '00:00', teamA: 30, teamB: 25 },
    { time: '03:00', teamA: 75, teamB: 80 },
    { time: '06:00', teamA: 85, teamB: 90 },
    { time: '09:00', teamA: 40, teamB: 35 },
    { time: '12:00', teamA: 20, teamB: 15 }
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-900">B2B 관리자 대시보드</h1>
            <div className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
              PREVIEW
            </div>
          </div>
          <button className="p-2 -mr-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6 overflow-y-auto" style={{ maxHeight: '600px' }}>
        
        {/* 상단 통계 카드 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalMembers}</div>
            <div className="text-xs text-blue-800">팀원 수</div>
          </div>
          <div className="bg-orange-50 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.highRiskPercentage}%</div>
            <div className="text-xs text-orange-800">중위험 이상</div>
          </div>
          <div className="bg-green-50 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.averageSleep}h</div>
            <div className="text-xs text-green-800">평균 수면</div>
          </div>
        </div>

        {/* 차트 1: 연속 야간근무 vs 위험도 */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <h3 className="font-semibold text-gray-900 mb-3">연속 야간근무 vs 위험도</h3>
          <div className="space-y-3">
            {consecutiveWorkData.map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-12 text-sm text-gray-600">{item.days}</div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        item.risk >= 80 ? 'bg-red-500' :
                        item.risk >= 60 ? 'bg-orange-500' :
                        item.risk >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${item.risk}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-8 text-sm font-semibold text-gray-900">{item.risk}%</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-600">
            💡 인사이트: 연속 근무 일수가 길수록 위험도 급증
          </div>
        </div>

        {/* 차트 2: 조별 위험 급증 시간대 */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <h3 className="font-semibold text-gray-900 mb-3">조별 위험 급증 시간대</h3>
          <div className="space-y-2">
            {timeRiskData.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-10 text-xs text-gray-600">{item.time}</div>
                <div className="flex-1 flex space-x-1">
                  {/* A조 */}
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width: `${item.teamA}%` }}
                      ></div>
                    </div>
                  </div>
                  {/* B조 */}
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-purple-500"
                        style={{ width: `${item.teamB}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center space-x-4 mt-3 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
              <span className="text-gray-600">A조</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-gray-600">B조</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            💡 인사이트: 새벽 3-6시 구간 집중 관리 필요
          </div>
        </div>

        {/* 데이터 보호 정책 */}
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-purple-900 mb-2">데이터 보호 정책</h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• 개인정보 미수집, 익명 통계만 제공</li>
                <li>• 3명 미만 그룹은 표시하지 않음</li>
                <li>• 개인 식별 불가능한 집계 데이터</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 실행 가능한 인사이트 */}
        <div className="bg-blue-50 rounded-2xl p-4">
          <h3 className="font-semibold text-blue-900 mb-3">📊 실행 가능한 인사이트</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
              <span>새벽 3-6시 시간대에 추가 휴식 시간 배정</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
              <span>연속 야간 근무 5일 이상 시 의무 휴무</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
              <span>고위험 시간대 2인 1조 근무 체계</span>
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
        <button className="w-full py-4 rounded-2xl font-semibold bg-purple-500 text-white hover:bg-purple-600 transition-all">
          전체 리포트 보기
        </button>
      </div>
    </div>
  );
};