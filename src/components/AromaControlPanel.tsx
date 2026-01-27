import React from 'react';
import { motion } from 'framer-motion';
import { X, Lightbulb } from 'lucide-react';

interface AromaControlPanelProps {
  onClose: () => void;
}

const AromaControlPanel: React.FC<AromaControlPanelProps> = ({ onClose }) => {
  // 에러를 일으키던 복잡한 로직을 빼고, UI 확인을 위한 임시 데이터를 넣었습니다.
  const autoMode = false;
  const aromas = [
    { id: 'morning', name: '모닝 케어', color: 'bg-orange-400' },
    { id: 'night', name: '나이트 릴렉스', color: 'bg-indigo-400' }
  ];

  return (
    <div className="p-6 bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">아로마 테라피</h2>
          <p className="text-sm text-white/60">오늘의 무드를 선택하세요</p>
        </div>
        <button onClick={onClose} className="p-2 text-white">
          <X size={24} />
        </button>
      </div>

      {/* 자동 모드 UI */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 mb-6">
        <p className="font-medium text-white">자동 추천 모드</p>
        <div className="w-10 h-5 bg-white/20 rounded-full relative">
          <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
        </div>
      </div>

      {/* 아로마 버튼 그리드 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {aromas.map((aroma) => (
          <button key={aroma.id} className="p-4 rounded-2xl bg-white/10 border border-white/10 text-white">
            <div className={`w-10 h-10 ${aroma.color} rounded-full mb-2 mx-auto`} />
            <p className="text-sm">{aroma.name}</p>
          </button>
        ))}
      </div>

      <div className="flex items-start space-x-3 p-4 rounded-xl bg-white/5">
        <Lightbulb size={18} className="text-yellow-300 mt-1" />
        <p className="text-sm text-white/70">
          적절한 아로마는 깊은 수면을 유도해 피로 회복을 도와줍니다.
        </p>
      </div>
    </div>
  );
};

export default AromaControlPanel;