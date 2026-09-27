import { createLifeCard } from './defaults';
import type { LifeCard } from './types';

type CardTemplate = Pick<
  LifeCard,
  | 'kind'
  | 'title'
  | 'emoji'
  | 'note'
  | 'color'
  | 'record'
  | 'progress'
  | 'stages'
> & {
  id: string;
  name: string;
  description: string;
};

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'sleep',
    name: '作息',
    description: '用一个表情记下每天的状态',
    kind: 'record',
    title: '把作息慢慢调回来',
    emoji: '[2026乃琳的酒馆动态表情包_赖床]',
    note: '好好睡觉，明天也会是喜欢的一天。',
    color: '#E799B0',
    record: {
      states: [
        { id: 'early', name: '早睡早起', emoji: '☀️', color: '#E799B0' },
        { id: 'late', name: '晚睡了', emoji: '🌙', color: '#8B78A8' },
        { id: 'rest', name: '好好休息', emoji: '😌', color: '#6F9A76' },
      ],
    },
  },
  {
    id: 'running',
    name: '跑步',
    description: '每次跑一点，慢慢积累里程',
    kind: 'progress',
    title: '慢慢跑到 100 公里',
    emoji: '🏃',
    note: '按自己的节奏，享受每一次出门。',
    color: '#DB7D74',
    progress: { initial: 0, total: 100, unit: 'km', step: 3 },
  },
  {
    id: 'travel',
    name: '准备旅行',
    description: '把一件期待的事分几步完成',
    kind: 'stage',
    title: '准备一次喜欢的旅行',
    emoji: '🧳',
    note: '给自己留一段看看世界的时间。',
    color: '#5B9292',
    stages: [
      { id: 'destination', title: '选好目的地' },
      { id: 'plan', title: '安排好行程' },
      { id: 'packing', title: '收拾好行李' },
      { id: 'leave', title: '出发去看看' },
    ],
  },
  {
    id: 'drawing',
    name: '画画',
    description: '自由放作品，写下每次的小进步',
    kind: 'blank',
    title: '画一点喜欢的东西',
    emoji: '🎨',
    note: '不急着画得很好，先享受动笔。',
    color: '#8B78A8',
  },
];

/** Reuse the setup, never the previous journey or its photo references. */
export function restartLifeCard(source: LifeCard): LifeCard {
  return {
    ...createLifeCard(source.kind),
    title: source.title,
    emoji: source.emoji,
    note: source.note,
    color: source.color,
    record: source.record ? structuredClone(source.record) : undefined,
    stages: source.stages ? structuredClone(source.stages) : undefined,
    progress: source.progress
      ? { ...source.progress, initial: 0, expectedDate: undefined }
      : undefined,
  };
}

export function createCardFromTemplate(id: string): LifeCard {
  const template = CARD_TEMPLATES.find((item) => item.id === id);
  if (!template) throw new Error('没有找到这个模板');
  return restartLifeCard({ ...createLifeCard(template.kind), ...template });
}

export function cardSetupLabel(card: LifeCard): string {
  if (card.kind === 'record')
    return card.record?.states.map((s) => s.name).join(' · ') ?? '';
  if (card.kind === 'stage')
    return card.stages?.map((s) => s.title).join(' → ') ?? '';
  if (card.kind === 'progress' && card.progress) {
    const { total, step, unit } = card.progress;
    return `${total ? `目标 ${total} ${unit}` : '长期积累'} · 每次默认 +${step} ${unit}`;
  }
  return '随时写文字、放照片，不必先设目标';
}
