import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAroma } from '../context/AromaContext';
import { TeamMember, TeamStats } from '../types';
import { 
  Users, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  Shield,
  Activity,
  UserCheck,
  Bell
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const TeamDashboardScreen: React.FC = () => {
  const { currentTheme } = useAroma();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');

  const teamStats: TeamStats = {
    totalMembers: 24,
    averageFatigue: 38,
    workingNow: 6,
    alertsCount: 2
  };

  const teamMembers: TeamMember[] = [
    {
      id: 1,
      name: '김간호사',
      role: '간호사',
      fatigueLevel: 65,
      workingHours: 8.5,
      lastCheckIn: new Date('2024-01-26T14:30:00')
    },
    {
      id: 2,
      name: '이의사',
      role: '의사',
      fatigueLevel: 45,
      workingHours: 12,
      lastCheckIn: new Date('2024-01-26T15:00:00')
    },
    {
      id: 3,
      name: '박간호사',
      role: '간호사',
      fatigueLevel: 80,
      workingHours: 10,
      lastCheckIn: new Date('2024-01-26T13:45:00')
    },
    {
      id: 4,
      name: '최기사',
      role: '응급구조사',
      fatigueLevel: 55,
      workingHours: 9,
      lastCheckIn: new Date('2024-01-26T14:15:00')
    }
  ];

  const weeklyTrendData = [
    { name: '1-2월', fatigue: 35, alerts: 1 },
    { name: '3-4월', fatigue: 42, alerts: 3 },
    { name: '5-6월', fatigue: 38, alerts: 2 },
    { name: '7월', fatigue: 45, alerts: 4 }
  ];

  const getFatigueColor = (level: number): string => {
    if (level >= 80) return 'text-red-500';
    if (level >= 60) return 'text-orange-500';
    if (level >= 40) return 'text-chamomile-600';
    return 'text-mint-600';
  };

  const getFatigueBg = (level: number): string => {
    if (level >= 80) return 'bg-red-100';
    if (level >= 60) return 'bg-orange-100';
    if (level >= 40) return 'bg-chamomile-100';
    return 'bg-mint-100';
  };

  const StatCard: React.FC<{
    icon: React.ComponentType<any>;
    title: string;
    value: string | number;
    subtitle?: string;
    color: string;
  }> = ({ icon: Icon, title, value, subtitle, color }) => (
    <div className="soft-card p-6 text-center">
      <Icon size={32} className={`mx-auto mb-3 ${color}`} />
      <p className="text-2xl font-light text-soft-gray-800 mb-1">{value}</p>
      <p className="text-sm text-soft-gray-600">{title}</p>
      {subtitle && <p className="text-xs text-soft-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  const MemberCard: React.FC<{ member: TeamMember }> = ({ member }) => (
    <div className="soft-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium text-soft-gray-800">{member.name}</h3>
          <p className="text-sm text-soft-gray-600">{member.role}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-soft-gray-600">근무시간</p>
          <p className="font-medium text-soft-gray-800">{member.workingHours}h</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-soft-gray-600">피로도</span>
        <span className={`text-sm font-medium ${getFatigueColor(member.fatigueLevel)}`}>
          {member.fatigueLevel}%
        </span>
      </div>

      <div className="w-full bg-soft-gray-200 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            member.fatigueLevel >= 80 ? 'bg-red-400' :
            member.fatigueLevel >= 60 ? 'bg-orange-400' :
            member.fatigueLevel >= 40 ? 'bg-chamomile-400' : 'bg-mint-400'
          }`}
          style={{ width: `${member.fatigueLevel}%` }}
        ></div>
      </div>

      <div className="flex items-center justify-between text-xs text-soft-gray-500">
        <span>마지막 체크인</span>
        <span>{member.lastCheckIn.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {member.fatigueLevel >= 80 && (
        <div className="mt-3 p-2 bg-red-50 rounded-lg flex items-center space-x-2">
          <AlertTriangle size={16} className="text-red-500" />
          <span className="text-xs text-red-700">즉시 휴식 필요</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-2xl font-medium text-soft-gray-800 mb-2">팀 대시보드</h1>
          <p className="text-soft-gray-600">의료진의 건강 상태 분석</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`px-4 py-2 rounded-xl transition-colors ${
              selectedPeriod === 'week'
                ? 'bg-lavender-200 text-lavender-800'
                : 'bg-soft-gray-100 text-soft-gray-600 hover:bg-soft-gray-200'
            }`}
          >
            주간
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`px-4 py-2 rounded-xl transition-colors ${
              selectedPeriod === 'month'
                ? 'bg-lavender-200 text-lavender-800'
                : 'bg-soft-gray-100 text-soft-gray-600 hover:bg-soft-gray-200'
            }`}
          >
            월간
          </button>
        </div>
      </motion.div>

      {/* 통계 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          icon={Users}
          title="전체 팀원"
          value={teamStats.totalMembers}
          subtitle="명"
          color="text-lavender-600"
        />
        <StatCard
          icon={Activity}
          title="평균 피로도"
          value={`${teamStats.averageFatigue}%`}
          color="text-chamomile-600"
        />
        <StatCard
          icon={UserCheck}
          title="현재 근무 중"
          value={teamStats.workingNow}
          subtitle="명"
          color="text-mint-600"
        />
        <StatCard
          icon={Bell}
          title="알림"
          value={teamStats.alertsCount}
          subtitle="건"
          color="text-red-500"
        />
      </motion.div>

      {/* 주간 피로도 트렌드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="soft-card p-6"
      >
        <h2 className="text-lg font-medium text-soft-gray-800 mb-6">소속 위험 남성 시간대</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyTrendData}>
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
              <Bar dataKey="fatigue" fill="#8B7D8B" name="평균 피로도" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* 팀원 상태 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-soft-gray-800">팀원 현황</h2>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-mint-400"></div>
              <span className="text-soft-gray-600">양호 (0-39%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-chamomile-400"></div>
              <span className="text-soft-gray-600">주의 (40-59%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-400"></div>
              <span className="text-soft-gray-600">위험 (60-79%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <span className="text-soft-gray-600">매우위험 (80%+)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      </motion.div>

      {/* 알림 및 권장사항 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="soft-card p-6 bg-orange-50/50 border-l-4 border-orange-400"
      >
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle size={24} className="text-orange-500" />
          <h2 className="text-lg font-medium text-soft-gray-800">관리자 알림</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 rounded-full bg-red-400 mt-2 flex-shrink-0"></div>
            <p className="text-soft-gray-700">박간호사님의 피로도가 위험 수준(80%)에 도달했습니다. 즉시 휴식을 권장합니다.</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 rounded-full bg-orange-400 mt-2 flex-shrink-0"></div>
            <p className="text-soft-gray-700">야간 근무조의 평균 피로도가 지난주 대비 15% 증가했습니다.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TeamDashboardScreen;