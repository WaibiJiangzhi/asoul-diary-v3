import type { AccentTheme, AppState, CardColor } from './types';

export const ACCENT_THEMES: {
  id: AccentTheme;
  name: string;
  feeling: string;
  color: CardColor;
}[] = [
  { id: 'jiaran', name: '嘉然粉', feeling: '柔软又温馨', color: '#E799B0' },
  { id: 'bella', name: '贝拉红', feeling: '温暖有活力', color: '#DB7D74' },
  { id: 'nailin', name: '乃琳蓝', feeling: '安静的夜色', color: '#576690' },
];

export const ACCENT_COLORS: Record<AccentTheme, CardColor> = {
  bella: '#DB7D74',
  jiaran: '#E799B0',
  nailin: '#576690',
};

export const WALLPAPERS = [
  '/wallpapers/jiaran-1.webp',
  '/wallpapers/beila-1.webp',
  '/wallpapers/nailin-1.webp',
  '/wallpapers/jiaran-2.webp',
  '/wallpapers/beila-2.webp',
  '/wallpapers/nailin-2.webp',
  '/wallpapers/jiaran-3.webp',
  '/wallpapers/beila-3.webp',
  '/wallpapers/nailin-3.webp',
  '/wallpapers/jiaran-4.webp',
  '/wallpapers/beila-4.webp',
  '/wallpapers/nailin-4.webp',
  '/wallpapers/jiaran-5.webp',
  '/wallpapers/beila-5.webp',
  '/wallpapers/nailin-5.webp',
  '/wallpapers/jiaran-6.webp',
  '/wallpapers/beila-6.webp',
  '/wallpapers/nailin-6.webp',
  '/wallpapers/jiaran-7.webp',
  '/wallpapers/beila-7.webp',
  '/wallpapers/nailin-7.webp',
  '/wallpapers/jiaran-8.webp',
  '/wallpapers/beila-8.webp',
  '/wallpapers/nailin-8.webp',
  '/wallpapers/jiaran-9.webp',
  '/wallpapers/beila-9.webp',
  '/wallpapers/nailin-9.webp',
] as const;

// Keep the persisted wallpaper value stable while changing the requested URL
// whenever bundled wallpaper artwork is replaced under the same filename.
export const WALLPAPER_ASSET_VERSION = '2026-09-04-1';

export function wallpaperAssetUrl(wallpaper: string) {
  return `${wallpaper}?v=${WALLPAPER_ASSET_VERSION}`;
}

export function createId(prefix = 'item') {
  const id =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}-${id}`;
}

export function createDefaultState(): AppState {
  const now = new Date().toISOString();
  return {
    version: 4,
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
    dateMarkers: [],
    settings: {
      theme: 'paper',
      accent: 'jiaran',
      wallpaper: WALLPAPERS[0],
      wallpaperCatalogVersion: 3,
      haptics: true,
      sounds: true,
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
      notes: item.notes ?? [],
      color: item.color ?? '#E799B0',
    })),
    progressGoals: (candidate.progressGoals ?? []).map((goal) => ({
      ...goal,
      color: goal.color ?? '#E799B0',
      events: (goal.events ?? []).map((event) => ({
        ...event,
        note: event.note ?? '',
      })),
    })),
    memories: candidate.memories ?? [],
    diaries: (candidate.diaries ?? []).map((entry) => ({
      ...entry,
      taskSnapshots: entry.taskSnapshots ?? [],
      growthSnapshots: entry.growthSnapshots ?? [],
    })),
    dateMarkers: candidate.dateMarkers ?? [],
    settings: {
      ...fresh.settings,
      ...candidate.settings,
      accent: candidate.settings?.accent ?? 'jiaran',
      sounds: candidate.settings?.sounds ?? true,
      wallpaper:
        candidate.settings?.wallpaper &&
        WALLPAPERS.includes(
          candidate.settings.wallpaper as (typeof WALLPAPERS)[number],
        )
          ? candidate.settings.wallpaper
          : fresh.settings.wallpaper,
      wallpaperCatalogVersion: 3,
    },
  };
}
