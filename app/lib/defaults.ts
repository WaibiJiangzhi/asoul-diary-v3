import type { AccentTheme, AppState, CardColor } from './types';
import { dateKey, moveDate } from './date';
import type { CardKind, LifeCard } from './types';

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
  return {
    version: 1,
    cards: [],
    companions: [
      {
        id: 'companion-welcome',
        kind: 'quote',
        title: '你的梦想是什么？',
        note: '把喜欢的事，一点点变成自己的生活。',
        emoji: '[2026嘉然的画册动态表情包_捏捏]',
        color: '#E799B0',
      },
      {
        id: 'companion-today',
        kind: 'quote',
        title: '今天也往前走一点',
        note: '慢一点也没关系，留下自己的脚印。',
        emoji: '[2026贝拉的冒险动态表情包_恰！]',
        color: '#DB7D74',
      },
    ],
    settings: {
      theme: 'wallpaper',
      accent: 'jiaran',
      wallpaper: WALLPAPERS[0],
      haptics: true,
      sounds: true,
    },
  };
}
export function normalizeState(candidate: AppState): AppState {
  const fresh = createDefaultState();
  return {
    ...candidate,
    settings: {
      ...fresh.settings,
      ...candidate.settings,
      wallpaper: WALLPAPERS.includes(
        candidate.settings.wallpaper as (typeof WALLPAPERS)[number],
      )
        ? candidate.settings.wallpaper
        : fresh.settings.wallpaper,
    },
  };
}
export function createLifeCard(kind: CardKind = 'blank'): LifeCard {
  const now = new Date().toISOString();
  return {
    id: createId('card'),
    kind,
    title: '',
    emoji: '🌱',
    note: '',
    color: '#E799B0',
    location: 'active',
    startDate: dateKey(),
    createdAt: now,
    updatedAt: now,
    records: [],
    ...(kind === 'progress'
      ? { progress: { initial: 0, unit: '次', step: 1 } }
      : {}),
    ...(kind === 'record'
      ? {
          record: {
            states: [
              { id: 'done', name: '做到了', emoji: '😊', color: '#E799B0' },
              { id: 'rest', name: '休息一下', emoji: '🌙', color: '#8B78A8' },
            ],
          },
        }
      : {}),
    ...(kind === 'stage'
      ? { stages: [{ id: createId('stage'), title: '迈出第一步' }] }
      : {}),
  };
}
export function createDemoState(): AppState {
  const state = createDefaultState();
  const today = dateKey();
  const now = new Date().toISOString();
  const record = (offset: number, body: string, extras: object = {}) => ({
    id: createId('record'),
    date: moveDate(today, offset),
    body,
    photoIds: [],
    createdAt: now,
    updatedAt: now,
    ...extras,
  });
  const sleep = {
    ...createLifeCard('record'),
    title: '把作息慢慢调回来',
    emoji: '[2026乃琳的酒馆动态表情包_赖床]',
    note: '好好睡觉，明天也会是喜欢的一天。',
    startDate: moveDate(today, -13),
  };
  sleep.record = {
    states: [
      {
        id: 'early',
        name: '早睡早起',
        emoji: '[2026乃琳的酒馆动态表情包_爱你]',
        color: '#E799B0',
      },
      { id: 'late', name: '晚睡了', emoji: '🌙', color: '#8B78A8' },
      { id: 'rest', name: '好好休息', emoji: '😌', color: '#6F9A76' },
    ],
    periodDays: 30,
    targetStateId: 'early',
    targetDays: 20,
  };
  sleep.records = Array.from({ length: 13 }, (_, i) =>
    record(
      i - 13,
      [
        '睡前把手机放远了一点，早上醒来没有那么累。',
        '昨晚看直播晚了些，今天慢慢调整。',
        '给自己做了早餐。 [2026乃琳的酒馆动态表情包_厨艺展示]',
        '今天给自己留了一点余地。',
      ][i % 4],
      {
        statusId: i % 4 === 0 ? 'late' : i % 5 === 0 ? 'rest' : 'early',
      },
    ),
  );
  const run = {
    ...createLifeCard('progress'),
    title: '秋天慢慢跑 100 km',
    emoji: '🏃',
    note: '一点点跑回喜欢的自己。',
    color: '#DB7D74' as CardColor,
    startDate: moveDate(today, -25),
    progress: {
      initial: 0,
      total: 100,
      unit: 'km',
      step: 3,
      expectedDate: moveDate(today, 20),
    },
  };
  run.records = Array.from({ length: 15 }, (_, i) =>
    record(
      i - 20,
      [
        '前两公里有点喘，后面找到了舒服的节奏。',
        '跑完买了一瓶水，绕着河边走了一会儿。',
        '今天不追速度，能出门就很好。',
        '河边的风很舒服。[2026乃琳的酒馆动态表情包_爱你]',
      ][i % 4],
      { delta: 5 },
    ),
  );
  run.records.push(record(-1, '最后一段慢慢走回来了。', { delta: 2.5 }));
  const trip = {
    ...createLifeCard('stage'),
    title: '准备一次喜欢的旅行',
    emoji: '🧳',
    note: '给自己留一段看看世界的时间。',
    color: '#8B78A8' as CardColor,
    startDate: moveDate(today, -19),
    stages: [
      '选好目的地',
      '留出预算',
      '安排好行程',
      '订好住宿',
      '收拾好行李',
      '出发去看看',
    ].map((title, i) => ({ id: 'step-' + i, title })),
  };
  trip.records = [
    record(-15, '想去海边看看日出。', {
      stageId: 'step-0',
      stageDone: true,
      stageEmoji: '[2026嘉然的画册动态表情包_捏捏]',
    }),
    record(-10, '留够路费和住宿费，再给好吃的留一点预算。', {
      stageId: 'step-1',
      stageDone: true,
      stageEmoji: '✨',
    }),
    record(-3, '路线和住宿都安排好了，留一点时间随便逛逛。', {
      stageId: 'step-2',
      stageDone: true,
      stageEmoji: '[2026贝拉的冒险动态表情包_恰！]',
    }),
  ];
  const drawing = {
    ...createLifeCard(),
    title: '想把脑海里的画面画出来',
    emoji: '🎨',
    note: '先画喜欢的东西，不着急找到终点。',
    startDate: moveDate(today, -7),
    records: [
      record(-7, '先从桌上的杯子开始，线条歪歪的也没关系。'),
      record(
        -4,
        '试了暖色阴影，发现自己很喜欢这个配色。\n下次想画一张小小的明信片。',
      ),
      record(
        -2,
        '画了第一张人物速写，眼睛比上次自然一点。 [2026嘉然的画册动态表情包_捏捏]',
      ),
    ],
  };
  const travel = {
    ...createLifeCard(),
    title: '去看一次团线下',
    emoji: '[2026乃琳的酒馆动态表情包_蹦蹦跳跳]',
    note: '把屏幕里的喜欢变成真实的回忆。',
    location: 'later' as const,
  };
  const memory = {
    ...createLifeCard('progress'),
    title: '读完一本喜欢的书',
    emoji: '📚',
    note: '每天读一点，真的读完了。',
    location: 'memory' as const,
    startDate: moveDate(today, -50),
    archivedAt: new Date(moveDate(today, -8) + 'T12:00:00').toISOString(),
    ending: 'achieved' as const,
    summary: '原来每天留一点时间，就能看完一个很长的故事。',
    progress: { initial: 0, total: 300, unit: '页', step: 10 },
    records: Array.from({ length: 10 }, (_, i) =>
      record(
        -44 + i * 4,
        i === 9
          ? '合上书的时候，有一点舍不得。'
          : [
              '睡前读了两章，记下了一句喜欢的话。',
              '在咖啡店读了一会儿，故事开始有趣起来。',
            ][i % 2],
        { delta: 30 },
      ),
    ),
  };
  const paused: LifeCard = {
    ...createLifeCard('blank'),
    title: '试着做一周手帐',
    emoji: '📝',
    note: '试过之后，才知道自己喜欢什么。',
    color: '#6F9A76',
    location: 'memory',
    startDate: moveDate(today, -80),
    archivedAt: new Date(moveDate(today, -73) + 'T12:00:00').toISOString(),
    ending: 'closed',
    summary: '没有每天坚持排版，但发现随手写两句更适合我。换一种方式继续记录。',
    records: [
      record(-80, '贴了一张小贴纸，写下今天的天气。'),
      record(-77, '排版有点花时间，今天只想写一句：晚饭很好吃。'),
      record(-73, '不勉强自己做满一整本，这一周也值得留下。'),
    ],
  };
  state.cards = [sleep, run, trip, drawing, travel, memory, paused];
  for (const card of state.cards) {
    card.createdAt = new Date(card.startDate + 'T12:00:00').toISOString();
    for (const entry of card.records) {
      entry.createdAt = new Date(entry.date + 'T20:00:00').toISOString();
      entry.updatedAt = entry.createdAt;
    }
    card.updatedAt =
      card.archivedAt ?? card.records.at(-1)?.updatedAt ?? card.createdAt;
  }
  state.companions.push({
    id: 'demo-countdown',
    color: '#6F9A76',
    kind: 'countdown',
    title: '和喜欢的人去看山',
    note: '把期待留给那个晴天。',
    emoji: '⛰️',
    targetDate: moveDate(today, 12),
  });
  state.settings.theme = 'wallpaper';
  return state;
}
