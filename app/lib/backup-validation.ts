import type { AppState, DiaryBackup } from './types';
import { isDateKey, recordEnd } from './life';
type Rule = (value: unknown) => boolean;
const text: Rule = (v) => typeof v === 'string';
const nonempty: Rule = (v) => text(v) && !!(v as string).trim();
const date: Rule = (v) => text(v) && isDateKey(v as string);
const num: Rule = (v) => typeof v === 'number' && Number.isFinite(v);
const positive: Rule = (v) => num(v) && (v as number) > 0;
const integer: Rule = (v) =>
  positive(v) && Number.isInteger(v) && (v as number) <= 36500;
const flag: Rule = (v) => typeof v === 'boolean';
const optional =
  (rule: Rule): Rule =>
  (v) =>
    v === undefined || rule(v);
const list =
  (rule: Rule): Rule =>
  (v) =>
    Array.isArray(v) && v.every(rule);
const oneOf =
  (...values: unknown[]): Rule =>
  (v) =>
    values.includes(v);
const shape =
  (fields: Record<string, Rule>): Rule =>
  (v) =>
    !!v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.entries(fields).every(([k, r]) =>
      r((v as Record<string, unknown>)[k]),
    );
const color = oneOf(
  '#E799B0',
  '#DB7D74',
  '#576690',
  '#D8946B',
  '#C89B4B',
  '#6F9A76',
  '#5B9292',
  '#8B78A8',
  '#84787E',
);
const record = shape({
  id: nonempty,
  date,
  body: text,
  photoIds: list(nonempty),
  createdAt: text,
  updatedAt: text,
  delta: optional(num),
  statusId: optional(nonempty),
  stageId: optional(nonempty),
  stageDone: optional(flag),
  stageEmoji: optional(text),
});
const card = shape({
  id: nonempty,
  kind: oneOf('record', 'progress', 'stage', 'blank'),
  title: nonempty,
  emoji: text,
  note: text,
  color,
  location: oneOf('active', 'later', 'memory'),
  startDate: date,
  createdAt: text,
  updatedAt: text,
  archivedAt: optional(text),
  ending: optional(oneOf('achieved', 'closed')),
  summary: optional(text),
  records: list(record),
  progress: optional(
    shape({
      initial: (v) => num(v) && (v as number) >= 0,
      total: optional(positive),
      unit: nonempty,
      step: positive,
      expectedDate: optional(date),
    }),
  ),
  record: optional(
    shape({
      states: list(shape({ id: nonempty, name: nonempty, emoji: text, color })),
      periodDays: optional(integer),
      targetStateId: optional(nonempty),
      targetDays: optional(integer),
    }),
  ),
  stages: optional(list(shape({ id: nonempty, title: nonempty }))),
});
const stateShape = shape({
  version: oneOf(1),
  cards: list(card),
  commonCards: optional(list(card)),
  companions: list(
    shape({
      id: nonempty,
      kind: oneOf('quote', 'countdown'),
      color: optional(color),
      title: nonempty,
      note: text,
      emoji: text,
      targetDate: optional(date),
    }),
  ),
  settings: shape({
    theme: oneOf('paper', 'wallpaper'),
    accent: oneOf('bella', 'jiaran', 'nailin'),
    wallpaper: text,
    haptics: flag,
    sounds: flag,
  }),
});
const unique = (ids: string[]) => new Set(ids).size === ids.length;
export function validateState(value: unknown): asserts value is AppState {
  if (!stateShape(value))
    throw new Error('数据格式不完整或版本不匹配，原有记录未替换');
  const state = value as AppState;
  if (
    !unique(state.cards.map((c) => c.id)) ||
    !unique(state.companions.map((c) => c.id)) ||
    !unique((state.commonCards ?? []).map((c) => c.id))
  )
    throw new Error('卡片编号重复，原有记录未替换');
  if (
    state.commonCards?.some((c) => c.records.length || c.location === 'memory')
  )
    throw new Error('常用卡片不能包含旧记录');
  for (const c of [...state.cards, ...(state.commonCards ?? [])]) {
    if (
      !unique(c.records.map((r) => r.id)) ||
      !unique((c.stages ?? []).map((s) => s.id)) ||
      !unique((c.record?.states ?? []).map((s) => s.id))
    )
      throw new Error('记录或状态编号重复');
    if (
      (c.kind === 'progress' && !c.progress) ||
      (c.kind === 'record' && !c.record) ||
      (c.kind === 'stage' && !c.stages?.length)
    )
      throw new Error('卡片配置缺失');
    if (
      c.records.some(
        (r) =>
          r.date < c.startDate ||
          r.photoIds.length > 9 ||
          (r.delta !== undefined && !c.progress) ||
          (r.stageId && typeof r.stageDone !== 'boolean') ||
          (r.stageEmoji && (!r.stageId || !r.stageDone)) ||
          (r.statusId && recordEnd(c) && r.date > recordEnd(c)!),
      )
    )
      throw new Error('记录日期或内容超出卡片配置');
    if (c.record && (!c.record.states.length || c.record.states.length > 6))
      throw new Error('状态数量无效');
    if (
      c.record?.targetDays &&
      (!c.record.targetStateId ||
        !c.record.states.some((s) => s.id === c.record!.targetStateId) ||
        (c.record.periodDays && c.record.targetDays > c.record.periodDays))
    )
      throw new Error('期待天数无效');
    const statusDates = c.records.filter((r) => r.statusId).map((r) => r.date);
    if (!unique(statusDates)) throw new Error('同一天有重复状态');
    if (
      c.records.some(
        (r) =>
          (r.statusId && !c.record?.states.some((s) => s.id === r.statusId)) ||
          (r.stageId && !c.stages?.some((s) => s.id === r.stageId)) ||
          !unique(r.photoIds),
      )
    )
      throw new Error('记录引用无效');
  }
  if (state.companions.some((c) => c.kind === 'countdown' && !c.targetDate))
    throw new Error('倒计时缺少日期');
}
export function validateBackup(value: unknown): asserts value is DiaryBackup {
  if (
    !shape({
      product: oneOf('asoul-life-v3'),
      exportedAt: text,
      photos: list(
        shape({ id: nonempty, dataUrl: nonempty, name: text, createdAt: text }),
      ),
    })(value)
  )
    throw new Error('请选择 V3.0 生活版的完整备份');
  validateState((value as DiaryBackup).state);
}
