import type { DiaryBackup } from './types';

// Backups are external JSON. Check their shape before normalization can fill
// missing collections or a replacing transaction can touch existing records.
type Rule = (value: unknown) => boolean;
const text: Rule = (value) => typeof value === 'string';
const number: Rule = (value) =>
  typeof value === 'number' && Number.isFinite(value);
const flag: Rule = (value) => typeof value === 'boolean';
const optional =
  (rule: Rule): Rule =>
  (value) =>
    value === undefined || rule(value);
const list =
  (rule: Rule): Rule =>
  (value) =>
    Array.isArray(value) && value.every(rule);
const shape =
  (fields: Record<string, Rule>): Rule =>
  (value) =>
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.entries(fields).every(([key, rule]) =>
      rule((value as Record<string, unknown>)[key]),
    );
const oneOf =
  (...values: unknown[]): Rule =>
  (value) =>
    values.includes(value);
const identity = { id: text, emoji: text, title: text };
const dates = { createdAt: text, updatedAt: text };
const notes = list(shape({ id: text, text, createdAt: text }));
const progress = {
  current: number,
  total: number,
  unit: text,
  events: list(
    shape({
      id: text,
      delta: number,
      valueAfter: number,
      createdAt: text,
      note: optional(text),
      date: optional(text),
      outcome: optional(text),
      rule: optional(text),
    }),
  ),
  expectedDate: optional(text),
  challenge: optional(
    shape({
      startDate: text,
      states: list(shape({ id: text, name: text, color: text, emoji: text })),
      targetStateId: optional(text),
      targetDays: optional(number),
      targetCelebrated: optional(flag),
    }),
  ),
};
const growthSnapshot: Rule = (value) =>
  shape({ ...identity, sourceId: text, note: text, capturedAt: text })(value) &&
  (shape({ kind: oneOf('countdown'), remainingDays: number })(value) ||
    shape({
      kind: oneOf('progress'),
      current: number,
      total: number,
      delta: number,
      unit: text,
      challengeResult: optional(text),
    })(value));
const memory: Rule = (value) =>
  shape({
    ...identity,
    note: text,
    color: text,
    startedAt: text,
    endedAt: text,
  })(value) &&
  (shape({
    kind: oneOf('countdown'),
    sourceCountdownId: text,
    targetDate: text,
    notes,
    endedEarly: flag,
  })(value) ||
    shape({
      kind: oneOf('progress'),
      sourceGoalId: text,
      ...progress,
      completedNaturally: flag,
    })(value));

const validBackup = shape({
  product: oneOf('asoul-diary-v3'),
  exportedAt: text,
  state: shape({
    version: oneOf(4),
    commonItems: list(shape({ ...identity, ...dates })),
    dailyTasks: list(
      shape({
        ...identity,
        ...dates,
        date: text,
        done: flag,
        sourceCommonId: optional(text),
      }),
    ),
    countdowns: list(
      shape({
        ...identity,
        ...dates,
        kind: oneOf('countdown'),
        targetDate: text,
        note: text,
        notes,
        color: text,
      }),
    ),
    progressGoals: list(
      shape({
        ...identity,
        ...dates,
        ...progress,
        kind: oneOf('progress'),
        step: number,
        note: text,
        color: text,
      }),
    ),
    memories: list(memory),
    diaries: list(
      shape({
        ...dates,
        date: text,
        body: text,
        mood: oneOf('', 'happy', 'good', 'plain', 'annoyed', 'sad'),
        photoIds: list(text),
        taskSnapshots: list(
          shape({ ...identity, sourceTaskId: text, done: flag }),
        ),
        growthSnapshots: list(growthSnapshot),
      }),
    ),
    dateMarkers: list(shape({ date: text, color: text })),
    settings: shape({
      theme: oneOf('paper', 'wallpaper'),
      accent: oneOf('bella', 'jiaran', 'nailin'),
      wallpaper: text,
      sounds: flag,
      haptics: flag,
      journalLines: optional(flag),
    }),
  }),
  photos: list(shape({ id: text, dataUrl: text, name: text, createdAt: text })),
});

export function validateBackup(value: unknown): asserts value is DiaryBackup {
  if (!validBackup(value))
    throw new Error('备份格式不完整或内容无效，原有记录未替换');
}
