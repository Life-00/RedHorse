import React from 'react';
import { motion } from 'framer-motion';
import { AromaTheme } from '../theme/aromatherapyTheme';

interface SoftCardProps {
  children: React.ReactNode;
  theme?: AromaTheme;
  onClick?: () => void;
  className?: string;
  showGlow?: boolean;
  glowIntensity?: number;
}

const SoftCard: React.FC<SoftCardProps> = ({ 
  children, 
  theme, 
  onClick, 
  className = '', 
  showGlow = false,
  glowIntensity = 0.5 
}) => {
  const cardClasses = `
    soft-card 
    ${onClick ? 'cursor-pointer' : ''} 
    ${showGlow ? 'animate-pulse' : ''} 
    ${className}
  `.trim();

  if (onClick) {
    return (
      <motion.button
        className={cardClasses}
        onClick={onClick}
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.div
      className={cardClasses}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

export default SoftCard;