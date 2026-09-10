import { dateKey, fromDateKey, moveDate } from './date';
import type {
  ChallengeConfig,
  ProgressEvent,
  ProgressGoal,
  ProgressMemory,
  RecordStatus,
} from './types';

export type ChallengeOutcome = NonNullable<ProgressEvent['outcome']>;
export const DEFAULT_RECORD_STATES: RecordStatus[] = [
  { id: 'done', name: '做到了', color: '#E799B0', emoji: '' },
  { id: 'missed', name: '没完全做到', color: '#8B78A8', emoji: '' },
];
export function recordStates(source: Pick<ProgressGoal, 'challenge'>) {
  return source.challenge?.states?.length
    ? source.challenge.states
    : DEFAULT_RECORD_STATES;
}

type ChallengeSource = Pick<ProgressGoal, 'challenge' | 'events' | 'total'>;

export function isDateKey(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(fromDateKey(value)) === value
  );
}

export function challengeEnd(source: ChallengeSource) {
  return moveDate(source.challenge!.startDate, source.total - 1);
}

export function challengeDays(source: ChallengeSource) {
  const byDate = new Map<string, ProgressEvent>();
  if (!source.challenge) return [];
  const end = challengeEnd(source);
  for (const event of source.events) {
    if (
      event.date &&
      isDateKey(event.date) &&
      event.date >= source.challenge.startDate &&
      event.date <= end &&
      recordStates(source).some((state) => state.id === event.outcome)
    )
      byDate.set(event.date, event);
  }
  return [...byDate.values()].sort((a, b) => a.date!.localeCompare(b.date!));
}

export function challengeStats(source: ChallengeSource) {
  const days = challengeDays(source);
  const counts = Object.fromEntries(
    recordStates(source).map((state) => [
      state.id,
      days.filter((event) => event.outcome === state.id).length,
    ]),
  );
  return {
    recorded: days.length,
    counts,
    targetCount: counts[source.challenge?.targetStateId ?? ''] ?? 0,
    remaining: Math.max(0, source.total - days.length),
  };
}

/** Completion is a fact about current records, not a permanent celebration flag. */
export function challengeComplete(source: ChallengeSource) {
  if (!source.challenge) return false;
  const stats = challengeStats(source);
  const target = source.challenge.targetDays;
  return target && source.challenge.targetStateId
    ? stats.targetCount >= target
    : stats.recorded >= source.total;
}

/** Filling every date and reaching the optional expectation are separate milestones. */
export function challengeMilestone(
  previous: ChallengeSource,
  next: ChallengeSource,
) {
  if (
    next.challenge?.targetDays &&
    next.challenge.targetStateId &&
    !challengeComplete(previous) &&
    challengeComplete(next)
  )
    return 'target';
  if (
    challengeStats(previous).recorded < previous.total &&
    challengeStats(next).recorded === next.total
  )
    return 'recorded';
  return null;
}

export function challengeSegments(
  source: ChallengeSource,
  view: 'date' | 'overview',
  today = dateKey(),
) {
  const states = recordStates(source);
  const stats = challengeStats(source);
  const byDate = new Map(
    challengeDays(source).map((event) => [event.date!, event.outcome!]),
  );
  if (view === 'date') {
    const segments: { stateId: string; days: number }[] = [];
    for (let index = 0; index < source.total; index++) {
      const date = moveDate(source.challenge!.startDate, index);
      const stateId =
        byDate.get(date) ?? (date > today ? 'future' : 'unrecorded');
      const last = segments.at(-1);
      if (last?.stateId === stateId) last.days++;
      else segments.push({ stateId, days: 1 });
    }
    return segments;
  }
  const ordered = [...states].sort(
    (a, b) =>
      Number(b.id === source.challenge?.targetStateId) -
      Number(a.id === source.challenge?.targetStateId),
  );
  const future = Array.from({ length: source.total }, (_, index) =>
    moveDate(source.challenge!.startDate, index),
  ).filter((date) => date > today && !byDate.has(date)).length;
  return [
    ...ordered.map((state) => ({
      stateId: state.id,
      days: stats.counts[state.id],
    })),
    { stateId: 'unrecorded', days: source.total - stats.recorded - future },
    { stateId: 'future', days: future },
  ].filter((segment) => segment.days > 0);
}

export function canRecordChallenge(
  source: ChallengeSource,
  date: string,
  today = dateKey(),
) {
  return (
    !!source.challenge &&
    isDateKey(date) &&
    date >= source.challenge.startDate &&
    date <= challengeEnd(source) &&
    date <= today
  );
}

export function recordChallengeDay(
  goal: ProgressGoal,
  date: string,
  outcome: ChallengeOutcome,
  note: string,
  id: string,
  now: string,
  today = dateKey(),
): ProgressGoal {
  if (
    !canRecordChallenge(goal, date, today) ||
    !recordStates(goal).some((state) => state.id === outcome)
  )
    return goal;
  const previous = goal.events.find(
    (event) => event.date === date && event.outcome,
  );
  const event: ProgressEvent = {
    id: previous?.id ?? id,
    date,
    outcome,
    delta: 1,
    valueAfter: 0,
    note: note.trim().slice(0, 100),
    rule: previous?.rule ?? goal.note,
    createdAt: now,
  };
  const next = rebuildChallenge({
    ...goal,
    updatedAt: now,
    events: [
      ...goal.events.filter((entry) => !(entry.date === date && entry.outcome)),
      event,
    ],
  });
  return next;
}

/** Clearing a day's state keeps its words as an independent footstep. */
export function clearChallengeDay(
  goal: ProgressGoal,
  date: string,
  now: string,
  today = dateKey(),
): ProgressGoal {
  if (!canRecordChallenge(goal, date, today)) return goal;
  if (!goal.events.some((event) => event.date === date && event.outcome))
    return goal;
  return rebuildChallenge({
    ...goal,
    updatedAt: now,
    events: goal.events.flatMap((event) => {
      if (event.date !== date || !event.outcome) return [event];
      return event.note?.trim()
        ? [{ ...event, outcome: undefined, delta: 0, createdAt: now }]
        : [];
    }),
  });
}

/** Recompute from daily facts, including after edits, deletes and backup import. */
export function rebuildChallenge<T extends ProgressGoal | ProgressMemory>(
  source: T,
): T {
  if (!source.challenge) return source;
  const days = challengeDays(source);
  const ranks = new Map(days.map((event, index) => [event.id, index + 1]));
  return {
    ...source,
    current: days.length,
    challenge: {
      ...source.challenge,
      targetCelebrated: challengeComplete(source),
    },
    events: source.events
      .filter((event) => !event.outcome || ranks.has(event.id))
      .map((event) =>
        event.outcome
          ? { ...event, delta: 1, valueAfter: ranks.get(event.id)! }
          : {
              ...event,
              delta: 0,
              valueAfter: days.filter(
                (day) =>
                  day.date! <=
                  (event.date ?? dateKey(new Date(event.createdAt))),
              ).length,
            },
      ),
  };
}

export function normalizeChallenge<T extends ProgressGoal | ProgressMemory>(
  source: T,
): T {
  if (!source.challenge) return source;
  const config = source.challenge;
  const total = Math.min(
    3650,
    Math.max(1, Math.trunc(Number(source.total) || 30)),
  );
  const challenge: ChallengeConfig = {
    startDate: isDateKey(config.startDate ?? '')
      ? config.startDate
      : dateKey(
          new Date('createdAt' in source ? source.createdAt : source.startedAt),
        ),
    states: recordStates(source)
      .slice(0, 4)
      .map((state, index) => ({
        id: state.id || `state-${index}`,
        name: state.name.trim().slice(0, 12) || `状态 ${index + 1}`,
        emoji: state.emoji ?? '',
        color: state.color,
      })),
    targetStateId: recordStates(source).some(
      (state) => state.id === config.targetStateId,
    )
      ? config.targetStateId
      : undefined,
    targetCelebrated: config.targetCelebrated ?? false,
    targetDays:
      Number.isInteger(config.targetDays) &&
      config.targetDays! > 0 &&
      config.targetDays! <= total
        ? config.targetDays
        : undefined,
  };
  return rebuildChallenge({
    ...source,
    challenge,
    total,
    unit: '天',
    events: source.events ?? [],
  });
}

export function progressEventLabel(
  source: Pick<ProgressGoal, 'challenge' | 'unit'>,
  event: ProgressEvent,
) {
  if (source.challenge && event.outcome)
    return (
      recordStates(source).find((state) => state.id === event.outcome)?.name ??
      '未设置状态'
    );
  return event.delta === 0
    ? '文字足迹'
    : `${event.delta > 0 ? '+' : ''}${event.delta} ${source.unit}`;
}
