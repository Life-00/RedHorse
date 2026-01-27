import React from 'react';
import { motion } from 'framer-motion';
import { useAroma } from '../context/AromaContext';
import { Calendar, Coffee, AlertTriangle, ChevronRight, Moon, BarChart3, Settings, Home } from 'lucide-react';

const HomeScreen: React.FC = () => {
  const { currentTheme } = useAroma();
  
  // 현재 날짜 정보
  const today = new Date();
  const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  
  // 사용자 데이터 (실제로는 API에서 가져올 데이터)
  const userData = {
    name: '지연님',
    todayShift: {
      type: '야간',
      time: '22:00-07:00',
      schedule: '08:00 – 15:30',
      mainWork: '08:00 – 15:00 (7시간)',
      break: '19:00 – 19:30 (30분)'
    },
    caffeineInfo: {
      cutoffTime: '21:00',
      hoursLeft: 5,
      warning: '자정 수면 기준 5시간 전까지'
    },
    fatigueRisk: {
      level: 'high',
      message: '오늘 위험도'
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 상태바 */}
      <div className="h-12 bg-black rounded-b-3xl mx-4 mb-8 flex items-center justify-between px-6 text-white text-sm">
        <span>9:41</span>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-2 border border-white rounded-sm">
            <div className="w-3 h-1 bg-white rounded-sm m-0.5"></div>
          </div>
        </div>
      </div>

      {/* 헤더 */}
      <div className="text-center mb-8">
        <p className="text-gray-400 text-sm mb-4">3. Home Dashboard</p>
        <p className="text-gray-500 text-sm mb-2">{dateString}</p>
        <h1 className="text-2xl font-light text-gray-900">
          안녕하세요, {userData.name}
        </h1>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 px-6 space-y-6 overflow-y-auto">
        {/* 오늘의 근무 일정 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center mb-4">
            <Moon className="text-purple-500 mr-2" size={20} />
            <span className="text-purple-500 text-sm">
              오늘: {userData.todayShift.type} {userData.todayShift.time}
            </span>
          </div>
          
          <div className="bg-purple-500 rounded-2xl p-6 text-white mb-4">
            <div className="text-center mb-4">
              <div className="text-sm opacity-90 mb-1">근무 시간</div>
              <div className="text-3xl font-light">{userData.todayShift.schedule}</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                <span>메인 수면: {userData.todayShift.mainWork}</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                <span>파워냅: {userData.todayShift.break}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 카페인 컷오프 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Coffee className="text-orange-500 mr-2" size={20} />
              <span className="text-gray-400 text-sm">Caffeine Cutoff</span>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="text-gray-600 text-sm mb-2">카페인 마지막 허용 시간</div>
            <div className="text-3xl font-light text-gray-900 mb-2">
              {userData.caffeineInfo.cutoffTime} 이전
            </div>
            <div className="flex items-center text-orange-500 text-sm">
              <AlertTriangle size={16} className="mr-1" />
              <span>{userData.caffeineInfo.warning}</span>
            </div>
          </div>
        </motion.div>

        {/* 피로도 위험 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <AlertTriangle className="text-red-500" size={16} />
              </div>
              <span className="text-gray-400 text-sm">Fatigue Risk</span>
            </div>
          </div>
          
          <div className="text-gray-600 text-sm mb-2">{userData.fatigueRisk.message}</div>
        </motion.div>

        {/* 오늘 계획 보기 버튼 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button className="w-full bg-gray-900 text-white rounded-2xl py-4 flex items-center justify-center text-lg font-medium">
            오늘 계획 보기
            <ChevronRight className="ml-2" size={20} />
          </button>
        </motion.div>
      </div>

      {/* 하단 네비게이션 */}
      <div className="bg-white border-t border-gray-100 px-6 py-4 mt-6">
        <div className="flex justify-around">
          <button className="flex flex-col items-center space-y-1">
            <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center">
              <Home className="text-white" size={16} />
            </div>
            <span className="text-xs text-purple-500">홈</span>
          </button>
          
          <button className="flex flex-col items-center space-y-1">
            <Calendar className="text-gray-400" size={24} />
            <span className="text-xs text-gray-400">일정</span>
          </button>
          
          <button className="flex flex-col items-center space-y-1">
            <div className="text-gray-400 text-xl">≡</div>
            <span className="text-xs text-gray-400">메뉴</span>
          </button>
          
          <button className="flex flex-col items-center space-y-1">
            <BarChart3 className="text-gray-400" size={24} />
            <span className="text-xs text-gray-400">통계</span>
          </button>
          
          <button className="flex flex-col items-center space-y-1">
            <Settings className="text-gray-400" size={24} />
            <span className="text-xs text-gray-400">설정</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;