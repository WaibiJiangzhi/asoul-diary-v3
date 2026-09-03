'use client';

/* oxlint-disable react/react-compiler -- React Compiler reports an internal PruneHoistedContexts invariant for the WebMCP progressive-enhancement effect. */

import type { ChangeEvent, CSSProperties, SyntheticEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  AppHeader,
  BottomNav,
  PaperBinding,
  SettingsDrawer,
} from '@/components/diary/chrome';
import {
  ConfirmDialog,
  type Confirmation,
} from '@/components/diary/confirm-dialog';
import {
  createEmptyGrowthDraft,
  type GrowthDraft,
} from '@/components/diary/constants';
import { GrowthDrawer, GrowthView } from '@/components/diary/growth';
import { JournalView } from '@/components/diary/journal';
import {
  TaskEditDrawer,
  TodayDrawer,
  TodayView,
} from '@/components/diary/today';
import { ACCENT_COLORS, createDefaultState, createId } from '@/lib/defaults';
import { dateKey, formatShortDate, moveDate } from '@/lib/date';
import {
  clearAllData,
  createBackup,
  deletePhotos,
  loadState,
  restoreBackup,
  saveState,
  storePhoto,
} from '@/lib/db';
import type {
  AppState,
  AppTab,
  CommonItem,
  Countdown,
  CountdownNote,
  DailyTask,
  DiaryEntry,
  GrowthMemory,
  ProgressEvent,
  ProgressGoal,
  V3Backup,
} from '@/lib/types';

declare global {
  interface Document {
    modelContext?: {
      registerTool: (
        tool: {
          name: string;
          title?: string;
          description: string;
          inputSchema: object;
          annotations?: {
            readOnlyHint?: boolean;
            untrustedContentHint?: boolean;
          };
          execute: (input: unknown) => unknown;
        },
        options?: { signal?: AbortSignal },
      ) => void | Promise<void>;
    };
  }
}

type ToastState = { message: string; undo?: () => void } | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const pause = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const BROWSER_THEME_COLORS = {
  bella: '#fff6f1',
  jiaran: '#fff4f7',
  nailin: '#f1f3fa',
} as const;

export default function DiaryApp() {
  const [state, setState] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [todayDate, setTodayDate] = useState(dateKey());
  const [journalDate, setJournalDate] = useState(dateKey());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [todayDrawerOpen, setTodayDrawerOpen] = useState(false);
  const [todayDrawerMode, setTodayDrawerMode] = useState<'add' | 'manage'>(
    'add',
  );
  const [taskEditing, setTaskEditing] = useState<DailyTask | null>(null);
  const [growthOpen, setGrowthOpen] = useState(false);
  const [growthDraft, setGrowthDraft] = useState<GrowthDraft>(
    createEmptyGrowthDraft,
  );
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [saveStatus, setSaveStatus] = useState<
    'saved' | 'saving' | 'unavailable'
  >('saved');
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const stateRef = useRef<AppState | null>(null);
  const storageAvailable = useRef(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);
  const isReady = state !== null;
  const activeAccent = state?.settings.accent;

  useEffect(() => {
    loadState()
      .then((next) => {
        stateRef.current = next;
        setState(next);
        loaded.current = true;
      })
      .catch(() => {
        const fallback = createDefaultState();
        storageAvailable.current = false;
        stateRef.current = fallback;
        setState(fallback);
        setSaveStatus('unavailable');
        loaded.current = true;
        setToast({ message: '本地存储不可用，当前内容不会被保存' });
      });
  }, []);

  useEffect(() => {
    stateRef.current = state;
    if (!state || !loaded.current || !storageAvailable.current) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      void saveState(state)
        .then(() => setSaveStatus('saved'))
        .catch(() => {
          storageAvailable.current = false;
          setSaveStatus('unavailable');
          showToast('自动保存失败，请先导出备份');
        });
    }, 280);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (!activeAccent) return;
    document.documentElement.dataset.accent = activeAccent;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', BROWSER_THEME_COLORS[activeAccent]);
    return () => {
      delete document.documentElement.dataset.accent;
    };
  }, [activeAccent]);

  useEffect(() => {
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleInstall);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      void navigator.serviceWorker.register('/sw.js');
    }
    void navigator.storage?.persist?.();
    return () =>
      window.removeEventListener('beforeinstallprompt', handleInstall);
  }, []);

  useEffect(() => {
    if (!isReady || !document.modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const report = () => undefined;
    try {
      void Promise.resolve(
        document.modelContext.registerTool(
          {
            name: 'read_today_summary',
            title: '查看今日记录',
            description: '读取今天的事项及完成情况，不修改数据。',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute: () => {
              const today = dateKey();
              const tasks =
                stateRef.current?.dailyTasks.filter(
                  (task) => task.date === today,
                ) ?? [];
              return {
                date: today,
                completed: tasks.filter((task) => task.done).length,
                tasks,
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(report);
      void Promise.resolve(
        document.modelContext.registerTool(
          {
            name: 'add_today_tasks',
            title: '添加今日事项',
            description: '把一件或多件一行小事添加到今天。',
            inputSchema: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  minItems: 1,
                  maxItems: 12,
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      emoji: { type: 'string' },
                    },
                    required: ['title'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['items'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: true },
            async execute(input) {
              const items = (
                input as { items?: { title?: string; emoji?: string }[] }
              ).items;
              if (
                !Array.isArray(items) ||
                !items.length ||
                items.some((item) => !item.title?.trim())
              ) {
                throw new Error('items 必须是包含标题的非空数组');
              }
              const now = new Date().toISOString();
              const tasks: DailyTask[] = items.map((item) => ({
                id: createId('task'),
                date: dateKey(),
                emoji: item.emoji?.trim() || '🌱',
                title: item.title!.trim().slice(0, 50),
                done: false,
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
              await pause();
              return { added: tasks.length, ids: tasks.map((task) => task.id) };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(report);
      void Promise.resolve(
        document.modelContext.registerTool(
          {
            name: 'adjust_progress_goal',
            title: '记录成长足迹',
            description: '为已有进度目标增加或减少数值，并自动留下一条足迹。',
            inputSchema: {
              type: 'object',
              properties: {
                goalId: { type: 'string' },
                delta: { type: 'number' },
                note: { type: 'string' },
              },
              required: ['goalId', 'delta'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            async execute(input) {
              const { goalId, delta, note } = input as {
                goalId?: string;
                delta?: number;
                note?: string;
              };
              const goal = stateRef.current?.progressGoals.find(
                (item) => item.id === goalId,
              );
              if (
                !goal ||
                typeof delta !== 'number' ||
                !Number.isFinite(delta) ||
                delta === 0
              ) {
                throw new Error('需要有效的 goalId 和非零 delta');
              }
              const changedAt = new Date().toISOString();
              setState(
                (current) =>
                  current && {
                    ...current,
                    progressGoals: current.progressGoals.map((item) => {
                      if (item.id !== goalId) return item;
                      const nextValue = Math.min(
                        item.total,
                        Math.max(0, Number((item.current + delta).toFixed(4))),
                      );
                      const appliedDelta = Number(
                        (nextValue - item.current).toFixed(4),
                      );
                      if (!appliedDelta) return item;
                      return {
                        ...item,
                        current: nextValue,
                        updatedAt: changedAt,
                        events: [
                          ...item.events,
                          {
                            id: createId('event'),
                            delta: appliedDelta,
                            valueAfter: nextValue,
                            note: note?.trim().slice(0, 100) ?? '',
                            createdAt: changedAt,
                          },
                        ],
                      };
                    }),
                  },
              );
              await pause();
              return { goalId, delta };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(report);
    } catch {
      // WebMCP is an optional progressive enhancement.
    }
    return () => lifecycle.abort();
  }, [isReady]);

  function showToast(message: string, undo?: () => void) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 5200 : 3000);
  }

  function haptic() {
    if (stateRef.current?.settings.haptics) navigator.vibrate?.(18);
  }

  function askConfirmation(next: Confirmation) {
    setConfirmation(next);
  }

  function changeTab(tab: AppTab) {
    setActiveTab(tab);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  }

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
      date: todayDate,
      emoji: item.emoji.trim() || '🌱',
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
    showToast(
      `${tasks.length} 件小事已放进${todayDate === dateKey() ? '今天' : '明天'}`,
    );
  }

  function toggleTodayTask(id: string, done: boolean) {
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
        (task) => task.date === todayDate,
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
          task.date === todayDate ? reordered[index++] : task,
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
    showToast(
      `已删除${task.date === dateKey() ? '今天' : '明天'}的这件事`,
      () => {
        setState(
          (current) =>
            current && {
              ...current,
              dailyTasks: [...current.dailyTasks, task],
            },
        );
      },
    );
  }

  function saveEditedTask(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskEditing?.title.trim()) return;
    const edited = {
      ...taskEditing,
      title: taskEditing.title.trim(),
      emoji: taskEditing.emoji || '🌱',
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
              ? { ...common, emoji: item.emoji || '🌱', title, updatedAt: now }
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
            emoji: item.emoji || '🌱',
            title,
            createdAt: now,
            updatedAt: now,
          },
        ],
      };
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

  function openNewGrowth(kind: GrowthDraft['kind']) {
    setGrowthDraft({
      ...createEmptyGrowthDraft(),
      kind,
      color: ACCENT_COLORS[stateRef.current?.settings.accent ?? 'bella'],
    });
    setGrowthOpen(true);
  }

  function openEditGrowth(item: Countdown | ProgressGoal) {
    setGrowthDraft(
      item.kind === 'countdown'
        ? {
            id: item.id,
            kind: 'countdown',
            emoji: item.emoji,
            title: item.title,
            targetDate: item.targetDate,
            current: '0',
            total: '30',
            unit: 'km',
            step: '1',
            note: item.note,
            color: item.color,
          }
        : {
            id: item.id,
            kind: 'progress',
            emoji: item.emoji,
            title: item.title,
            targetDate: moveDate(dateKey(), 30),
            current: String(item.current),
            total: String(item.total),
            unit: item.unit,
            step: String(item.step),
            note: item.note,
            color: item.color,
          },
    );
    setGrowthOpen(true);
  }

  function saveGrowth(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!growthDraft.title.trim()) return;
    const now = new Date().toISOString();
    if (growthDraft.kind === 'countdown') {
      const previous = state?.countdowns.find(
        (entry) => entry.id === growthDraft.id,
      );
      const item: Countdown = {
        id: growthDraft.id ?? createId('countdown'),
        kind: 'countdown',
        emoji: growthDraft.emoji || '⏳',
        title: growthDraft.title.trim(),
        targetDate: growthDraft.targetDate,
        note: growthDraft.note.trim(),
        notes: previous?.notes ?? [],
        color: growthDraft.color,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
      setState(
        (current) =>
          current && {
            ...current,
            countdowns: growthDraft.id
              ? current.countdowns.map((entry) =>
                  entry.id === growthDraft.id ? item : entry,
                )
              : [...current.countdowns, item],
          },
      );
    } else {
      const total = Math.max(0.01, Number(growthDraft.total) || 1);
      const currentValue = Math.min(
        total,
        Math.max(0, Number(growthDraft.current) || 0),
      );
      const previous = state?.progressGoals.find(
        (entry) => entry.id === growthDraft.id,
      );
      const item: ProgressGoal = {
        id: growthDraft.id ?? createId('goal'),
        kind: 'progress',
        emoji: growthDraft.emoji || '🌱',
        title: growthDraft.title.trim(),
        current: currentValue,
        total,
        unit: growthDraft.unit.trim() || '次',
        step: Math.max(0.01, Number(growthDraft.step) || 1),
        note: growthDraft.note.trim(),
        color: growthDraft.color,
        events: previous?.events ?? [],
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
      setState(
        (current) =>
          current && {
            ...current,
            progressGoals: growthDraft.id
              ? current.progressGoals.map((entry) =>
                  entry.id === growthDraft.id ? item : entry,
                )
              : [...current.progressGoals, item],
          },
      );
    }
    setGrowthOpen(false);
    showToast(growthDraft.id ? '成长记录已修改' : '新的成长记录已开始 ✨');
  }

  function adjustProgress(goalId: string, requestedDelta: number, note = '') {
    if (!Number.isFinite(requestedDelta) || requestedDelta === 0) return;
    const previous = stateRef.current?.progressGoals.find(
      (goal) => goal.id === goalId,
    );
    if (!previous) return;
    const projected = Math.min(
      previous.total,
      Math.max(0, Number((previous.current + requestedDelta).toFixed(4))),
    );
    const actuallyCompleted =
      previous.current < previous.total && projected >= previous.total;
    setState((current) => {
      if (!current) return current;
      return {
        ...current,
        progressGoals: current.progressGoals.map((goal) => {
          if (goal.id !== goalId) return goal;
          const value = Math.min(
            goal.total,
            Math.max(0, Number((goal.current + requestedDelta).toFixed(4))),
          );
          const delta = Number((value - goal.current).toFixed(4));
          if (!delta) return goal;
          const now = new Date().toISOString();
          return {
            ...goal,
            current: value,
            updatedAt: now,
            events: [
              ...goal.events,
              {
                id: createId('event'),
                delta,
                valueAfter: value,
                note: note.trim(),
                createdAt: now,
              },
            ],
          };
        }),
      };
    });
    haptic();
    showToast(
      actuallyCompleted
        ? '到达目标了！这段成长值得收藏 🎉'
        : note.trim()
          ? '这一步和一句话都记下了'
          : '已记下这一步成长',
    );
  }

  function addCountdownNote(countdownId: string, text: string) {
    const cleaned = text.trim().slice(0, 120);
    if (!cleaned) return;
    const now = new Date().toISOString();
    setState(
      (current) =>
        current && {
          ...current,
          countdowns: current.countdowns.map((countdown) =>
            countdown.id === countdownId
              ? {
                  ...countdown,
                  updatedAt: now,
                  notes: [
                    ...countdown.notes,
                    {
                      id: createId('countdown-note'),
                      text: cleaned,
                      createdAt: now,
                    },
                  ],
                }
              : countdown,
          ),
        },
    );
    haptic();
    showToast('今天想说的话已经留下');
  }

  function deleteCountdownNote(countdown: Countdown, note: CountdownNote) {
    askConfirmation({
      title: '删除这句日子手记？',
      description: `“${note.text}”删除后无法恢复。`,
      confirmLabel: '删除这句话',
      destructive: true,
      action: () => {
        setState(
          (current) =>
            current && {
              ...current,
              countdowns: current.countdowns.map((item) =>
                item.id === countdown.id
                  ? {
                      ...item,
                      notes: item.notes.filter((entry) => entry.id !== note.id),
                      updatedAt: new Date().toISOString(),
                    }
                  : item,
              ),
            },
        );
        showToast('这句话已删除');
      },
    });
  }

  function moveGrowth(item: Countdown | ProgressGoal, direction: -1 | 1) {
    const currentSource =
      item.kind === 'countdown'
        ? stateRef.current?.countdowns
        : stateRef.current?.progressGoals;
    const currentIndex =
      currentSource?.findIndex((entry) => entry.id === item.id) ?? -1;
    if (
      currentIndex < 0 ||
      currentIndex + direction < 0 ||
      currentIndex + direction >= (currentSource?.length ?? 0)
    ) {
      showToast(direction < 0 ? '已经是第一张了' : '已经是最后一张了');
      return;
    }
    setState((current) => {
      if (!current) return current;
      const source =
        item.kind === 'countdown' ? current.countdowns : current.progressGoals;
      const from = source.findIndex((entry) => entry.id === item.id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= source.length) return current;
      const reordered = [...source];
      [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
      return item.kind === 'countdown'
        ? { ...current, countdowns: reordered as Countdown[] }
        : { ...current, progressGoals: reordered as ProgressGoal[] };
    });
    showToast(direction < 0 ? '卡片已向前移动' : '卡片已向后移动');
  }

  function deleteProgressEvent(goal: ProgressGoal, event: ProgressEvent) {
    const nextValue = Math.min(
      goal.total,
      Math.max(0, Number((goal.current - event.delta).toFixed(4))),
    );
    askConfirmation({
      title: '删除这条成长足迹？',
      description: `${event.delta >= 0 ? '+' : ''}${event.delta} ${goal.unit} 会从记录中移除，当前进度将从 ${goal.current} ${goal.unit} 调整为 ${nextValue} ${goal.unit}。`,
      confirmLabel: '删除足迹',
      destructive: true,
      action: () => {
        setState((current) => {
          if (!current) return current;
          return {
            ...current,
            progressGoals: current.progressGoals.map((item) => {
              if (item.id !== goal.id) return item;
              const baseline = Number(
                (
                  item.current -
                  item.events.reduce((sum, entry) => sum + entry.delta, 0)
                ).toFixed(4),
              );
              let running = baseline;
              const events = item.events
                .filter((entry) => entry.id !== event.id)
                .map((entry) => {
                  running = Math.min(
                    item.total,
                    Math.max(0, Number((running + entry.delta).toFixed(4))),
                  );
                  return { ...entry, valueAfter: running };
                });
              return {
                ...item,
                current: running,
                events,
                updatedAt: new Date().toISOString(),
              };
            }),
          };
        });
        showToast('这条足迹已删除，进度已同步调整');
      },
    });
  }

  function deleteGrowth(item: Countdown | ProgressGoal) {
    askConfirmation({
      title: `删除“${item.title}”？`,
      description:
        item.kind === 'progress'
          ? '这个进度和其中的全部足迹都会删除。'
          : '这个倒计时会从成长手册中删除。',
      confirmLabel: item.kind === 'progress' ? '删除进度' : '删除倒计时',
      destructive: true,
      action: () => {
        setState(
          (current) =>
            current &&
            (item.kind === 'progress'
              ? {
                  ...current,
                  progressGoals: current.progressGoals.filter(
                    (entry) => entry.id !== item.id,
                  ),
                }
              : {
                  ...current,
                  countdowns: current.countdowns.filter(
                    (entry) => entry.id !== item.id,
                  ),
                }),
        );
        showToast('已删除');
      },
    });
  }

  function archiveGoal(
    goal: ProgressGoal,
    completedNaturally: boolean,
    confirmed = false,
  ) {
    if (!completedNaturally && !confirmed) {
      askConfirmation({
        title: '现在结束这段成长？',
        description:
          '它会按目前的进度收进成长纪念册。完成得怎样都没关系，有尝试就很棒了。',
        confirmLabel: '结束并收藏',
        action: () => archiveGoal(goal, false, true),
      });
      return;
    }
    const memory: GrowthMemory = {
      id: createId('memory'),
      sourceGoalId: goal.id,
      emoji: goal.emoji,
      title: goal.title,
      current: goal.current,
      total: goal.total,
      unit: goal.unit,
      note: goal.note,
      color: goal.color,
      completedNaturally,
      startedAt: goal.createdAt,
      endedAt: new Date().toISOString(),
      events: goal.events,
    };
    setState(
      (current) =>
        current && {
          ...current,
          progressGoals: current.progressGoals.filter(
            (entry) => entry.id !== goal.id,
          ),
          memories: [memory, ...current.memories],
        },
    );
    haptic();
    showToast('已收进成长纪念册 · 有尝试就很棒了');
  }

  function copyMemory(memory: GrowthMemory) {
    const now = new Date().toISOString();
    const goal: ProgressGoal = {
      id: createId('goal'),
      kind: 'progress',
      emoji: memory.emoji,
      title: memory.title,
      current: 0,
      total: memory.total,
      unit: memory.unit,
      step: Math.max(0.01, Math.abs(memory.events.at(-1)?.delta ?? 1)),
      note: memory.note,
      color: memory.color,
      events: [],
      createdAt: now,
      updatedAt: now,
    };
    setState(
      (current) =>
        current && {
          ...current,
          progressGoals: [...current.progressGoals, goal],
        },
    );
    showToast('已复制为新的一期');
  }

  function deleteMemory(memory: GrowthMemory) {
    askConfirmation({
      title: `删除“${memory.title}”？`,
      description: '这段纪念和里面的全部足迹都会删除，之后无法恢复。',
      confirmLabel: '删除纪念',
      destructive: true,
      action: () => {
        setState(
          (current) =>
            current && {
              ...current,
              memories: current.memories.filter(
                (item) => item.id !== memory.id,
              ),
            },
        );
        showToast('已从成长纪念册删除');
      },
    });
  }

  function updateDiary(date: string, patch: Partial<DiaryEntry>) {
    const now = new Date().toISOString();
    setState((current) => {
      if (!current) return current;
      const existing = current.diaries.find((entry) => entry.date === date);
      const entry: DiaryEntry = existing
        ? { ...existing, ...patch, updatedAt: now }
        : {
            date,
            mood: '',
            body: '',
            photoIds: [],
            taskSnapshots: [],
            createdAt: now,
            updatedAt: now,
            ...patch,
          };
      return {
        ...current,
        diaries: [
          ...current.diaries.filter((item) => item.date !== date),
          entry,
        ],
      };
    });
  }

  async function addDiaryPhotos(date: string, files: FileList | null) {
    if (!files?.length) return;
    try {
      const chosen = Array.from(files).slice(0, 6);
      const stored = await Promise.all(chosen.map(storePhoto));
      const currentIds =
        stateRef.current?.diaries.find((entry) => entry.date === date)
          ?.photoIds ?? [];
      updateDiary(date, {
        photoIds: [...currentIds, ...stored.map((photo) => photo.id)].slice(
          0,
          9,
        ),
      });
      showToast(`已放进 ${stored.length} 张照片`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '照片添加失败');
    }
  }

  function removeDiaryPhoto(date: string, photoId: string) {
    askConfirmation({
      title: '移除这张照片？',
      description: '照片会从这一页日记和本机存储中删除。',
      confirmLabel: '移除照片',
      destructive: true,
      action: async () => {
        await deletePhotos([photoId]);
        const ids =
          stateRef.current?.diaries.find((entry) => entry.date === date)
            ?.photoIds ?? [];
        updateDiary(date, { photoIds: ids.filter((id) => id !== photoId) });
        showToast('照片已移除');
      },
    });
  }

  function deleteDiary(entry: DiaryEntry) {
    askConfirmation({
      title: `删除 ${formatShortDate(entry.date)} 的日记？`,
      description: '这一页的文字、照片和收进来的小事都会删除，之后无法恢复。',
      confirmLabel: '删除这一页',
      destructive: true,
      action: async () => {
        await deletePhotos(entry.photoIds);
        setState(
          (current) =>
            current && {
              ...current,
              diaries: current.diaries.filter(
                (item) => item.date !== entry.date,
              ),
            },
        );
        showToast('这一页日记已删除');
      },
    });
  }

  async function exportData() {
    if (!state) return;
    showToast('正在整理本地备份…');
    const backup = await createBackup(state);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `asoul-diary-v3-${dateKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('完整备份已下载');
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    askConfirmation({
      title: '用备份替换现在的记录？',
      description: '当前设备上的事项、成长、日记和照片都会被备份内容替换。',
      confirmLabel: '恢复备份',
      action: async () => {
        try {
          const backup = JSON.parse(await file.text()) as V3Backup;
          const restored = await restoreBackup(backup);
          setState(restored);
          showToast('备份已恢复');
        } catch (error) {
          showToast(error instanceof Error ? error.message : '备份恢复失败');
        }
      },
    });
  }

  function clearData() {
    askConfirmation({
      title: '清空这台设备上的全部记录？',
      description:
        '事项、成长、日记和照片都会永久删除。建议先取消并下载完整备份。',
      confirmLabel: '确认全部清空',
      destructive: true,
      action: async () => {
        const fresh = await clearAllData();
        setState(fresh);
        setSettingsOpen(false);
        showToast('数据已清空，又是新的一页');
      },
    });
  }

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') setInstallPrompt(null);
      return;
    }
    showToast('苹果请点“分享 → 添加到主屏幕”；Android 请打开浏览器菜单安装');
  }

  if (!state) {
    return (
      <main className="app-loading">
        <Sparkles aria-hidden="true" />
        <p>正在翻开今天的一页…</p>
      </main>
    );
  }

  const wallpaperStyle =
    state.settings.theme === 'wallpaper'
      ? ({
          '--selected-wallpaper': `url("${state.settings.wallpaper}")`,
        } as CSSProperties)
      : undefined;

  return (
    <main
      className={`app-shell theme-${state.settings.accent} ${state.settings.theme === 'wallpaper' ? 'has-wallpaper' : ''}`}
      style={wallpaperStyle}
    >
      <section className="diary-page" aria-label="Asoul一个魂生活日记">
        <PaperBinding />
        <AppHeader
          saveStatus={saveStatus}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {activeTab === 'today' && (
          <TodayView
            key={todayDate}
            state={state}
            selectedDate={todayDate}
            onDateChange={setTodayDate}
            onAdd={() => {
              setTodayDrawerMode('add');
              setTodayDrawerOpen(true);
            }}
            onToggle={toggleTodayTask}
            onEdit={setTaskEditing}
            onReorder={reorderTodayTasks}
          />
        )}
        {activeTab === 'growth' && (
          <GrowthView
            state={state}
            onAdd={openNewGrowth}
            onAdjust={adjustProgress}
            onDeleteEvent={deleteProgressEvent}
            onEdit={openEditGrowth}
            onDelete={deleteGrowth}
            onArchive={archiveGoal}
            onCopy={copyMemory}
            onDeleteMemory={deleteMemory}
            onAddCountdownNote={addCountdownNote}
            onDeleteCountdownNote={deleteCountdownNote}
          />
        )}
        {activeTab === 'journal' && (
          <JournalView
            state={state}
            selectedDate={journalDate}
            onDateChange={setJournalDate}
            onUpdate={updateDiary}
            onAddPhotos={addDiaryPhotos}
            onRemovePhoto={removeDiaryPhoto}
            onDelete={deleteDiary}
          />
        )}
      </section>

      <BottomNav active={activeTab} onChange={changeTab} />

      <TodayDrawer
        state={state}
        selectedDate={todayDate}
        open={todayDrawerOpen}
        mode={todayDrawerMode}
        onModeChange={setTodayDrawerMode}
        onOpenChange={setTodayDrawerOpen}
        onAddTasks={addTodayTasks}
        onSaveCommon={saveCommon}
        onDeleteCommon={deleteCommon}
      />

      <TaskEditDrawer
        task={taskEditing}
        onChange={setTaskEditing}
        onSave={saveEditedTask}
        onDelete={deleteTodayTask}
      />

      <GrowthDrawer
        open={growthOpen}
        draft={growthDraft}
        onOpenChange={setGrowthOpen}
        onDraftChange={setGrowthDraft}
        onSave={saveGrowth}
        onMove={(kind, id, direction) => {
          const item =
            kind === 'countdown'
              ? state.countdowns.find((entry) => entry.id === id)
              : state.progressGoals.find((entry) => entry.id === id);
          if (item) moveGrowth(item, direction);
        }}
      />

      <SettingsDrawer
        state={state}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onStateChange={setState}
        onExport={exportData}
        onImport={importData}
        onClear={clearData}
        onInstall={installApp}
      />

      <ConfirmDialog
        confirmation={confirmation}
        onClose={() => setConfirmation(null)}
      />

      {toast && (
        <output className="toast" aria-live="polite">
          <span>{toast.message}</span>
          {toast.undo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              <RotateCcw aria-hidden="true" /> 撤销
            </Button>
          )}
        </output>
      )}
    </main>
  );
}
