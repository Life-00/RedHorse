import React, { createContext, useContext, useState } from 'react';

interface AromaContextType {
  currentTheme: {
    primary: string;
    secondary: string;
    background: string;
    cardBackground: string;
    gradient: string;
    text: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
}

const AromaContext = createContext<AromaContextType>({
  currentTheme: {
    primary: '#5d5cff',
    secondary: '#ff8a00',
    background: '#ffffff',
    cardBackground: '#f9fafb',
    gradient: 'linear-gradient(135deg, #5d5cff 0%, #ff8a00 100%)',
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
      accent: '#5d5cff'
    }
  }
});

export const useAroma = () => {
  const context = useContext(AromaContext);
  if (!context) {
    throw new Error('useAroma must be used within an AromaProvider');
  }
  return context;
};

export const AromaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme] = useState({
    primary: '#5d5cff',
    secondary: '#ff8a00',
    background: '#ffffff',
    cardBackground: '#f9fafb',
    gradient: 'linear-gradient(135deg, #5d5cff 0%, #ff8a00 100%)',
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
      accent: '#5d5cff'
    }
  });

  return (
    <AromaContext.Provider value={{ currentTheme }}>
      {children}
    </AromaContext.Provider>
  );
};