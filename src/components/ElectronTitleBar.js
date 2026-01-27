import React from 'react';
import { useAroma } from '../context/AromaContext';
import { Minimize2, Square, X } from 'lucide-react';

const ElectronTitleBar = () => {
  const { currentTheme } = useAroma();

  // Electron에서만 렌더링
  if (!window.isElectron) return null;

  return (
    <div className={`h-8 ${currentTheme.gradient} flex items-center justify-between px-4 select-none drag`}>
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-lavender-200 to-lavender-400 flex items-center justify-center">
          <span className="text-lavender-800 font-bold text-xs">S</span>
        </div>
        <span className="text-sm font-medium text-soft-gray-700">ShiftHealth</span>
      </div>
      
      {/* Windows/Linux 스타일 컨트롤 (macOS는 시스템 기본 사용) */}
      {window.electronAPI?.platform !== 'darwin' && (
        <div className="flex items-center space-x-1 no-drag">
          <button className="p-1 hover:bg-white/20 rounded transition-colors">
            <Minimize2 size={12} className="text-soft-gray-600" />
          </button>
          <button className="p-1 hover:bg-white/20 rounded transition-colors">
            <Square size={12} className="text-soft-gray-600" />
          </button>
          <button className="p-1 hover:bg-red-500 hover:text-white rounded transition-colors">
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ElectronTitleBar;