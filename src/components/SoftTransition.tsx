import React from 'react';
import { motion } from 'framer-motion';
import { AromaTheme } from '../theme/aromatherapyTheme';

interface SoftTransitionProps {
  children: React.ReactNode;
  theme?: AromaTheme;
  isVisible?: boolean;
  duration?: number;
  onTransitionComplete?: () => void;
}

const SoftTransition: React.FC<SoftTransitionProps> = ({ 
  children, 
  theme,
  isVisible = true, 
  duration = 0.8,
  onTransitionComplete 
}) => {
  return (
    <motion.div
      initial={{ 
        opacity: isVisible ? 0 : 1, 
        scale: isVisible ? 0.95 : 1, 
        y: isVisible ? 20 : 0 
      }}
      animate={{ 
        opacity: isVisible ? 1 : 0, 
        scale: isVisible ? 1 : 0.95, 
        y: isVisible ? 0 : -10 
      }}
      transition={{
        duration,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      onAnimationComplete={onTransitionComplete}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

// 스태거드 애니메이션을 위한 컴포넌트
interface StaggeredSoftTransitionProps {
  children: React.ReactNode;
  theme?: AromaTheme;
  isVisible?: boolean;
  staggerDelay?: number;
  duration?: number;
}

export const StaggeredSoftTransition: React.FC<StaggeredSoftTransitionProps> = ({ 
  children, 
  theme,
  isVisible = true, 
  staggerDelay = 0.1,
  duration = 0.6 
}) => {
  return (
    <div className="w-full">
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration,
            delay: index * staggerDelay,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
};

export default SoftTransition;