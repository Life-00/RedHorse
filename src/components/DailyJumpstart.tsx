import React, { useState } from 'react';

export const DailyJumpstart: React.FC = () => {
  const [tasks, setTasks] = useState([
    // Now Block (핑크 그라데이션)
    { id: 1, block: 'now', title: '밝은 빛 노출', time: '10분', completed: true },
    { id: 2, block: 'now', title: '가벼운 스트레칭', time: '5분', completed: true },
    
    // Must-do Block (인디고-보라 그라데이션)
    { id: 3, block: 'mustdo', title: '메인 수면', time: '60분', completed: false },
    { id: 4, block: 'mustdo', title: '식사, 단백질 중심', time: '20분', completed: false },
    { id: 5, block: 'mustdo', title: '통근 준비', time: '10분', completed: false },
    
    // Recovery Block (초록-청록 그라데이션)
    { id: 6, block: 'recovery', title: '근무 전 파워냅', time: '15분', completed: false },
    { id: 7, block: 'recovery', title: '심호흡 및 마인드풀니스', time: '5분', completed: false }
  ]);

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const getBlockInfo = (blockType: string) => {
    switch (blockType) {
      case 'now':
        return {
          title: 'Now',
          subtitle: '지금 바로 실행',
          totalTime: '15분',
          gradient: 'from-pink-500 to-rose-500',
          icon: '⚡'
        };
      case 'mustdo':
        return {
          title: 'Must-do',
          subtitle: '필수 실행',
          totalTime: '90분',
          gradient: 'from-indigo-500 to-purple-500',
          icon: '⏰'
        };
      case 'recovery':
        return {
          title: 'Recovery',
          subtitle: '회복 루틴',
          totalTime: '20분',
          gradient: 'from-green-500 to-teal-500',
          icon: '🔄'
        };
      default:
        return {
          title: '',
          subtitle: '',
          totalTime: '',
          gradient: 'from-gray-500 to-gray-600',
          icon: '📋'
        };
    }
  };

  const getBlockTasks = (blockType: string) => {
    return tasks.filter(task => task.block === blockType);
  };

  const getBlockProgress = (blockType: string) => {
    const blockTasks = getBlockTasks(blockType);
    const completedTasks = blockTasks.filter(task => task.completed).length;
    return { completed: completedTasks, total: blockTasks.length };
  };

  const blocks = ['now', 'mustdo', 'recovery'];

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
          <h1 className="text-lg font-semibold text-gray-900">오늘의 점프스타트</h1>
          <button className="p-2 -mr-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6 overflow-y-auto" style={{ maxHeight: '600px' }}>
        
        {/* 3개 블록 구조 */}
        {blocks.map((blockType) => {
          const blockInfo = getBlockInfo(blockType);
          const blockTasks = getBlockTasks(blockType);
          const progress = getBlockProgress(blockType);
          const progressPercentage = (progress.completed / progress.total) * 100;

          return (
            <div key={blockType} className={`bg-gradient-to-r ${blockInfo.gradient} rounded-2xl p-6 text-white`}>
              {/* Block Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xl font-bold">{blockInfo.title}</div>
                  <div className="text-sm opacity-90">{blockInfo.subtitle}: {blockInfo.totalTime}</div>
                </div>
                <div className="text-3xl">{blockInfo.icon}</div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/20 rounded-full h-2 mb-4">
                <div 
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>

              {/* Progress Counter */}
              <div className="text-sm opacity-90 mb-4">
                {progress.completed} / {progress.total} 완료
              </div>

              {/* Task List */}
              <div className="space-y-3">
                {blockTasks.map((task) => (
                  <div key={task.id} className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`w-5 h-5 rounded border-2 border-white flex items-center justify-center transition-all ${
                        task.completed ? 'bg-white' : 'bg-transparent'
                      }`}
                    >
                      {task.completed && (
                        <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1">
                      <div className={`font-medium ${task.completed ? 'line-through opacity-75' : ''}`}>
                        {task.title}
                      </div>
                      <div className="text-sm opacity-75">({task.time})</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Overall Progress */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {tasks.filter(t => t.completed).length} / {tasks.length}
            </div>
            <div className="text-sm text-gray-600 mb-3">전체 완료</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(tasks.filter(t => t.completed).length / tasks.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            개인 상황에 맞게 조정 가능합니다
          </p>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="absolute bottom-8 left-6 right-6">
        <button className="w-full py-4 rounded-2xl font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-all">
          모든 준비 완료
        </button>
      </div>
    </div>
  );
};