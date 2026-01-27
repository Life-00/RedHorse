import React from 'react';
import { motion } from 'framer-motion';
import { useAroma } from '../context/AromaContext';
import { BarChart3, TrendingUp, Award, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatsScreen: React.FC = () => {
  const { currentTheme } = useAroma();

  const weeklyData = [
    { name: '월', sleep: 7, caffeine: 2, stress: 3 },
    { name: '화', sleep: 6, caffeine: 3, stress: 4 },
    { name: '수', sleep: 5, caffeine: 4, stress: 5 },
    { name: '목', sleep: 6, caffeine: 3, stress: 4 },
    { name: '금', sleep: 7, caffeine: 2, stress: 3 },
    { name: '토', sleep: 8, caffeine: 1, stress: 2 },
    { name: '일', sleep: 8, caffeine: 1, stress: 2 },
  ];

  interface StatCardProps {
    icon: React.ComponentType<any>;
    title: string;
    value: string;
    change: number;
    color: string;
  }

  const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, change, color }) => (
    <div className="soft-card p-6 text-center">
      <Icon size={32} className={`mx-auto mb-3 ${color}`} />
      <h3 className="font-medium text-soft-gray-800 mb-1">{title}</h3>
      <p className="text-2xl font-light text-soft-gray-800 mb-2">{value}</p>
      <p className={`text-sm ${change >= 0 ? 'text-mint-600' : 'text-red-500'}`}>
        {change >= 0 ? '+' : ''}{change}% 지난주 대비
      </p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl font-medium text-soft-gray-800 mb-2">건강 통계</h1>
        <p className="text-soft-gray-600">나의 건강 데이터를 한눈에 확인하세요</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          icon={Target}
          title="목표 달성률"
          value="85%"
          change={12}
          color="text-lavender-600"
        />
        <StatCard
          icon={TrendingUp}
          title="평균 수면"
          value="7.1h"
          change={8}
          color="text-mint-600"
        />
        <StatCard
          icon={Award}
          title="연속 달성"
          value="5일"
          change={25}
          color="text-chamomile-600"
        />
        <StatCard
          icon={BarChart3}
          title="건강 점수"
          value="78점"
          change={-3}
          color="text-eucalyptus-600"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="soft-card p-6"
      >
        <h2 className="text-lg font-medium text-soft-gray-800 mb-6">주간 건강 트렌드</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="sleep" fill="#8B7D8B" name="수면 시간" />
              <Bar dataKey="caffeine" fill="#F0E68C" name="카페인 섭취" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="soft-card p-6 bg-mint-50/50"
      >
        <h2 className="text-lg font-medium text-soft-gray-800 mb-4">이번 주 성과</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-soft-gray-700">수면 목표 달성</span>
            <span className="font-medium text-mint-600">5/7일</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-soft-gray-700">카페인 적정 섭취</span>
            <span className="font-medium text-chamomile-600">4/7일</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-soft-gray-700">스트레스 관리</span>
            <span className="font-medium text-lavender-600">6/7일</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default StatsScreen;