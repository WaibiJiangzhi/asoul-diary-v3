const pad = (value: number) => String(value).padStart(2, '0');

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function moveDate(value: string, days: number) {
  const date = fromDateKey(value);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function formatFullDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(fromDateKey(value));
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
  }).format(fromDateKey(value));
}

export function daysUntil(value: string) {
  const target = fromDateKey(value).getTime();
  const today = fromDateKey(dateKey()).getTime();
  return Math.ceil((target - today) / 86_400_000);
}

export function formatMoment(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
