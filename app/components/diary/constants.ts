import { dateKey, moveDate } from '@/lib/date';
import type { CardColor, Mood, ProgressGoal, RecordStatus } from '@/lib/types';
import { DEFAULT_RECORD_STATES } from '@/lib/challenge';

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
  mode: 'counter' | 'challenge';
  expectedDateEnabled: boolean;
  expectedDate: string;
  startDate: string;
  states: RecordStatus[];
  targetStateId: string;
  targetEnabled: boolean;
  targetDays: string;
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

export const DAILY_EMOJIS = [
  '🌱',
  '✨',
  '⭐',
  '☀️',
  '🌙',
  '🍀',
  '🫧',
  '🌸',
  '📖',
  '🎧',
  '☕',
  '🏃',
  '🎹',
] as const;

export function pickDailyEmoji() {
  return DAILY_EMOJIS[Math.floor(Math.random() * DAILY_EMOJIS.length)];
}

export const CARD_COLORS: { value: CardColor; label: string }[] = [
  { value: '#E799B0', label: '嘉然柔粉' },
  { value: '#DB7D74', label: '贝拉珊瑚红' },
  { value: '#576690', label: '乃琳夜蓝' },
  { value: '#D8946B', label: '杏桃' },
  { value: '#C89B4B', label: '暖金' },
  { value: '#6F9A76', label: '鼠尾草绿' },
  { value: '#5B9292', label: '静谧青' },
  { value: '#8B78A8', label: '暮光紫' },
  { value: '#84787E', label: '暖灰' },
];

export function createEmptyGrowthDraft(): GrowthDraft {
  return {
    kind: 'progress',
    emoji: pickDailyEmoji(),
    title: '',
    targetDate: moveDate(dateKey(), 30),
    current: '0',
    total: '30',
    unit: 'km',
    step: '1',
    note: '',
    color: '#E799B0',
    mode: 'counter',
    expectedDateEnabled: false,
    expectedDate: moveDate(dateKey(), 30),
    startDate: dateKey(),
    states: DEFAULT_RECORD_STATES.map((state) => ({ ...state })),
    targetStateId: 'done',
    targetEnabled: false,
    targetDays: '20',
  };
}
