import { dateKey, moveDate } from './date';
import type { AppState, DailyTask, DiaryEntry } from './types';

/** Daily checklists are intentionally short-lived; diary snapshots are permanent. */
export function keepNearbyDailyTasks(
  tasks: DailyTask[],
  today = dateKey(),
): DailyTask[] {
  const keptDates = new Set([moveDate(today, -1), today, moveDate(today, 1)]);
  return tasks.filter((task) => keptDates.has(task.date));
}

export function prepareLoadedState(
  state: AppState,
  today = dateKey(),
): AppState {
  const dailyTasks = keepNearbyDailyTasks(state.dailyTasks, today);
  return dailyTasks.length === state.dailyTasks.length
    ? state
    : { ...state, dailyTasks };
}

export function hasDiaryContent(entry: DiaryEntry) {
  return Boolean(
    entry.body.trim() ||
    entry.mood ||
    entry.photoIds.length ||
    entry.taskSnapshots.length ||
    entry.growthSnapshots.length,
  );
}
