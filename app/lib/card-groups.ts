import { createId } from './defaults';
import type { AppState, LifeCard } from './types';
export function inGroup(card: LifeCard, group: string) {
  return (
    group === 'all' ||
    (group === 'ungrouped' ? !card.groupId : card.groupId === group)
  );
}
export function saveGroup(
  state: AppState,
  name: string,
  id?: string,
): AppState {
  name = name.trim();
  const groups = state.groups ?? [];
  if (!name || name.length > 30) throw new Error('请填写 1–30 字的分组名称');
  if (groups.some((g) => g.id !== id && g.name === name))
    throw new Error('已经有同名分组了');
  if (id && !groups.some((g) => g.id === id))
    throw new Error('这个分组已不存在');
  return {
    ...state,
    groups: id
      ? groups.map((g) => (g.id === id ? { ...g, name } : g))
      : [...groups, { id: createId('group'), name }],
  };
}
export function removeGroup(state: AppState, id: string): AppState {
  const clear = (c: LifeCard) =>
    c.groupId === id ? { ...c, groupId: undefined } : c;
  return {
    ...state,
    groups: state.groups?.filter((g) => g.id !== id),
    cards: state.cards.map(clear),
    commonCards: state.commonCards?.map(clear),
  };
}
export function reorderGroups(state: AppState, a: string, b: string): AppState {
  const groups = [...(state.groups ?? [])];
  const from = groups.findIndex((g) => g.id === a);
  const to = groups.findIndex((g) => g.id === b);
  if (from < 0 || to < 0) return state;
  groups.splice(to, 0, groups.splice(from, 1)[0]);
  return { ...state, groups };
}
