import React, { createContext, useContext, useState, useEffect } from 'react';

const aromatherapyThemes = {
  lavender: {
    name: '라벤더',
    primary: '#E6E6FA',
    secondary: '#DDA0DD',
    background: '#FAFAFA',
    cardBackground: '#F8F8FF',
    gradient: 'gradient-lavender',
    text: {
      primary: '#4A4A4A',
      secondary: '#6B6B6B',
      accent: '#8B7D8B'
    },
    shadow: {
      color: '#E6E6FA',
      opacity: 0.3
    }
  },
  mint: {
    name: '페퍼민트',
    primary: '#E0F2E7',
    secondary: '#B8E6C1',
    background: '#FAFAFA',
    cardBackground: '#F0FFF0',
    gradient: 'gradient-mint',
    text: {
      primary: '#4A4A4A',
      secondary: '#6B6B6B',
      accent: '#5A8A5A'
    },
    shadow: {
      color: '#B8E6C1',
      opacity: 0.3
    }
  },
  chamomile: {
    name: '카모마일',
    primary: '#FFF8DC',
    secondary: '#F0E68C',
    background: '#FAFAFA',
    cardBackground: '#FFFAF0',
    gradient: 'gradient-chamomile',
    text: {
      primary: '#4A4A4A',
      secondary: '#6B6B6B',
      accent: '#8B8B00'
    },
    shadow: {
      color: '#F0E68C',
      opacity: 0.3
    }
  },
  eucalyptus: {
    name: '유칼립투스',
    primary: '#E0F6FF',
    secondary: '#B0E0E6',
    background: '#FAFAFA',
    cardBackground: '#F0F8FF',
    gradient: 'gradient-eucalyptus',
    text: {
      primary: '#4A4A4A',
      secondary: '#6B6B6B',
      accent: '#4682B4'
    },
    shadow: {
      color: '#B0E0E6',
      opacity: 0.3
    }
  }
};

const getRecommendedAroma = (hour) => {
  if (hour >= 6 && hour < 12) {
    return 'mint';
  } else if (hour >= 12 && hour < 18) {
    return 'eucalyptus';
  } else if (hour >= 18 && hour < 22) {
    return 'chamomile';
  } else {
    return 'lavender';
  }
};

const getAromaByStress = (stressLevel) => {
  switch (stressLevel) {
    case 'high':
      return 'lavender';
    case 'medium':
      return 'chamomile';
    case 'low':
      return 'eucalyptus';
    default:
      return 'mint';
  }
};

const AromaContext = createContext();

export const useAroma = () => {
  const context = useContext(AromaContext);
  if (!context) {
    throw new Error('useAroma must be used within an AromaProvider');
  }
  return context;
};

export const AromaProvider = ({ children }) => {
  const [currentAroma, setCurrentAroma] = useState('lavender');
  const [autoMode, setAutoMode] = useState(true);
  const [userStressLevel, setUserStressLevel] = useState('medium');

  const getCurrentTheme = () => aromatherapyThemes[currentAroma];

  const updateAutoAroma = () => {
    if (autoMode) {
      const currentHour = new Date().getHours();
      const recommendedAroma = getRecommendedAroma(currentHour);
      setCurrentAroma(recommendedAroma);
    }
  };

  const updateAromaByStress = (stressLevel) => {
    setUserStressLevel(stressLevel);
    if (autoMode) {
      const recommendedAroma = getAromaByStress(stressLevel);
      setCurrentAroma(recommendedAroma);
    }
  };

  const changeAroma = (aromaType) => {
    setCurrentAroma(aromaType);
    setAutoMode(false);
    saveSettings(aromaType, false);
  };

  const toggleAutoMode = () => {
    const newAutoMode = !autoMode;
    setAutoMode(newAutoMode);
    
    if (newAutoMode) {
      updateAutoAroma();
    }
    
    saveSettings(currentAroma, newAutoMode);
  };

  const saveSettings = (aroma, auto) => {
    try {
      localStorage.setItem('aromaSettings', JSON.stringify({
        currentAroma: aroma,
        autoMode: auto,
        userStressLevel
      }));
    } catch (error) {
      console.error('아로마 설정 저장 실패:', error);
    }
  };

  const loadSettings = () => {
    try {
      const settings = localStorage.getItem('aromaSettings');
      if (settings) {
        const { currentAroma: savedAroma, autoMode: savedAutoMode, userStressLevel: savedStressLevel } = JSON.parse(settings);
        setCurrentAroma(savedAroma || 'lavender');
        setAutoMode(savedAutoMode !== undefined ? savedAutoMode : true);
        setUserStressLevel(savedStressLevel || 'medium');
      }
    } catch (error) {
      console.error('아로마 설정 불러오기 실패:', error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (autoMode) {
      updateAutoAroma();
      
      const interval = setInterval(() => {
        updateAutoAroma();
      }, 60 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [autoMode]);

  const value = {
    currentAroma,
    currentTheme: getCurrentTheme(),
    autoMode,
    userStressLevel,
    availableAromas: Object.keys(aromatherapyThemes),
    aromatherapyThemes,
    changeAroma,
    toggleAutoMode,
    updateAromaByStress,
    updateAutoAroma,
  };

  return (
    <AromaContext.Provider value={value}>
      {children}
    </AromaContext.Provider>
  );
};