import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAroma } from '../context/AromaContext';
import { Coffee, Plus, Minus, AlertTriangle } from 'lucide-react';

const CaffeineScreen: React.FC = () => {
  const { currentTheme } = useAroma();
  const [dailyIntake, setDailyIntake] = useState<number>(2);
  const maxRecommended = 4;

  const addCoffee = () => setDailyIntake(prev => prev + 1);
  const removeCoffee = () => setDailyIntake(prev => Math.max(0, prev - 1));

  const getIntakeStatus = (): { color: string; message: string } => {
    if (dailyIntake <= 2) return { color: 'text-mint-600', message: '적정 수준입니다' };
    if (dailyIntake <= 4) return { color: 'text-chamomile-600', message: '주의가 필요합니다' };
    return { color: 'text-red-500', message: '과다 섭취 상태입니다' };
  };

  const status = getIntakeStatus();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl font-medium text-soft-gray-800 mb-2">카페인 관리</h1>
        <p className="text-soft-gray-600">건강한 카페인 섭취를 도와드립니다</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="soft-card p-8 text-center"
      >
        <Coffee size={48} className="mx-auto mb-4 text-chamomile-600" />
        <p className="text-sm text-soft-gray-600 mb-2">오늘의 카페인 섭취량</p>
        <p className="text-4xl font-light text-soft-gray-800 mb-4">{dailyIntake}잔</p>
        
        <div className="flex justify-center items-center space-x-4 mb-6">
          <button
            onClick={removeCoffee}
            className="p-3 rounded-full bg-soft-gray-200 hover:bg-soft-gray-300 transition-colors"
          >
            <Minus size={20} className="text-soft-gray-600" />
          </button>
          <button
            onClick={addCoffee}
            className="p-3 rounded-full bg-chamomile-200 hover:bg-chamomile-300 transition-colors"
          >
            <Plus size={20} className="text-chamomile-800" />
          </button>
        </div>

        <div className="w-full bg-soft-gray-200 rounded-full h-3 mb-4">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              dailyIntake <= 2 ? 'bg-mint-400' :
              dailyIntake <= 4 ? 'bg-chamomile-400' : 'bg-red-400'
            }`}
            style={{ width: `${Math.min((dailyIntake / maxRecommended) * 100, 100)}%` }}
          ></div>
        </div>

        <p className={`font-medium ${status.color}`}>{status.message}</p>
      </motion.div>

      {dailyIntake > maxRecommended && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="soft-card p-6 bg-red-50/50 border-l-4 border-red-400"
        >
          <div className="flex items-center space-x-3">
            <AlertTriangle size={24} className="text-red-500" />
            <div>
              <h3 className="font-medium text-soft-gray-800">카페인 과다 섭취 주의</h3>
              <p className="text-sm text-soft-gray-600 mt-1">
                하루 권장량을 초과했습니다. 수분 섭취를 늘리고 휴식을 취하세요.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CaffeineScreen;