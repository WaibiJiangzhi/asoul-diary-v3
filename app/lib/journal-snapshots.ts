import { dateKey, fromDateKey } from './date';
import { challengeDays, progressEventLabel, recordStates } from './challenge';
import { progressEventDate, progressValueOnDate } from './progress';
import type {
  Countdown,
  DailyTask,
  DiaryEntry,
  DiaryGrowthSnapshot,
  DiaryTaskSnapshot,
  GrowthMemory,
  ProgressGoal,
} from './types';

export type GrowthSnapshotSource = Countdown | ProgressGoal | GrowthMemory;

export function growthSourceId(item: GrowthSnapshotSource) {
  return item.kind === 'countdown' && 'sourceCountdownId' in item
    ? item.sourceCountdownId
    : item.kind === 'progress' && 'sourceGoalId' in item
      ? item.sourceGoalId
      : item.id;
}

export function taskSnapshot(task: DailyTask): DiaryTaskSnapshot {
  return {
    id: `snapshot-${task.id}`,
    sourceTaskId: task.id,
    emoji: task.emoji,
    title: task.title,
    done: task.done,
  };
}

export function growthSnapshot(
  item: GrowthSnapshotSource,
  date: string,
): DiaryGrowthSnapshot {
  const sourceId = growthSourceId(item);
  const common = {
    id: `growth-snapshot-${sourceId}`,
    sourceId,
    title: item.title,
    capturedAt: new Date().toISOString(),
  };
  if (item.kind === 'countdown') {
    const sameDayNotes = item.notes.filter(
      (note) => dateKey(new Date(note.createdAt)) === date,
    );
    return {
      ...common,
      kind: 'countdown',
      emoji: item.emoji,
      remainingDays: Math.ceil(
        (fromDateKey(item.targetDate).getTime() - fromDateKey(date).getTime()) /
          86_400_000,
      ),
      note: sameDayNotes.at(-1)?.text ?? '',
    };
  }
  const sameDayEvents = item.events.filter(
    (event) => progressEventDate(event) === date,
  );
  const dayOutcome = sameDayEvents.find((event) => event.outcome);
  const dayState = item.challenge
    ? recordStates(item).find((status) => status.id === dayOutcome?.outcome)
    : undefined;
  return {
    ...common,
    kind: 'progress',
    emoji: dayState?.emoji || item.emoji,
    delta: Number(
      sameDayEvents.reduce((sum, event) => sum + event.delta, 0).toFixed(4),
    ),
    current: item.challenge
      ? challengeDays(item).filter((event) => event.date! <= date).length
      : progressValueOnDate(item, date),
    total: item.total,
    unit: item.unit,
    challengeResult: item.challenge
      ? dayOutcome
        ? progressEventLabel(item, dayOutcome)
        : '未记录结果'
      : undefined,
    note: [...sameDayEvents].reverse().find((event) => event.note)?.note ?? '',
  };
}

/** Explicit picker confirmation refreshes selected copies, keeping unavailable sources. */
export function refreshDiarySnapshots(
  entry: Pick<DiaryEntry, 'date' | 'taskSnapshots' | 'growthSnapshots'>,
  tasks: DailyTask[],
  growth: GrowthSnapshotSource[],
) {
  return {
    taskSnapshots: entry.taskSnapshots.map((snapshot) => {
      const source = tasks.find(
        (task) => task.id === snapshot.sourceTaskId && task.date === entry.date,
      );
      return source ? { ...taskSnapshot(source), id: snapshot.id } : snapshot;
    }),
    growthSnapshots: entry.growthSnapshots.map((snapshot) => {
      const source = growth.find(
        (item) => growthSourceId(item) === snapshot.sourceId,
      );
      return source
        ? { ...growthSnapshot(source, entry.date), id: snapshot.id }
        : snapshot;
    }),
  };
}
