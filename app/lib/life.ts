import { dateKey, fromDateKey, moveDate } from './date';
import type { LifeCard, LifeRecord } from './types';
export function isDateKey(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(fromDateKey(value)) === value
  );
}
export function elapsedDays(start: string, end = dateKey()) {
  const utc = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.max(0, Math.round((utc(end) - utc(start)) / 86400000) + 1);
}
export function progressValue(card: LifeCard) {
  return Math.max(
    0,
    Number(
      (
        (card.progress?.initial ?? 0) +
        card.records.reduce((n, r) => n + (r.delta ?? 0), 0)
      ).toFixed(4),
    ),
  );
}
export function stageRecord(card: LifeCard, id: string) {
  let latest: LifeRecord | undefined;
  for (const record of card.records) {
    if (record.stageId !== id) continue;
    if (!latest || compareRecords(record, latest) >= 0) latest = record;
  }
  return latest;
}
function compareRecords(a: LifeRecord, b: LifeRecord) {
  return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
}
export function stageComplete(card: LifeCard, id: string) {
  return stageRecord(card, id)?.stageDone === true;
}
export function stageEmoji(card: LifeCard, id: string) {
  const record = stageRecord(card, id);
  return record?.stageDone ? (record.stageEmoji ?? '') : '';
}
export function statusRecord(card: LifeCard, date: string) {
  return card.records.find((r) => r.date === date && r.statusId);
}
export function recordEnd(card: LifeCard) {
  return card.record?.periodDays
    ? moveDate(card.startDate, card.record.periodDays - 1)
    : undefined;
}
export function canRecord(card: LifeCard, date: string, today = dateKey()) {
  return (
    card.location !== 'memory' &&
    isDateKey(date) &&
    date <= today &&
    date >= card.startDate
  );
}
export function completed(card: LifeCard) {
  if (card.kind === 'progress')
    return !!card.progress?.total && progressValue(card) >= card.progress.total;
  if (card.kind === 'stage')
    return (
      !!card.stages?.length &&
      card.stages.every((s) => stageComplete(card, s.id))
    );
  if (card.kind === 'record')
    return (
      !!card.record?.targetDays &&
      card.records.filter((r) => r.statusId === card.record?.targetStateId)
        .length >= card.record.targetDays
    );
  return false;
}
export function cycleFilled(card: LifeCard) {
  return (
    card.kind === 'record' &&
    !!card.record?.periodDays &&
    new Set(
      card.records
        .filter((r) => r.statusId && r.date <= recordEnd(card)!)
        .map((r) => r.date),
    ).size >= card.record.periodDays
  );
}
export function reachedMilestone(before: LifeCard, after: LifeCard) {
  return (
    (!completed(before) && completed(after)) ||
    (!cycleFilled(before) && cycleFilled(after))
  );
}
export function recentDays(today = dateKey()) {
  return Array.from({ length: 7 }, (_, i) => moveDate(today, i - 6));
}
export function lastRecord(card: LifeCard) {
  let latest: LifeRecord | undefined;
  for (const record of card.records)
    if (!latest || compareRecords(record, latest) > 0) latest = record;
  return latest;
}
export function recordLabel(card: LifeCard, record: LifeRecord) {
  if (record.statusId)
    return (
      card.record?.states.find((s) => s.id === record.statusId)?.name ??
      '已记录'
    );
  if (record.stageId)
    return (
      (record.stageDone ? '完成 · ' : '重新打开 · ') +
      (card.stages?.find((s) => s.id === record.stageId)?.title ?? '子目标')
    );
  if (record.delta !== undefined && record.delta !== 0)
    return (
      (record.delta > 0 ? '+' : '') +
      record.delta +
      ' ' +
      (card.progress?.unit ?? '')
    );
  return '留下一点记录';
}
export function saveLifeRecord(
  card: LifeCard,
  input: LifeRecord,
  today = dateKey(),
): LifeCard {
  const editingMemory =
    card.location === 'memory' &&
    card.records.some((r) => r.id === input.id && r.date === input.date);
  if (!canRecord(card, input.date, today) && !editingMemory)
    throw new Error('请选择今天及以前、卡片记录范围内的日期');
  if (
    input.photoIds.length > 9 ||
    new Set(input.photoIds).size !== input.photoIds.length
  )
    throw new Error('每条记录最多放 9 张不同的照片');
  if (
    input.delta !== undefined &&
    (!Number.isFinite(input.delta) || !card.progress)
  )
    throw new Error('请填写有效的调整数量');
  if (
    input.statusId &&
    !card.record?.states.some((s) => s.id === input.statusId)
  )
    throw new Error('这个状态已被移除，请重新选择');
  if (input.stageId && !card.stages?.some((s) => s.id === input.stageId))
    throw new Error('这个子目标已被移除');
  let records = card.records.filter((r) => r.id !== input.id);
  if (input.statusId)
    records = records.flatMap((r) =>
      r.date === input.date && r.statusId
        ? r.body || r.photoIds.length || r.delta || r.stageId
          ? [{ ...r, statusId: undefined }]
          : []
        : [r],
    );
  const delta =
    input.delta === undefined
      ? undefined
      : Number(
          Math.max(-progressValue({ ...card, records }), input.delta).toFixed(
            4,
          ),
        );
  const record = {
    ...input,
    delta,
    body: input.body.trim(),
    stageEmoji: input.stageId && input.stageDone ? input.stageEmoji : undefined,
  };
  if (
    record.body ||
    record.photoIds.length ||
    record.statusId ||
    record.stageId ||
    record.delta
  )
    records.push(record);
  return { ...card, records, updatedAt: input.updatedAt };
}
export function allPhotoIds(state: { cards: LifeCard[] }) {
  return state.cards.flatMap((c) => c.records.flatMap((r) => r.photoIds));
}

export function cardDeadline(card: LifeCard) {
  if (card.kind === 'record') return recordEnd(card);
  if (card.kind === 'progress') return card.progress?.expectedDate;
  return card.expectedDate;
}
export function deadlineDistance(date: string, today = dateKey()) {
  return Math.round(
    (Date.parse(date + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z')) /
      86400000,
  );
}
export function priorityCompanions<
  T extends { kind: string; targetDate?: string },
>(cards: T[], today = dateKey()) {
  const due = cards.filter(
    (c) =>
      c.kind === 'countdown' &&
      c.targetDate &&
      deadlineDistance(c.targetDate, today) === 0,
  );
  const tomorrow = cards.filter(
    (c) =>
      c.kind === 'countdown' &&
      c.targetDate &&
      deadlineDistance(c.targetDate, today) === 1,
  );
  return due.length ? due : tomorrow.length ? tomorrow : cards;
}
