import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAroma } from '../context/AromaContext';
import Navigation from './Navigation';
import AromaControlPanel from './AromaControlPanel';
import ElectronTitleBar from './ElectronTitleBar';
import { Palette } from 'lucide-react';

const Layout = () => {
  const { currentTheme } = useAroma();
  const [showAromaPanel, setShowAromaPanel] = useState(false);
  const location = useLocation();

  return (
    <div className={`min-h-screen ${currentTheme.gradient} mist-background relative`}>
      {/* Electron 타이틀바 */}
      <ElectronTitleBar />
      
      {/* 안개 효과 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-white/10 animate-mist"></div>
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 rounded-full bg-white/5 animate-mist" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* 헤더 */}
        <header className="glass-effect border-b border-white/20 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lavender-200 to-lavender-400 flex items-center justify-center">
                  <span className="text-lavender-800 font-bold text-sm">S</span>
                </div>
                <h1 className="text-xl font-semibold text-soft-gray-800 text-shadow-soft">
                  ShiftHealth
                </h1>
              </div>
              
              <button
                onClick={() => setShowAromaPanel(!showAromaPanel)}
                className="p-2 rounded-xl glass-effect hover:bg-white/30 transition-all duration-200"
              >
                <Palette size={20} className="text-soft-gray-600" />
              </button>
            </div>
          </div>
        </header>

        {/* 페이지 컨텐츠 */}
        <main className="flex-1 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* 네비게이션 */}
        <Navigation />
      </div>

      {/* 아로마 컨트롤 패널 */}
      <AnimatePresence>
        {showAromaPanel && (
          <AromaControlPanel onClose={() => setShowAromaPanel(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;