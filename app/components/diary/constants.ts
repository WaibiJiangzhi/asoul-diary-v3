import type { CardColor } from '@/lib/types';
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
