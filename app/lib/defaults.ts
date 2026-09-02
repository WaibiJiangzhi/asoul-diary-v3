import type { AppState } from './types';

export const WALLPAPERS = [
  '/wallpapers/bella-1.webp',
  '/wallpapers/bella-2.webp',
  '/wallpapers/bella-3.webp',
  '/wallpapers/bella-4.webp',
  '/wallpapers/bella-5.webp',
  '/wallpapers/jiaran-1.webp',
  '/wallpapers/jiaran-2.webp',
  '/wallpapers/jiaran-3.webp',
  '/wallpapers/jiaran-4.webp',
  '/wallpapers/jiaran-5.webp',
  '/wallpapers/nailin-1.webp',
  '/wallpapers/nailin-2.webp',
  '/wallpapers/nailin-3.webp',
  '/wallpapers/nailin-4.webp',
  '/wallpapers/nailin-5.webp',
] as const;

export function createId(prefix = 'item') {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}-${id}`;
}

export function createDefaultState(): AppState {
  const now = new Date().toISOString();
  return {
    version: 3,
    commonItems: [
      { id: createId('common'), emoji: '🏃', title: '跑步', createdAt: now, updatedAt: now },
      { id: createId('common'), emoji: '🎹', title: '练琴', createdAt: now, updatedAt: now },
      { id: createId('common'), emoji: '📖', title: '读书', createdAt: now, updatedAt: now },
    ],
    dailyTasks: [],
    countdowns: [],
    progressGoals: [],
    memories: [],
    diaries: [],
    settings: {
      theme: 'paper',
      wallpaper: WALLPAPERS[0],
      haptics: true,
    },
  };
}
