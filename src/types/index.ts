export interface AromaType {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  color: string;
}

export interface UserPreferences {
  shiftType: 'day' | 'night' | 'rotating';
  sleepGoal: number;
  wakeTime: string;
  bedTime: string;
  breakTime: number;
}

export interface SleepData {
  date: string;
  bedTime: string;
  wakeTime: string;
  quality: number;
  duration: number;
}

export interface ShiftSchedule {
  date: string;
  startTime: string;
  endTime: string;
  type: 'day' | 'night' | 'evening';
}

// 기본 타입들
export interface HealthData {
  sleepHours: number;
  caffeineIntake: number;
  workDays: number;
  completionRate: number;
  stressLevel: 'low' | 'medium' | 'high';
}

// 수면 관련 타입
export interface SleepPlan {
  day: string;
  date: string;
  sleepTime: string;
  wakeTime: string;
  duration: number;
  quality: 'good' | 'fair' | 'poor';
  workShift: 'day' | 'night' | 'off';
}

export interface SleepData {
  currentPlan: SleepPlan | null;
  weeklyPlan: SleepPlan[];
  sleepDebt: number;
  averageSleep: number;
  circadianRhythm: 'morning' | 'evening';
}

// 일정 관련 타입
export interface Schedule {
  id: number;
  title: string;
  time: string;
  location: string;
  type: 'work' | 'rest' | 'personal';
  date: string;
}

// 메시지 타입
export interface Message {
  id: number;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

// 통계 데이터 타입
export interface WeeklyData {
  name: string;
  sleep: number;
  caffeine: number;
  stress: number;
}

// 할일 관리 타입
export interface TodoItem {
  id: number;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  estimatedTime: number;
  category: string;
}

// 백색소음 타입
export interface WhiteNoiseTrack {
  id: number;
  name: string;
  description: string;
  duration: number;
  url: string;
  category: 'nature' | 'urban' | 'ambient';
}

// 피로도 관련 타입
export interface FatigueData {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors: {
    sleep: number;
    workHours: number;
    caffeine: number;
    stress: number;
  };
  recommendations: string[];
}

// 팀 대시보드 타입
export interface TeamMember {
  id: number;
  name: string;
  role: string;
  fatigueLevel: number;
  workingHours: number;
  lastCheckIn: Date;
}

export interface TeamStats {
  totalMembers: number;
  averageFatigue: number;
  workingNow: number;
  alertsCount: number;
}

// Electron API 타입
export interface ElectronAPI {
  getVersion: () => Promise<string>;
  showSaveDialog: () => Promise<{ canceled: boolean; filePath?: string }>;
  showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  showNotification: (title: string, body: string) => void;
  platform: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    isElectron?: boolean;
  }
}