import { inGroup } from './card-groups';
import { dateKey } from './date';
import type { LifeCard } from './types';

export function memoryCollection(
  cards: LifeCard[],
  {
    group = 'all',
    query = '',
    filter = 'all',
    month = 'all',
    order = 'newest',
  } = {},
) {
  const archivedAt = (card: LifeCard) => card.archivedAt ?? card.updatedAt;
  const archiveMonth = (card: LifeCard) =>
    dateKey(new Date(archivedAt(card))).slice(0, 7);
  const memories = cards
    .filter((card) => card.location === 'memory')
    .sort((a, b) => {
      const delta = Date.parse(archivedAt(a)) - Date.parse(archivedAt(b));
      return order === 'oldest' ? delta : -delta;
    });
  const months = [...new Set(memories.map(archiveMonth))].sort().reverse();
  const selectedMonth = months.includes(month) ? month : 'all';
  const keyword = query.trim().toLocaleLowerCase();
  const shown = memories.filter(
    (card) =>
      inGroup(card, group) &&
      (filter === 'all' || card.ending === filter) &&
      (selectedMonth === 'all' || archiveMonth(card) === selectedMonth) &&
      `${card.title} ${card.note} ${card.summary ?? ''}`
        .toLocaleLowerCase()
        .includes(keyword),
  );
  return { memories, months, selectedMonth, shown };
}
