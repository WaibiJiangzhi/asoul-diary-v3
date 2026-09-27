import { validateState } from './backup-validation';
import type { AppState, LifeCard } from './types';

export function saveCardDraft(state: AppState, draft: LifeCard): AppState {
  const before = state.cards.find((card) => card.id === draft.id);
  const card = {
    ...draft,
    title: draft.title.trim(),
    note: draft.note.trim(),
    records: before?.records ?? draft.records,
    updatedAt: new Date().toISOString(),
  };
  if (card.records.some((record) => record.date < card.startDate))
    throw new Error('开始日期需要包含已有记录');
  // A deadline is an expectation, not the end of the card's recording range.
  const next = {
    ...state,
    cards: before
      ? state.cards.map((item) => (item.id === card.id ? card : item))
      : [...state.cards, card],
  };
  validateState(next);
  return next;
}
