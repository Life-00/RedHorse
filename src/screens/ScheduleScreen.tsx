import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAroma } from '../context/AromaContext';
import { Calendar, Plus, Clock, MapPin } from 'lucide-react';
import { Schedule } from '../types';

const ScheduleScreen: React.FC = () => {
  const { currentTheme } = useAroma();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const mockSchedules: Schedule[] = [
    { id: 1, title: '주간 근무', time: '09:00 - 18:00', location: '병원 2층', type: 'work', date: '2024-01-27' },
    { id: 2, title: '야간 근무', time: '22:00 - 06:00', location: '병원 3층', type: 'work', date: '2024-01-28' },
    { id: 3, title: '휴식', time: '전일', location: '집', type: 'rest', date: '2024-01-29' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <h1 className="text-2xl font-medium text-soft-gray-800">일정 관리</h1>
        <button className="soft-button-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>일정 추가</span>
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="soft-card p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Calendar size={28} className="text-lavender-600" />
          <h2 className="text-lg font-medium text-soft-gray-800">이번 주 일정</h2>
        </div>
        <div className="space-y-4">
          {mockSchedules.map((schedule) => (
            <div key={schedule.id} className="soft-card p-4 flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full ${
                schedule.type === 'work' ? 'bg-lavender-400' : 'bg-mint-400'
              }`}></div>
              <div className="flex-1">
                <h3 className="font-medium text-soft-gray-800">{schedule.title}</h3>
                <div className="flex items-center space-x-4 text-sm text-soft-gray-600 mt-1">
                  <div className="flex items-center space-x-1">
                    <Clock size={14} />
                    <span>{schedule.time}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin size={14} />
                    <span>{schedule.location}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default ScheduleScreen;