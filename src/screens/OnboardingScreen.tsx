import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAroma } from '../context/AromaContext';
import { ChevronRight, Shield } from 'lucide-react';

const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentTheme } = useAroma();
  const [currentStep, setCurrentStep] = useState(0);
  const [userPreferences, setUserPreferences] = useState({
    workType: '',
    breakTime: 30,
    wearableDevice: ''
  });

  const steps = [
    {
      title: '근무 형태를\n선택해주세요',
      subtitle: '생체리듬 최적화를 위한 첫 단계입니다',
      type: 'workType'
    },
    {
      title: '웨어러블 기기\n연결 (선택)',
      subtitle: '수면 데이터로 더 정확한 분석을 제공합니다',
      type: 'wearable'
    }
  ];

  const workTypeOptions = [
    { 
      id: '2shift', 
      label: '2교대', 
      icon: '☀️', 
      description: '주간/야간 순환' 
    },
    { 
      id: '3shift', 
      label: '3교대', 
      icon: '🌅', 
      description: '주간/중간/야간' 
    },
    { 
      id: 'fixed_night', 
      label: '고정 야간', 
      icon: '🌙', 
      description: '밤 근무 고정' 
    },
    { 
      id: 'irregular', 
      label: '불규칙', 
      icon: '🔀', 
      description: '변동 스케줄' 
    }
  ];

  const wearableOptions = [
    {
      id: 'apple_health',
      label: 'Apple Health',
      icon: '🍎',
      description: '수면, 심박수 데이터 연동'
    },
    {
      id: 'google_fit',
      label: 'Google Fit',
      icon: '🏃',
      description: '활동량, 수면 데이터 연동'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // 온보딩 완료 후 홈으로 이동
      localStorage.setItem('onboardingCompleted', 'true');
      localStorage.setItem('userPreferences', JSON.stringify(userPreferences));
      navigate('/');
    }
  };

  const handleOptionSelect = (optionId: string) => {
    if (currentStep === 0) {
      setUserPreferences(prev => ({ ...prev, workType: optionId }));
    } else if (currentStep === 1) {
      setUserPreferences(prev => ({ ...prev, wearableDevice: optionId }));
    }
  };

  const isStepComplete = () => {
    if (currentStep === 0) return userPreferences.workType !== '';
    if (currentStep === 1) return true; // 웨어러블은 선택사항
    return false;
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 상태바 영역 */}
      <div className="h-12 bg-black rounded-b-3xl mx-4 mb-8 flex items-center justify-between px-6 text-white text-sm">
        <span>9:41</span>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-2 border border-white rounded-sm">
            <div className="w-3 h-1 bg-white rounded-sm m-0.5"></div>
          </div>
        </div>
      </div>
      
      {/* 진행 표시기 */}
      <div className="flex justify-center mb-6">
        <div className="flex space-x-2">
          <div className={`w-2 h-2 rounded-full ${currentStep >= 0 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
          <div className={`w-2 h-2 rounded-full ${currentStep >= 1 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
        </div>
      </div>

      {/* 단계 표시 */}
      <div className="text-center mb-8">
        <p className="text-gray-400 text-sm">
          {currentStep + 1}. Onboarding Step {currentStep + 1}
        </p>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 px-6">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="max-w-md mx-auto"
        >
          <h1 className="text-3xl font-light text-gray-900 mb-4 leading-tight whitespace-pre-line">
            {currentStepData.title}
          </h1>
          <p className="text-gray-500 mb-12 text-base">
            {currentStepData.subtitle}
          </p>

          {/* 1단계: 근무 형태 선택 */}
          {currentStep === 0 && (
            <>
              <div className="space-y-4 mb-12">
                {workTypeOptions.map((option) => {
                  const isSelected = userPreferences.workType === option.id;
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option.id)}
                      className={`w-full p-5 rounded-2xl border transition-all text-left ${
                        isSelected
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="mr-4 text-2xl">
                          {option.icon}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-lg">
                            {option.label}
                          </div>
                          <div className="text-sm text-gray-500">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 휴게 시간 설정 */}
              <div className="mb-12">
                <label className="block text-gray-600 mb-4">
                  휴게 시간 (분)
                </label>
                <div className="text-4xl font-light text-gray-900 mb-6">
                  {userPreferences.breakTime}
                </div>
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="15"
                  value={userPreferences.breakTime}
                  onChange={(e) => setUserPreferences(prev => ({ 
                    ...prev, 
                    breakTime: parseInt(e.target.value) 
                  }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer custom-slider"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>15분</span>
                  <span>120분</span>
                </div>
              </div>
            </>
          )}

          {/* 2단계: 웨어러블 기기 연결 */}
          {currentStep === 1 && (
            <>
              <div className="space-y-4 mb-8">
                {wearableOptions.map((option) => {
                  const isSelected = userPreferences.wearableDevice === option.id;
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option.id)}
                      className={`w-full p-5 rounded-2xl border transition-all text-left ${
                        isSelected
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="mr-4 text-2xl">
                          {option.icon}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-lg">
                            {option.label}
                          </div>
                          <div className="text-sm text-gray-500">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 개인정보 보호 안내 */}
              <div className="bg-blue-50 rounded-2xl p-6 mb-12">
                <div className="flex items-start mb-4">
                  <Shield className="text-blue-500 mr-3 mt-1" size={20} />
                  <h3 className="font-medium text-blue-900">개인정보 보호</h3>
                </div>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• 오디오/위치 정보는 수집하지 않습니다</li>
                  <li>• 수면 데이터는 기기 내에서만 처리됩니다</li>
                  <li>• 의료 진단이 아닌 정보 제공 목적입니다</li>
                </ul>
              </div>

              <p className="text-sm text-gray-500 text-center mb-8">
                연결을 건너뛰어도 앱의 핵심 기능을 사용할 수 있습니다
              </p>
            </>
          )}
        </motion.div>
      </div>

      {/* 다음/시작하기 버튼 */}
      <div className="p-6">
        <button
          onClick={handleNext}
          disabled={!isStepComplete()}
          className={`w-full py-4 rounded-2xl font-medium transition-all flex items-center justify-center text-lg ${
            isStepComplete()
              ? 'bg-purple-400 text-white hover:bg-purple-500 shadow-lg'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {currentStep === steps.length - 1 ? '시작하기' : '다음'}
          <ChevronRight className="ml-2" size={24} />
        </button>
      </div>
    </div>
  );
};

export default OnboardingScreen;