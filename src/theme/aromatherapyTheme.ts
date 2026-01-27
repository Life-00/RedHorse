// 아로마테라피 기반 시각적 테라피 테마
export interface AromaTheme {
  name: string;
  primary: string;
  secondary: string;
  background: string;
  cardBackground: string;
  gradient: string[];
  text: {
    primary: string;
    secondary: string;
    accent: string;
  };
  shadow: {
    color: string;
    opacity: number;
  };
}

export const aromatherapyThemes: Record<string, AromaTheme> = {
  lavender: {
    name: '라벤더',
    primary: '#E6E6FA', // 연한 라벤더
    secondary: '#DDA0DD', // 플럼
    background: '#FAFAFA', // 오프 화이트
    cardBackground: '#F8F8FF', // 고스트 화이트
    gradient: ['#F8F8FF', '#E6E6FA', '#DDA0DD'],
    text: {
      primary: '#4A4A4A', // 소프트 다크 그레이
      secondary: '#6B6B6B',
      accent: '#8B7D8B'
    },
    shadow: {
      color: '#E6E6FA',
      opacity: 0.3
    }
  },
  peppermint: {
    name: '페퍼민트',
    primary: '#E0F2E7', // 연한 민트
    secondary: '#B8E6C1', // 소프트 민트
    background: '#FAFAFA',
    cardBackground: '#F0FFF0', // 허니듀
    gradient: ['#F0FFF0', '#E0F2E7', '#B8E6C1'],
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
    primary: '#FFF8DC', // 코른실크
    secondary: '#F0E68C', // 카키
    background: '#FAFAFA',
    cardBackground: '#FFFAF0', // 플로럴 화이트
    gradient: ['#FFFAF0', '#FFF8DC', '#F0E68C'],
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
    primary: '#E0F6FF', // 연한 하늘색
    secondary: '#B0E0E6', // 파우더 블루
    background: '#FAFAFA',
    cardBackground: '#F0F8FF', // 앨리스 블루
    gradient: ['#F0F8FF', '#E0F6FF', '#B0E0E6'],
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

// 시간대별 추천 아로마
export const getRecommendedAroma = (hour: number): string => {
  if (hour >= 6 && hour < 12) {
    return 'peppermint'; // 아침: 상쾌한 페퍼민트
  } else if (hour >= 12 && hour < 18) {
    return 'eucalyptus'; // 오후: 집중력을 위한 유칼립투스
  } else if (hour >= 18 && hour < 22) {
    return 'chamomile'; // 저녁: 편안한 카모마일
  } else {
    return 'lavender'; // 밤: 수면을 위한 라벤더
  }
};

// 스트레스 레벨별 추천 아로마
export const getAromaByStress = (stressLevel: string): string => {
  switch (stressLevel) {
    case 'high':
      return 'lavender';
    case 'medium':
      return 'chamomile';
    case 'low':
      return 'eucalyptus';
    default:
      return 'peppermint';
  }
};