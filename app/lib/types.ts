export type AppTab = 'today' | 'growth' | 'journal';
export type Mood = 'happy' | 'good' | 'plain' | 'annoyed' | 'sad' | '';
export type ThemeMode = 'paper' | 'wallpaper';
export type AccentTheme = 'bella' | 'jiaran' | 'nailin';
export type CardColor =
  | '#E799B0'
  | '#DB7D74'
  | '#576690'
  | '#D8946B'
  | '#C89B4B'
  | '#6F9A76'
  | '#5B9292'
  | '#8B78A8'
  | '#84787E';

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
  notes: CountdownNote[];
  color: CardColor;
  createdAt: string;
  updatedAt: string;
}

export interface CountdownNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface ProgressEvent {
  id: string;
  delta: number;
  valueAfter: number;
  note?: string;
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
  color: CardColor;
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
  color: CardColor;
  completedNaturally: boolean;
  startedAt: string;
  endedAt: string;
  events: ProgressEvent[];
}

export interface DiaryTaskSnapshot {
  id: string;
  sourceTaskId: string;
  emoji: string;
  title: string;
  done: boolean;
}

export interface DiaryEntry {
  date: string;
  mood: Mood;
  body: string;
  photoIds: string[];
  taskSnapshots: DiaryTaskSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  theme: ThemeMode;
  accent: AccentTheme;
  wallpaper: string;
  wallpaperCatalogVersion: 2;
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
