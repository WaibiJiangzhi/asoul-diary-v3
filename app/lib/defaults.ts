import type { AccentTheme, AppState, CardColor } from './types';

export const ACCENT_THEMES: {
  id: AccentTheme;
  name: string;
  feeling: string;
  color: CardColor;
}[] = [
  { id: 'bella', name: '贝拉红', feeling: '温暖有活力', color: '#DB7D74' },
  { id: 'jiaran', name: '嘉然粉', feeling: '柔软又温馨', color: '#E799B0' },
  { id: 'nailin', name: '乃琳蓝', feeling: '安静的夜色', color: '#576690' },
];

export const ACCENT_COLORS: Record<AccentTheme, CardColor> = {
  bella: '#DB7D74',
  jiaran: '#E799B0',
  nailin: '#576690',
};

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
  const id =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}-${id}`;
}

export function createDefaultState(): AppState {
  const now = new Date().toISOString();
  return {
    version: 3,
    commonItems: [
      {
        id: createId('common'),
        emoji: '🏃',
        title: '跑步',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: createId('common'),
        emoji: '🎹',
        title: '练琴',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: createId('common'),
        emoji: '📖',
        title: '读书',
        createdAt: now,
        updatedAt: now,
      },
    ],
    dailyTasks: [],
    countdowns: [],
    progressGoals: [],
    memories: [],
    diaries: [],
    settings: {
      theme: 'paper',
      accent: 'bella',
      wallpaper: WALLPAPERS[0],
      haptics: true,
    },
  };
}

export function normalizeState(candidate: AppState): AppState {
  const fresh = createDefaultState();
  return {
    ...fresh,
    ...candidate,
    commonItems: candidate.commonItems ?? [],
    dailyTasks: candidate.dailyTasks ?? [],
    countdowns: (candidate.countdowns ?? []).map((item) => ({
      ...item,
      color: item.color ?? '#DB7D74',
    })),
    progressGoals: (candidate.progressGoals ?? []).map((goal) => ({
      ...goal,
      color: goal.color ?? '#E799B0',
      events: (goal.events ?? []).map((event) => ({
        ...event,
        note: event.note ?? '',
      })),
    })),
    memories: (candidate.memories ?? []).map((memory) => ({
      ...memory,
      color: memory.color ?? '#E799B0',
      events: (memory.events ?? []).map((event) => ({
        ...event,
        note: event.note ?? '',
      })),
    })),
    diaries: (candidate.diaries ?? []).map((entry) => ({
      ...entry,
      taskSnapshots: entry.taskSnapshots ?? [],
    })),
    settings: {
      ...fresh.settings,
      ...candidate.settings,
      accent: candidate.settings?.accent ?? 'bella',
    },
  };
}
