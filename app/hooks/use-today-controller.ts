import { useState } from 'react';
import type { Dispatch, SetStateAction, SyntheticEvent } from 'react';

import type { Confirmation } from '@/components/diary/confirm-dialog';
import { pickDailyEmoji } from '@/components/diary/constants';
import { createId } from '@/lib/defaults';
import { dateKey, moveDate } from '@/lib/date';
import type { AppState, CommonItem, DailyTask } from '@/lib/types';
import type { ShowToast } from '@/hooks/use-toast';

interface TodayControllerOptions {
  state: AppState | null;
  selectedDate: string;
  setState: Dispatch<SetStateAction<AppState | null>>;
  showToast: ShowToast;
  haptic: () => void;
  softChime: (kind: 'check' | 'progress' | 'celebrate') => void;
  askConfirmation: (confirmation: Confirmation) => void;
}

export function useTodayController({
  state,
  selectedDate,
  setState,
  showToast,
  haptic,
  softChime,
  askConfirmation,
}: TodayControllerOptions) {
  const [todayDrawerOpen, setTodayDrawerOpen] = useState(false);
  const [todayDrawerMode, setTodayDrawerMode] = useState<'add' | 'manage'>(
    'add',
  );
  const [taskEditing, setTaskEditing] = useState<DailyTask | null>(null);

  function addTodayTasks(
    items: { emoji: string; title: string; sourceId?: string }[],
  ) {
    const cleanedItems = items
      .map((item) => ({ ...item, title: item.title.trim() }))
      .filter((item) => item.title);
    if (!cleanedItems.length) return;
    const now = new Date().toISOString();
    const tasks: DailyTask[] = cleanedItems.map((item) => ({
      id: createId('task'),
      date: selectedDate,
      emoji: item.emoji.trim() || pickDailyEmoji(),
      title: item.title,
      done: false,
      sourceCommonId: item.sourceId,
      createdAt: now,
      updatedAt: now,
    }));
    setState(
      (current) =>
        current && {
          ...current,
          dailyTasks: [...current.dailyTasks, ...tasks],
        },
    );
    haptic();
    const dayLabel =
      selectedDate === moveDate(dateKey(), -1)
        ? '昨天'
        : selectedDate === dateKey()
          ? '今天'
          : '明天';
    showToast(`${tasks.length} 件小事已放进${dayLabel}`);
  }

  function toggleTodayTask(id: string, done: boolean) {
    const task = state?.dailyTasks.find((item) => item.id === id);
    if (!task || task.done === done) return;
    const completesDay =
      done &&
      state!.dailyTasks
        .filter((item) => item.date === task.date)
        .every((item) => item.id === id || item.done);
    setState(
      (current) =>
        current && {
          ...current,
          dailyTasks: current.dailyTasks.map((task) =>
            task.id === id
              ? { ...task, done, updatedAt: new Date().toISOString() }
              : task,
          ),
        },
    );
    haptic();
    if (done) {
      softChime(completesDay ? 'celebrate' : 'check');
      showToast('完成了，已经替你收好 ✓', () => {
        setState(
          (current) =>
            current && {
              ...current,
              dailyTasks: current.dailyTasks.map((task) =>
                task.id === id
                  ? {
                      ...task,
                      done: false,
                      updatedAt: new Date().toISOString(),
                    }
                  : task,
              ),
            },
        );
      });
    }
  }

  function reorderTodayTasks(draggedId: string, targetId: string) {
    setState((current) => {
      if (!current) return current;
      const selected = current.dailyTasks.filter(
        (task) => task.date === selectedDate && !task.done,
      );
      const from = selected.findIndex((task) => task.id === draggedId);
      const to = selected.findIndex((task) => task.id === targetId);
      if (from < 0 || to < 0 || from === to) return current;
      const reordered = [...selected];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      let index = 0;
      return {
        ...current,
        dailyTasks: current.dailyTasks.map((task) =>
          task.date === selectedDate && !task.done ? reordered[index++] : task,
        ),
      };
    });
  }

  function deleteTodayTask(task: DailyTask) {
    setState(
      (current) =>
        current && {
          ...current,
          dailyTasks: current.dailyTasks.filter((item) => item.id !== task.id),
        },
    );
    setTaskEditing(null);
    const dayLabel =
      task.date === moveDate(dateKey(), -1)
        ? '昨天'
        : task.date === dateKey()
          ? '今天'
          : '明天';
    showToast(`已删除${dayLabel}的这件事`, () => {
      setState(
        (current) =>
          current && {
            ...current,
            dailyTasks: [...current.dailyTasks, task],
          },
      );
    });
  }

  function saveEditedTask(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskEditing?.title.trim()) return;
    const edited = {
      ...taskEditing,
      title: taskEditing.title.trim(),
      emoji: taskEditing.emoji || pickDailyEmoji(),
      updatedAt: new Date().toISOString(),
    };
    setState(
      (current) =>
        current && {
          ...current,
          dailyTasks: current.dailyTasks.map((task) =>
            task.id === edited.id ? edited : task,
          ),
        },
    );
    setTaskEditing(null);
    showToast('这件小事已修改');
  }

  function saveCommon(item: Pick<CommonItem, 'emoji' | 'title'>, id?: string) {
    const title = item.title.trim();
    if (!title) return;
    const now = new Date().toISOString();
    setState((current) => {
      if (!current) return current;
      if (id) {
        return {
          ...current,
          commonItems: current.commonItems.map((common) =>
            common.id === id
              ? {
                  ...common,
                  emoji: item.emoji || pickDailyEmoji(),
                  title,
                  updatedAt: now,
                }
              : common,
          ),
        };
      }
      return {
        ...current,
        commonItems: [
          ...current.commonItems,
          {
            id: createId('common'),
            emoji: item.emoji || pickDailyEmoji(),
            title,
            createdAt: now,
            updatedAt: now,
          },
        ],
      };
    });
  }

  function reorderCommonItems(draggedId: string, targetId: string) {
    setState((current) => {
      if (!current) return current;
      const from = current.commonItems.findIndex(
        (item) => item.id === draggedId,
      );
      const to = current.commonItems.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0 || from === to) return current;
      const commonItems = [...current.commonItems];
      const [moved] = commonItems.splice(from, 1);
      commonItems.splice(to, 0, moved);
      return { ...current, commonItems };
    });
  }

  function deleteCommon(item: CommonItem) {
    askConfirmation({
      title: `删除“${item.title}”？`,
      description: '只会删除这条常用模板，以前加进每日的记录仍会保留。',
      confirmLabel: '删除常用事项',
      destructive: true,
      action: () => {
        setState(
          (current) =>
            current && {
              ...current,
              commonItems: current.commonItems.filter(
                (common) => common.id !== item.id,
              ),
            },
        );
        showToast('常用事项已删除，历史记录仍在');
      },
    });
  }

  return {
    todayDrawerOpen,
    setTodayDrawerOpen,
    todayDrawerMode,
    setTodayDrawerMode,
    taskEditing,
    setTaskEditing,
    addTodayTasks,
    toggleTodayTask,
    reorderTodayTasks,
    deleteTodayTask,
    saveEditedTask,
    saveCommon,
    reorderCommonItems,
    deleteCommon,
  };
}
