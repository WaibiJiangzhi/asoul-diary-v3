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

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
  }).format(fromDateKey(value));
}
