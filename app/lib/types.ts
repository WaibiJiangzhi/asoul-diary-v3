export type AppTab = 'today' | 'growth' | 'journal';
export type Mood = 'happy' | 'good' | 'plain' | 'annoyed' | 'sad' | '';
export type ThemeMode = 'paper' | 'wallpaper';

export interface CommonItem {
  id: string;
  emoji: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTask {
  id: string;
  date: string;
  emoji: string;
  title: string;
  done: boolean;
  sourceCommonId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Countdown {
  id: string;
  kind: 'countdown';
  emoji: string;
  title: string;
  targetDate: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressEvent {
  id: string;
  delta: number;
  valueAfter: number;
  createdAt: string;
}

export interface ProgressGoal {
  id: string;
  kind: 'progress';
  emoji: string;
  title: string;
  current: number;
  total: number;
  unit: string;
  step: number;
  note: string;
  color: '#E799B0' | '#DB7D74' | '#576690';
  events: ProgressEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface GrowthMemory {
  id: string;
  sourceGoalId: string;
  emoji: string;
  title: string;
  current: number;
  total: number;
  unit: string;
  note: string;
  completedNaturally: boolean;
  startedAt: string;
  endedAt: string;
  events: ProgressEvent[];
}

export interface DiaryEntry {
  date: string;
  mood: Mood;
  body: string;
  photoIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  theme: ThemeMode;
  wallpaper: string;
  haptics: boolean;
}

export interface AppState {
  version: 3;
  commonItems: CommonItem[];
  dailyTasks: DailyTask[];
  countdowns: Countdown[];
  progressGoals: ProgressGoal[];
  memories: GrowthMemory[];
  diaries: DiaryEntry[];
  settings: AppSettings;
}

export interface StoredPhoto {
  id: string;
  blob: Blob;
  name: string;
  createdAt: string;
}

export interface BackupPhoto {
  id: string;
  dataUrl: string;
  name: string;
  createdAt: string;
}

export interface V3Backup {
  product: 'asoul-diary-v3';
  exportedAt: string;
  state: AppState;
  photos: BackupPhoto[];
}
