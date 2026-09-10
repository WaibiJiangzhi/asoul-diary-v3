import { dateKey } from './date';
import { canRecordChallenge, challengeEnd, isDateKey } from './challenge';
import type { ProgressEvent, ProgressGoal } from './types';

/** Older footprints have only a timestamp; keep their original local day. */
export function progressEventDate(event: ProgressEvent) {
  return event.date && isDateKey(event.date)
    ? event.date
    : dateKey(new Date(event.createdAt));
}

/** Backfilled entries use their recorded day, not the order they were entered. */
export function progressValueOnDate(
  source: Pick<ProgressGoal, 'current' | 'events'>,
  date: string,
) {
  const laterDelta = source.events
    .filter((event) => progressEventDate(event) > date)
    .reduce((sum, event) => sum + event.delta, 0);
  return Math.max(0, Number((source.current - laterDelta).toFixed(4)));
}

export function progressRecordDate(
  goal: ProgressGoal,
  selected = '',
  today = dateKey(),
) {
  if (!goal.challenge)
    return isDateKey(selected) && selected <= today ? selected : today;
  const start = goal.challenge.startDate;
  const end = challengeEnd(goal);
  const latest = today < end ? today : end;
  return selected && selected >= start && selected <= latest
    ? selected
    : today < start
      ? start
      : latest;
}

export function adjustProgressEntry(
  goal: ProgressGoal,
  requestedDelta: number,
  note: string,
  date: string,
  id: string,
  now: string,
  today = dateKey(),
): ProgressGoal {
  if (
    !Number.isFinite(requestedDelta) ||
    !isDateKey(date) ||
    date > today ||
    (goal.challenge &&
      (requestedDelta !== 0 || !canRecordChallenge(goal, date, today)))
  )
    return goal;
  const current = Math.max(
    0,
    Number((goal.current + requestedDelta).toFixed(4)),
  );
  const delta = Number((current - goal.current).toFixed(4));
  if (!delta && !note.trim()) return goal;
  return {
    ...goal,
    current,
    updatedAt: now,
    events: [
      ...goal.events,
      {
        id,
        delta,
        valueAfter: current,
        note: note.trim().slice(0, 100),
        date,
        createdAt: now,
      },
    ],
  };
}
