import React, { useState } from 'react';

export const OnboardingStep2: React.FC = () => {
  const [appleHealthEnabled, setAppleHealthEnabled] = useState(false);
  const [googleFitEnabled, setGoogleFitEnabled] = useState(false);

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

      {/* Progress Indicator */}
      <div className="flex justify-center py-6">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
          <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">웨어러블 기기 연동</h1>
          <p className="text-gray-600">더 정확한 수면 분석을 위해 연결하세요</p>
          <p className="text-sm text-gray-500 mt-2">(선택사항)</p>
        </div>

        {/* Device Connection Options */}
        <div className="space-y-4">
          {/* Apple Health */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Apple Health</div>
                  <div className="text-sm text-gray-600">수면 및 심박수 데이터</div>
                </div>
              </div>
              <button
                onClick={() => setAppleHealthEnabled(!appleHealthEnabled)}
                className={`w-12 h-6 rounded-full transition-all ${
                  appleHealthEnabled ? 'bg-indigo-500' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                  appleHealthEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}></div>
              </button>
            </div>
            {appleHealthEnabled && (
              <div className="mt-3 flex items-center space-x-2 text-green-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">연결됨</span>
              </div>
            )}
          </div>

          {/* Google Fit */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Google Fit</div>
                  <div className="text-sm text-gray-600">활동량 및 수면 추적</div>
                </div>
              </div>
              <button
                onClick={() => setGoogleFitEnabled(!googleFitEnabled)}
                className={`w-12 h-6 rounded-full transition-all ${
                  googleFitEnabled ? 'bg-indigo-500' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                  googleFitEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}></div>
              </button>
            </div>
            {googleFitEnabled && (
              <div className="mt-3 flex items-center space-x-2 text-green-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">연결됨</span>
              </div>
            )}
          </div>
        </div>

        {/* Skip Option */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            연결을 건너뛰어도 앱의 핵심 기능을 사용할 수 있습니다
          </p>
        </div>

        {/* Privacy Notice */}
        <div className="bg-purple-50 rounded-2xl p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-purple-900 mb-2">개인정보 보호 정책</h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• 오디오/위치 정보는 수집하지 않습니다</li>
                <li>• 수면 데이터는 기기 내에서만 처리됩니다</li>
                <li>• 의료 진단이 아닌 정보 제공 목적입니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="absolute bottom-8 left-6 right-6">
        <button className="w-full py-4 rounded-2xl font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-all">
          시작하기
        </button>
      </div>
    </div>
  );
};