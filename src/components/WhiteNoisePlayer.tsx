import React, { useState } from 'react';

export const WhiteNoisePlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSound, setSelectedSound] = useState('rain');
  const [volume, setVolume] = useState(70);
  const [timer, setTimer] = useState(60);

  // 5가지 사운드 옵션
  const sounds = [
    { 
      id: 'rain', 
      name: '빗소리', 
      description: '부드러운 빗방울 소리',
      icon: '🌧️',
      color: 'from-blue-500 to-blue-600'
    },
    { 
      id: 'ocean', 
      name: '파도 소리', 
      description: '잔잔한 바다 파도',
      icon: '🌊',
      color: 'from-teal-500 to-cyan-500'
    },
    { 
      id: 'forest', 
      name: '바람 소리', 
      description: '숲 속 바람',
      icon: '🌲',
      color: 'from-green-500 to-emerald-500'
    },
    { 
      id: 'white', 
      name: '화이트 노이즈', 
      description: '순수 백색 소음',
      icon: '📻',
      color: 'from-gray-500 to-gray-600'
    },
    { 
      id: 'brown', 
      name: '브라운 노이즈', 
      description: '깊은 저주파 소음',
      icon: '🔊',
      color: 'from-orange-500 to-red-500'
    }
  ];

  // 타이머 옵션 (6가지)
  const timerOptions = [15, 30, 45, 60, 90, 120];

  const selectedSoundData = sounds.find(s => s.id === selectedSound) || sounds[0];

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
  };

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
          <h1 className="text-lg font-semibold text-gray-900">백색소음 플레이어</h1>
          <button className="p-2 -mr-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6 overflow-y-auto" style={{ maxHeight: '600px' }}>
        
        {/* 현재 재생 중 (상단 히어로 카드) */}
        <div className={`bg-gradient-to-r ${selectedSoundData.color} rounded-2xl p-6 text-white`}>
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
              {selectedSoundData.icon}
            </div>
            <h2 className="text-xl font-bold mb-1">{selectedSoundData.name}</h2>
            <p className="text-sm opacity-90 mb-4">{selectedSoundData.description}</p>

            {/* Play/Pause Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all mb-4"
            >
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {isPlaying && (
              <div className="flex items-center justify-center space-x-2">
                {/* 재생 중 비주얼 - 애니메이션 바 3개 */}
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-4 bg-white/60 rounded animate-pulse"></div>
                  <div className="w-1 h-6 bg-white/80 rounded animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1 h-3 bg-white/60 rounded animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span className="text-sm opacity-90">재생 중 • {formatTime(timer)} 남음</span>
              </div>
            )}
          </div>
        </div>

        {/* 볼륨 조절 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-semibold text-gray-900">볼륨</span>
            <span className="text-sm text-gray-600">{volume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* 타이머 설정 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">타이머 설정</h3>
          <div className="grid grid-cols-3 gap-3">
            {timerOptions.map((time) => (
              <button
                key={time}
                onClick={() => setTimer(time)}
                className={`py-3 rounded-xl font-semibold transition-all ${
                  timer === time
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {formatTime(time)}
              </button>
            ))}
          </div>
        </div>

        {/* 사운드 선택 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">사운드 선택</h3>
          <div className="grid grid-cols-2 gap-3">
            {sounds.map((sound) => (
              <button
                key={sound.id}
                onClick={() => setSelectedSound(sound.id)}
                className={`p-4 rounded-2xl text-center transition-all ${
                  selectedSound === sound.id
                    ? 'bg-indigo-50 border-2 border-indigo-500'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <div className="text-3xl mb-2">{sound.icon}</div>
                <div className="font-semibold text-gray-900 text-sm mb-1">{sound.name}</div>
                <div className="text-xs text-gray-600">{sound.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 수면 효과 팁 */}
        <div className="bg-purple-50 rounded-2xl p-4">
          <h3 className="font-semibold text-purple-900 mb-3">😴 수면 효과</h3>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• 외부 소음 차단하여 깊은 수면 유도</li>
            <li>• 뇌파를 안정시켜 스트레스 완화</li>
            <li>• 일정한 소리로 수면 패턴 개선</li>
            <li>• 교대근무자의 낮잠 품질 향상</li>
          </ul>
        </div>

        {/* 추천 조합 */}
        <div className="bg-blue-50 rounded-2xl p-4">
          <h3 className="font-semibold text-blue-900 mb-3">💡 추천 조합</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div>• 주간 수면 (밝은 환경): 화이트 노이즈 + 안대</div>
            <div>• 긴장 완화: 빗소리 + 명상</div>
            <div>• 깊은 수면: 브라운 노이즈 + 60분</div>
          </div>
        </div>

        {/* 볼륨 가이드 */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <h3 className="font-semibold text-gray-900 mb-2">🔊 볼륨 가이드</h3>
          <div className="text-sm text-gray-700">
            적정 볼륨은 60-70%, 너무 크면 역효과. 타이머로 수면 후 자동 종료 권장
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
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-full py-4 rounded-2xl font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all"
        >
          {isPlaying ? '재생 중지' : '재생 시작'}
        </button>
      </div>
    </div>
  );
};