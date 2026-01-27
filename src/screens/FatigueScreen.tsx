import React, { useState } from 'react';
import { useAroma } from '../context/AromaContext';
import { AlertTriangle, TrendingUp, Clock, Coffee, Brain, Heart } from 'lucide-react';
import { FatigueData } from '../types';

const FatigueScreen: React.FC = () => {
  const { currentTheme } = useAroma();
  const [fatigueData] = useState<FatigueData>({
    level: 'medium',
    score: 65,
    factors: {
      sleep: 70,
      workHours: 60,
      caffeine: 80,
      stress: 50
    },
    recommendations: [
      '오늘 밤 7-8시간 수면을 취하세요',
      '카페인 섭취를 오후 3시 이전으로 제한하세요',
      '15분간 명상이나 깊은 호흡을 해보세요'
    ]
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">피로도 분석</h1>
          <p className="text-gray-600">현재 컨디션을 확인하고 개선 방법을 찾아보세요</p>
        </div>

        {/* Fatigue Score */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-4">
              <AlertTriangle className="text-yellow-500" size={24} />
              <span className="text-lg font-semibold">피로도 점수</span>
            </div>
            <div className="text-5xl font-black text-gray-900 mb-2">{fatigueData.score}</div>
            <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getLevelColor(fatigueData.level)}`}>
              {fatigueData.level === 'low' && '낮음'}
              {fatigueData.level === 'medium' && '보통'}
              {fatigueData.level === 'high' && '높음'}
              {fatigueData.level === 'critical' && '위험'}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              className="bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 h-3 rounded-full transition-all duration-500"
              style={{ width: `${fatigueData.score}%` }}
            />
          </div>
        </div>

        {/* Factors */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="text-blue-500" size={16} />
              <span className="text-sm font-medium text-gray-600">수면</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{fatigueData.factors.sleep}%</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-green-500" size={16} />
              <span className="text-sm font-medium text-gray-600">근무시간</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{fatigueData.factors.workHours}%</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Coffee className="text-orange-500" size={16} />
              <span className="text-sm font-medium text-gray-600">카페인</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{fatigueData.factors.caffeine}%</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="text-purple-500" size={16} />
              <span className="text-sm font-medium text-gray-600">스트레스</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{fatigueData.factors.stress}%</div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-6 border border-blue-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">개선 권장사항</h3>
          <div className="space-y-3">
            {fatigueData.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-gray-700">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FatigueScreen;