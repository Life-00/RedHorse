import React from 'react';
import { motion } from 'framer-motion';
import { AromaTheme } from '../theme/aromatherapyTheme';

interface AromaBackgroundProps {
  theme: AromaTheme;
  children: React.ReactNode;
  showMistEffect?: boolean;
}

const AromaBackground: React.FC<AromaBackgroundProps> = ({ 
  theme, 
  children, 
  showMistEffect = false 
}) => {
  const gradientClass = `gradient-${theme.name.toLowerCase()}`;

  return (
    <div className={`min-h-screen ${gradientClass} relative overflow-hidden`}>
      {/* 안개 효과 레이어 */}
      {showMistEffect && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0, 0.3, 0.1, 0.3],
            scale: [0.8, 1.2, 0.8, 1.2]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div 
            className="w-full h-full rounded-full blur-3xl"
            style={{
              background: `radial-gradient(circle, ${theme.primary}20, ${theme.secondary}10, ${theme.primary}20)`
            }}
          />
        </motion.div>
      )}
      
      {/* 컨텐츠 */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default AromaBackground;