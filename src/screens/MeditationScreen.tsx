import React, { useState, useEffect } from 'react';
import { useAroma } from '../context/AromaContext';

const MeditationScreen: React.FC = () => {
  const { currentTheme } = useAroma();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(10);
  const [selectedType, setSelectedType] = useState('breathing');

  const meditationTypes = [
    { id: 'breathing', name: '호흡 명상', icon: '🫁', color: 'bg-blue-100 text-blue-600' },
    { id: 'body', name: '바디스캔', icon: '🧘‍♀️', color: 'bg-green-100 text-green-600' },
    { id: 'mindfulness', name: '마음챙김', icon: '🧠', color: 'bg-purple-100 text-purple-600' },
    { id: 'sleep', name: '수면 명상', icon: '😴', color: 'bg-indigo-100 text-indigo-600' },
  ];

  const durations = [5, 10, 15, 20, 30];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentTime < selectedDuration * 60) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    } else if (currentTime >= selectedDuration * 60) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, selectedDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (currentTime / (selectedDuration * 60)) * 100;

  const handlePlayPause = () => {
    if (currentTime >= selectedDuration * 60) {
      setCurrentTime(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
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
          <h1 className="text-lg font-semibold text-gray-900">명상 가이드</h1>
          <button className="p-2 -mr-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 space-y-6">
        {/* Meditation Timer Circle */}
        <div className="text-center">
          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke={currentTheme.primary}
                strokeWidth="8"
                strokeDasharray={`${(progress / 100) * 565} 565`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-in-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-light text-gray-900 mb-2">
                  {formatTime(selectedDuration * 60 - currentTime)}
                </div>
                <div className="text-sm text-gray-500">남은 시간</div>
              </div>
            </div>
          </div>

          {/* Play/Pause Controls */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handleReset}
              className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
            
            <button
              onClick={handlePlayPause}
              className="w-16 h-16 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: currentTheme.primary }}
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
          </div>
        </div>

        {/* Meditation Type Selection */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">명상 유형</h3>
          <div className="grid grid-cols-2 gap-3">
            {meditationTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  selectedType === type.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="text-sm font-medium text-gray-900">{type.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Duration Selection */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">시간 설정</h3>
          <div className="flex space-x-2">
            {durations.map((duration) => (
              <button
                key={duration}
                onClick={() => {
                  setSelectedDuration(duration);
                  setCurrentTime(0);
                  setIsPlaying(false);
                }}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  selectedDuration === duration
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {duration}분
              </button>
            ))}
          </div>
        </div>

        {/* Breathing Guide */}
        {selectedType === 'breathing' && (
          <div className="bg-blue-50 rounded-2xl p-4">
            <h4 className="font-semibold text-blue-900 mb-2">호흡 가이드</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• 4초간 천천히 숨을 들이마시세요</p>
              <p>• 4초간 숨을 참으세요</p>
              <p>• 6초간 천천히 숨을 내쉬세요</p>
              <p>• 이 과정을 반복하세요</p>
            </div>
          </div>
        )}

        {/* Progress Stats */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">7</div>
              <div className="text-xs text-gray-600">연속 일수</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">42</div>
              <div className="text-xs text-gray-600">총 세션</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">8.5h</div>
              <div className="text-xs text-gray-600">총 시간</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeditationScreen;