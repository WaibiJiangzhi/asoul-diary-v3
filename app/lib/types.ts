export type AppTab = 'life' | 'memories';
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
export type CardKind = 'record' | 'progress' | 'stage' | 'blank';
export interface RecordStatus {
  id: string;
  name: string;
  emoji: string;
  color: CardColor;
}
export interface Stage {
  id: string;
  title: string;
}
export interface LifeRecord {
  id: string;
  date: string;
  body: string;
  photoIds: string[];
  delta?: number;
  statusId?: string;
  stageId?: string;
  stageDone?: boolean;
  stageEmoji?: string;
  createdAt: string;
  updatedAt: string;
}
export interface LifeCard {
  id: string;
  kind: CardKind;
  title: string;
  emoji: string;
  note: string;
  color: CardColor;
  location: 'active' | 'later' | 'memory';
  startDate: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  ending?: 'achieved' | 'closed';
  summary?: string;
  records: LifeRecord[];
  // Configurations survive switching the primary display, as do all records.
  progress?: {
    initial: number;
    total?: number;
    unit: string;
    step: number;
    expectedDate?: string;
  };
  record?: {
    states: RecordStatus[];
    periodDays?: number;
    targetStateId?: string;
    targetDays?: number;
  };
  stages?: Stage[];
}
export interface CompanionCard {
  color?: CardColor;
  id: string;
  kind: 'quote' | 'countdown';
  title: string;
  note: string;
  emoji: string;
  targetDate?: string;
}
export interface AppSettings {
  theme: ThemeMode;
  accent: AccentTheme;
  wallpaper: string;
  haptics: boolean;
  sounds: boolean;
}
export interface AppState {
  version: 1;
  cards: LifeCard[];
  commonCards?: LifeCard[];
  companions: CompanionCard[];
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
export interface DiaryBackup {
  product: 'asoul-life-v3';
  exportedAt: string;
  state: AppState;
  photos: BackupPhoto[];
}
