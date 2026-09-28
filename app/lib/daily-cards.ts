import { canRecord } from './life';
import { inGroup } from './card-groups';
import type { LifeCard } from './types';

export function isDailyCard(card: LifeCard) {
  return card.daily ?? card.kind === 'record';
}

export function hasRecordToday(card: LifeCard, today: string) {
  return card.records.some((record) => record.date === today);
}

export function dailyCards(cards: LifeCard[], today: string, group = 'all') {
  return cards
    .filter(
      (card) =>
        card.location === 'active' &&
        isDailyCard(card) &&
        canRecord(card, today, today) &&
        inGroup(card, group),
    )
    .sort(
      (a, b) =>
        Number(hasRecordToday(a, today)) - Number(hasRecordToday(b, today)),
    );
}
