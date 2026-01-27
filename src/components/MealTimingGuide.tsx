import React, { useState } from 'react';

export const MealTimingGuide: React.FC = () => {
  const [selectedShift, setSelectedShift] = useState('night');

  // 오늘의 식사 계획 데이터
  const mealPlan = {
    totalMeals: 4,
    calorieRange: '1,150 - 1,450 kcal',
    completed: 1
  };

  // 식사 타임라인 (세로형)
  const mealTimeline = [
    {
      time: '18:00',
      meal: '저녁 식사',
      calories: '500-600 kcal',
      description: '근무 전 주 식사',
      foods: ['현미밥', '닭가슴살', '샐러드'],
      completed: true
    },
    {
      time: '21:00',
      meal: '가벼운 간식',
      calories: '150-200 kcal',
      description: '근무 시작 전',
      foods: ['바나나', '요거트'],
      completed: false
    },
    {
      time: '01:00',
      meal: '야간 간식',
      calories: '200-250 kcal',
      description: '근무 중 에너지 보충',
      foods: ['견과류', '삶은 계란'],
      completed: false
    },
    {
      time: '07:30',
      meal: '아침 식사',
      calories: '300-400 kcal',
      description: '퇴근 후 가벼운 식사',
      foods: ['죽', '과일', '우유'],
      completed: false
    }
  ];

  // 영양 가이드
  const nutritionGuides = [
    {
      title: '단백질 우선',
      emoji: '🥩',
      description: '각성도 유지'
    },
    {
      title: '탄수화물 조절',
      emoji: '🍚',
      description: '복합 탄수화물 선택'
    },
    {
      title: '수분 섭취',
      emoji: '💧',
      description: '시간당 물 1컵'
    }
  ];

  // 추천 식품
  const recommendedFoods = {
    protein: ['닭가슴살', '삶은 계란', '두부', '그릭요거트'],
    carbs: ['현미', '귀리', '고구마', '통밀빵'],
    snacks: ['견과류', '바나나', '베리류', '당근스틱']
  };

  // 피해야 할 음식
  const avoidFoods = [
    { food: '기름진 음식', reason: '소화 부담 (근무 중)' },
    { food: '탄산음료', reason: '속 불편함 (야간)' },
    { food: '매운 음식', reason: '수면 방해 (수면 전)' }
  ];

  // 수분 섭취 목표
  const hydrationGoal = {
    target: 2.5, // L
    current: 1.8, // L
    hourlyTarget: '시간당 물 1컵 (200ml)',
    totalCups: '8-10잔 (1.6 - 2L)'
  };

  const hydrationPercentage = (hydrationGoal.current / hydrationGoal.target) * 100;

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
          <h1 className="text-lg font-semibold text-gray-900">식사 타이밍 가이드</h1>
          <button className="p-2 -mr-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6 overflow-y-auto" style={{ maxHeight: '600px' }}>
        
        {/* 오늘의 식사 계획 (상단 카드) */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold">오늘의 식사 계획</div>
              <div className="text-sm opacity-90">{mealPlan.totalMeals}끼 식사</div>
            </div>
            <div className="text-3xl">🍽️</div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{mealPlan.calorieRange}</div>
            <div className="text-orange-100">총 권장 칼로리</div>
            <div className="text-sm opacity-90">
              {mealPlan.completed}/{mealPlan.totalMeals} 완료
            </div>
          </div>
        </div>

        {/* 식사 타임라인 (세로형) */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">야간 근무 식사 계획</h3>
          <div className="space-y-4">
            {mealTimeline.map((meal, index) => (
              <div key={index} className="relative">
                {/* Timeline Line */}
                {index < mealTimeline.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-300"></div>
                )}
                
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
                    meal.completed 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {meal.time.split(':')[0]}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-semibold text-gray-900">{meal.meal}</div>
                        <div className="text-sm text-gray-600">{meal.description}</div>
                      </div>
                      {meal.completed && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-medium text-orange-600 mb-2">{meal.calories}</div>
                    <div className="flex flex-wrap gap-1">
                      {meal.foods.map((food, foodIndex) => (
                        <span
                          key={foodIndex}
                          className="inline-block px-2 py-1 bg-white rounded-full text-xs text-gray-700"
                        >
                          {food}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 영양 가이드 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">영양 가이드</h3>
          <div className="grid grid-cols-3 gap-3">
            {nutritionGuides.map((guide, index) => (
              <div key={index} className="bg-green-50 rounded-2xl p-3 text-center">
                <div className="text-2xl mb-2">{guide.emoji}</div>
                <div className="font-semibold text-green-900 text-sm">{guide.title}</div>
                <div className="text-xs text-green-700 mt-1">{guide.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 추천 식품 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">추천 식품</h3>
          <div className="space-y-3">
            <div>
              <div className="font-medium text-gray-800 mb-2">단백질</div>
              <div className="flex flex-wrap gap-2">
                {recommendedFoods.protein.map((food, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {food}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-800 mb-2">복합 탄수화물</div>
              <div className="flex flex-wrap gap-2">
                {recommendedFoods.carbs.map((food, index) => (
                  <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    {food}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-800 mb-2">간식</div>
              <div className="flex flex-wrap gap-2">
                {recommendedFoods.snacks.map((food, index) => (
                  <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    {food}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 피해야 할 음식 */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <h3 className="font-semibold text-red-900 mb-3">⚠️ 피해야 할 음식</h3>
          <div className="space-y-2">
            {avoidFoods.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="font-medium text-red-800">{item.food}</span>
                <span className="text-red-600">{item.reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 수분 섭취 목표 */}
        <div className="bg-blue-50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-blue-900">💧 수분 섭취</h3>
              <p className="text-sm text-blue-800">오늘 목표: {hydrationGoal.target}L</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{hydrationGoal.current}L</div>
              <div className="text-sm text-blue-700">현재 섭취량</div>
            </div>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-3 mb-3">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all"
              style={{ width: `${hydrationPercentage}%` }}
            ></div>
          </div>
          <div className="text-sm text-blue-800 space-y-1">
            <div>• {hydrationGoal.hourlyTarget}</div>
            <div>• {hydrationGoal.totalCups}</div>
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
        <button className="w-full py-4 rounded-2xl font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-all">
          식사 알림 설정
        </button>
      </div>
    </div>
  );
};