import { dateKey, moveDate } from '@/lib/date';
import type { Mood, ProgressGoal } from '@/lib/types';

export type GrowthDraft = {
  id?: string;
  kind: 'progress' | 'countdown';
  emoji: string;
  title: string;
  targetDate: string;
  current: string;
  total: string;
  unit: string;
  step: string;
  note: string;
  color: ProgressGoal['color'];
};

export const MOOD_OPTIONS: {
  value: Exclude<Mood, ''>;
  emoji: string;
  label: string;
}[] = [
  { value: 'happy', emoji: '😄', label: '开心' },
  { value: 'good', emoji: '😌', label: '还不错' },
  { value: 'plain', emoji: '😐', label: '一般般' },
  { value: 'annoyed', emoji: '😣', label: '有点烦' },
  { value: 'sad', emoji: '🥹', label: '难受' },
];

const stickerNames = [
  '黯然离场',
  '邦邦两拳',
  '扶我下',
  '敬友谊',
  '就你是吧',
  '看我表现',
  '拿来吧你',
  '你干嘛',
  '你管我',
  '你说我在听',
  '你在干嘛',
  '捏捏',
  '起来 high',
  '求饶',
  '糖糖回家',
  '听不见',
  '哇哈哈哈',
  '有点秃然',
  '再说一遍',
  '走开走开',
] as const;

export const JIARAN_STICKERS = stickerNames.map((name, index) => ({
  name,
  src: `/stickers/jiaran-2026/jiaran-${String(index + 1).padStart(2, '0')}.gif`,
}));

export function createEmptyGrowthDraft(): GrowthDraft {
  return {
    kind: 'progress',
    emoji: '🌱',
    title: '',
    targetDate: moveDate(dateKey(), 30),
    current: '0',
    total: '30',
    unit: 'km',
    step: '1',
    note: '',
    color: '#E799B0',
  };
}

