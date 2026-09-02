'use client';

/* oxlint-disable react/react-compiler -- React Compiler reports an internal PruneHoistedContexts invariant for the WebMCP progressive-enhancement effect. */

import type { ChangeEvent, CSSProperties, SyntheticEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { zhCN } from 'date-fns/locale';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BookHeart,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  FileUp,
  Footprints,
  Heart,
  Image as ImageIcon,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Smartphone,
  Sparkles,
  Sprout,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { WALLPAPERS, createId } from '@/lib/defaults';
import { dateKey, daysUntil, formatFullDate, formatMoment, formatShortDate, fromDateKey, moveDate } from '@/lib/date';
import {
  clearAllData,
  createBackup,
  deletePhotos,
  getPhotos,
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
  DailyTask,
  DiaryEntry,
  GrowthMemory,
  Mood,
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
          annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
          execute: (input: unknown) => unknown;
        },
        options?: { signal?: AbortSignal },
      ) => void | Promise<void>;
    };
  }
}

type ToastState = { message: string; undo?: () => void } | null;
type GrowthDraft = {
  id?: string;
  kind: 'progress' | 'countdown';
  emoji: string;
  title: string;
  targetDate: string;
  current: string;
  total: string;
  unit: string;
  step: string;
  note: string;
  color: ProgressGoal['color'];
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const moodOptions: { value: Exclude<Mood, ''>; emoji: string; label: string }[] = [
  { value: 'happy', emoji: '😄', label: '开心' },
  { value: 'good', emoji: '😌', label: '还不错' },
  { value: 'plain', emoji: '😐', label: '一般般' },
  { value: 'annoyed', emoji: '😣', label: '有点烦' },
  { value: 'sad', emoji: '🥹', label: '难受' },
];

const emptyGrowthDraft = (): GrowthDraft => ({
  kind: 'progress',
  emoji: '🌱',
  title: '',
  targetDate: moveDate(dateKey(), 30),
  current: '0',
  total: '30',
  unit: 'km',
  step: '1',
  note: '',
  color: '#E799B0',
});

const pause = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export default function DiaryApp() {
  const [state, setState] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [journalDate, setJournalDate] = useState(dateKey());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [todayDrawerOpen, setTodayDrawerOpen] = useState(false);
  const [todayDrawerMode, setTodayDrawerMode] = useState<'add' | 'manage'>('add');
  const [taskEditing, setTaskEditing] = useState<DailyTask | null>(null);
  const [growthOpen, setGrowthOpen] = useState(false);
  const [growthDraft, setGrowthDraft] = useState<GrowthDraft>(emptyGrowthDraft);
  const [toast, setToast] = useState<ToastState>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const stateRef = useRef<AppState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);
  const isReady = state !== null;

  useEffect(() => {
    loadState()
      .then((next) => {
        stateRef.current = next;
        setState(next);
        loaded.current = true;
      })
      .catch(() => setToast({ message: '本地数据库打开失败，请刷新后再试' }));
  }, []);

  useEffect(() => {
    stateRef.current = state;
    if (!state || !loaded.current) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      void saveState(state)
        .then(() => setSaveStatus('saved'))
        .catch(() => showToast('自动保存失败，请先导出备份'));
    }, 280);
    return () => clearTimeout(timer);
  }, [state]);

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
    return () => window.removeEventListener('beforeinstallprompt', handleInstall);
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
            inputSchema: { type: 'object', properties: {}, additionalProperties: false },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute: () => {
              const today = dateKey();
              const tasks = stateRef.current?.dailyTasks.filter((task) => task.date === today) ?? [];
              return { date: today, completed: tasks.filter((task) => task.done).length, tasks };
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
                    properties: { title: { type: 'string' }, emoji: { type: 'string' } },
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
              const items = (input as { items?: { title?: string; emoji?: string }[] }).items;
              if (!Array.isArray(items) || !items.length || items.some((item) => !item.title?.trim())) {
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
              setState((current) => current && ({ ...current, dailyTasks: [...current.dailyTasks, ...tasks] }));
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
              properties: { goalId: { type: 'string' }, delta: { type: 'number' } },
              required: ['goalId', 'delta'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            async execute(input) {
              const { goalId, delta } = input as { goalId?: string; delta?: number };
              const goal = stateRef.current?.progressGoals.find((item) => item.id === goalId);
              if (!goal || typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) {
                throw new Error('需要有效的 goalId 和非零 delta');
              }
              const changedAt = new Date().toISOString();
              setState((current) => current && ({
                ...current,
                progressGoals: current.progressGoals.map((item) => {
                  if (item.id !== goalId) return item;
                  const nextValue = Math.min(item.total, Math.max(0, Number((item.current + delta).toFixed(4))));
                  const appliedDelta = Number((nextValue - item.current).toFixed(4));
                  if (!appliedDelta) return item;
                  return {
                    ...item,
                    current: nextValue,
                    updatedAt: changedAt,
                    events: [...item.events, { id: createId('event'), delta: appliedDelta, valueAfter: nextValue, createdAt: changedAt }],
                  };
                }),
              }));
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

  function addTodayTask(emoji: string, title: string, sourceCommonId?: string) {
    const cleaned = title.trim();
    if (!cleaned) return;
    const now = new Date().toISOString();
    const task: DailyTask = {
      id: createId('task'),
      date: dateKey(),
      emoji: emoji.trim() || '🌱',
      title: cleaned,
      done: false,
      sourceCommonId,
      createdAt: now,
      updatedAt: now,
    };
    setState((current) => current && ({ ...current, dailyTasks: [...current.dailyTasks, task] }));
    haptic();
    showToast('已放进今天 · 轻松做就好');
  }

  function toggleTodayTask(id: string, done: boolean) {
    setState((current) =>
      current && ({
        ...current,
        dailyTasks: current.dailyTasks.map((task) =>
          task.id === id ? { ...task, done, updatedAt: new Date().toISOString() } : task,
        ),
      }),
    );
    haptic();
    if (done) showToast('又完成了一件小事 ✓');
  }

  function deleteTodayTask(task: DailyTask) {
    setState((current) => current && ({ ...current, dailyTasks: current.dailyTasks.filter((item) => item.id !== task.id) }));
    setTaskEditing(null);
    showToast('已删除今天的这件事', () => {
      setState((current) => current && ({ ...current, dailyTasks: [...current.dailyTasks, task] }));
    });
  }

  function saveEditedTask(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskEditing?.title.trim()) return;
    const edited = { ...taskEditing, title: taskEditing.title.trim(), emoji: taskEditing.emoji || '🌱', updatedAt: new Date().toISOString() };
    setState((current) => current && ({ ...current, dailyTasks: current.dailyTasks.map((task) => task.id === edited.id ? edited : task) }));
    setTaskEditing(null);
    showToast('今天的小事已修改');
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
            common.id === id ? { ...common, emoji: item.emoji || '🌱', title, updatedAt: now } : common,
          ),
        };
      }
      return {
        ...current,
        commonItems: [...current.commonItems, { id: createId('common'), emoji: item.emoji || '🌱', title, createdAt: now, updatedAt: now }],
      };
    });
  }

  function deleteCommon(item: CommonItem) {
    if (!window.confirm(`删除常用事项“${item.title}”？\n以前加进每日的记录会保留。`)) return;
    setState((current) => current && ({ ...current, commonItems: current.commonItems.filter((common) => common.id !== item.id) }));
    showToast('常用事项已删除，历史记录仍在');
  }

  function openNewGrowth(kind: GrowthDraft['kind']) {
    setGrowthDraft({ ...emptyGrowthDraft(), kind });
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
            color: '#E799B0',
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
      const item: Countdown = {
        id: growthDraft.id ?? createId('countdown'),
        kind: 'countdown',
        emoji: growthDraft.emoji || '⏳',
        title: growthDraft.title.trim(),
        targetDate: growthDraft.targetDate,
        note: growthDraft.note.trim(),
        createdAt: state?.countdowns.find((entry) => entry.id === growthDraft.id)?.createdAt ?? now,
        updatedAt: now,
      };
      setState((current) =>
        current && ({
          ...current,
          countdowns: growthDraft.id
            ? current.countdowns.map((entry) => (entry.id === growthDraft.id ? item : entry))
            : [...current.countdowns, item],
        }),
      );
    } else {
      const total = Math.max(0.01, Number(growthDraft.total) || 1);
      const currentValue = Math.min(total, Math.max(0, Number(growthDraft.current) || 0));
      const previous = state?.progressGoals.find((entry) => entry.id === growthDraft.id);
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
      setState((current) =>
        current && ({
          ...current,
          progressGoals: growthDraft.id
            ? current.progressGoals.map((entry) => (entry.id === growthDraft.id ? item : entry))
            : [...current.progressGoals, item],
        }),
      );
    }
    setGrowthOpen(false);
    showToast(growthDraft.id ? '成长记录已修改' : '新的成长记录已开始 ✨');
  }

  function adjustProgress(goalId: string, requestedDelta: number) {
    const previous = stateRef.current?.progressGoals.find((goal) => goal.id === goalId);
    if (!previous) return;
    const projected = Math.min(previous.total, Math.max(0, Number((previous.current + requestedDelta).toFixed(4))));
    const actuallyCompleted = previous.current < previous.total && projected >= previous.total;
    setState((current) => {
      if (!current) return current;
      return {
        ...current,
        progressGoals: current.progressGoals.map((goal) => {
          if (goal.id !== goalId) return goal;
          const value = Math.min(goal.total, Math.max(0, Number((goal.current + requestedDelta).toFixed(4))));
          const delta = Number((value - goal.current).toFixed(4));
          if (!delta) return goal;
          const now = new Date().toISOString();
          return {
            ...goal,
            current: value,
            updatedAt: now,
            events: [...goal.events, { id: createId('event'), delta, valueAfter: value, createdAt: now }],
          };
        }),
      };
    });
    haptic();
    showToast(actuallyCompleted ? '到达目标了！这段成长值得收藏 🎉' : '已记下这一步成长');
  }

  function deleteGrowth(item: Countdown | ProgressGoal) {
    const extra = item.kind === 'progress' ? '\n这个目标的足迹也会一起删除。' : '';
    if (!window.confirm(`删除“${item.title}”？${extra}`)) return;
    setState((current) =>
      current &&
      (item.kind === 'progress'
        ? { ...current, progressGoals: current.progressGoals.filter((entry) => entry.id !== item.id) }
        : { ...current, countdowns: current.countdowns.filter((entry) => entry.id !== item.id) }),
    );
    showToast('已删除');
  }

  function archiveGoal(goal: ProgressGoal, completedNaturally: boolean) {
    if (!completedNaturally && !window.confirm('现在结束这段进度吗？\n它会被收进成长纪念册，因为有尝试就很棒了。')) return;
    const memory: GrowthMemory = {
      id: createId('memory'),
      sourceGoalId: goal.id,
      emoji: goal.emoji,
      title: goal.title,
      current: goal.current,
      total: goal.total,
      unit: goal.unit,
      note: goal.note,
      completedNaturally,
      startedAt: goal.createdAt,
      endedAt: new Date().toISOString(),
      events: goal.events,
    };
    setState((current) => current && ({
      ...current,
      progressGoals: current.progressGoals.filter((entry) => entry.id !== goal.id),
      memories: [memory, ...current.memories],
    }));
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
      step: Math.max(0.01, memory.events.at(-1)?.delta ?? 1),
      note: memory.note,
      color: '#E799B0',
      events: [],
      createdAt: now,
      updatedAt: now,
    };
    setState((current) => current && ({ ...current, progressGoals: [...current.progressGoals, goal] }));
    showToast('已复制为新的一期');
  }

  function deleteMemory(memory: GrowthMemory) {
    if (!window.confirm(`从纪念册中删除“${memory.title}”？\n这段足迹也会一起删除。`)) return;
    setState((current) => current && ({ ...current, memories: current.memories.filter((item) => item.id !== memory.id) }));
    showToast('已从成长纪念册删除');
  }

  function updateDiary(date: string, patch: Partial<DiaryEntry>) {
    const now = new Date().toISOString();
    setState((current) => {
      if (!current) return current;
      const existing = current.diaries.find((entry) => entry.date === date);
      const entry: DiaryEntry = existing
        ? { ...existing, ...patch, updatedAt: now }
        : { date, mood: '', body: '', photoIds: [], createdAt: now, updatedAt: now, ...patch };
      return { ...current, diaries: [...current.diaries.filter((item) => item.date !== date), entry] };
    });
  }

  async function addDiaryPhotos(date: string, files: FileList | null) {
    if (!files?.length) return;
    try {
      const chosen = Array.from(files).slice(0, 6);
      const stored = await Promise.all(chosen.map(storePhoto));
      const currentIds = stateRef.current?.diaries.find((entry) => entry.date === date)?.photoIds ?? [];
      updateDiary(date, { photoIds: [...currentIds, ...stored.map((photo) => photo.id)].slice(0, 9) });
      showToast(`已放进 ${stored.length} 张照片`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '照片添加失败');
    }
  }

  async function removeDiaryPhoto(date: string, photoId: string) {
    await deletePhotos([photoId]);
    const ids = stateRef.current?.diaries.find((entry) => entry.date === date)?.photoIds ?? [];
    updateDiary(date, { photoIds: ids.filter((id) => id !== photoId) });
  }

  async function deleteDiary(entry: DiaryEntry) {
    if (!window.confirm(`删除 ${formatShortDate(entry.date)} 的日记？\n文字和照片都会删除。`)) return;
    await deletePhotos(entry.photoIds);
    setState((current) => current && ({ ...current, diaries: current.diaries.filter((item) => item.date !== entry.date) }));
    showToast('这一页日记已删除');
  }

  async function exportData() {
    if (!state) return;
    showToast('正在整理本地备份…');
    const backup = await createBackup(state);
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
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
    if (!window.confirm('恢复备份会替换当前所有记录，继续吗？')) return;
    try {
      const backup = JSON.parse(await file.text()) as V3Backup;
      const restored = await restoreBackup(backup);
      setState(restored);
      showToast('备份已恢复');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '备份恢复失败');
    }
  }

  async function clearData() {
    if (!window.confirm('要清空全部数据吗？\n这会删除事项、成长、日记和照片。建议先导出备份。')) return;
    if (!window.confirm('最后确认：清空后无法撤销。')) return;
    const fresh = await clearAllData();
    setState(fresh);
    setSettingsOpen(false);
    showToast('数据已清空，又是新的一页');
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

  const wallpaperStyle = state.settings.theme === 'wallpaper'
    ? ({ '--selected-wallpaper': `url("${state.settings.wallpaper}")` } as CSSProperties)
    : undefined;

  return (
    <main className={`app-shell ${state.settings.theme === 'wallpaper' ? 'has-wallpaper' : ''}`} style={wallpaperStyle}>
      <section className="diary-page" aria-label="Asoul一个魂生活日记 v3">
        <PaperBinding />
        <AppHeader tab={activeTab} saveStatus={saveStatus} onOpenSettings={() => setSettingsOpen(true)} />

        {activeTab === 'today' && (
          <TodayView
            state={state}
            onAdd={() => { setTodayDrawerMode('add'); setTodayDrawerOpen(true); }}
            onToggle={toggleTodayTask}
            onEdit={setTaskEditing}
            onOpenDiary={() => setActiveTab('journal')}
          />
        )}
        {activeTab === 'growth' && (
          <GrowthView
            state={state}
            onAdd={openNewGrowth}
            onAdjust={adjustProgress}
            onEdit={openEditGrowth}
            onDelete={deleteGrowth}
            onArchive={archiveGoal}
            onCopy={copyMemory}
            onDeleteMemory={deleteMemory}
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
            saveStatus={saveStatus}
          />
        )}
      </section>

      <BottomNav active={activeTab} onChange={setActiveTab} />

      <TodayDrawer
        state={state}
        open={todayDrawerOpen}
        mode={todayDrawerMode}
        onModeChange={setTodayDrawerMode}
        onOpenChange={setTodayDrawerOpen}
        onAddTask={addTodayTask}
        onSaveCommon={saveCommon}
        onDeleteCommon={deleteCommon}
      />

      <TaskEditDrawer task={taskEditing} onChange={setTaskEditing} onSave={saveEditedTask} onDelete={deleteTodayTask} />

      <GrowthDrawer open={growthOpen} draft={growthDraft} onOpenChange={setGrowthOpen} onDraftChange={setGrowthDraft} onSave={saveGrowth} />

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

      {toast && (
        <output className="toast" aria-live="polite">
          <span>{toast.message}</span>
          {toast.undo && (
            <Button variant="ghost" size="sm" onClick={() => { toast.undo?.(); setToast(null); }}>
              <RotateCcw aria-hidden="true" /> 撤销
            </Button>
          )}
        </output>
      )}
    </main>
  );
}

function PaperBinding() {
  return (
    <>
      <span className="binding-line" aria-hidden="true" />
      <div className="binding-holes" aria-hidden="true">
        {Array.from({ length: 13 }, (_, index) => <i key={index} />)}
      </div>
    </>
  );
}

function AppHeader({ tab, saveStatus, onOpenSettings }: { tab: AppTab; saveStatus: 'saved' | 'saving'; onOpenSettings: () => void }) {
  const labels = { today: '我的小日子', growth: '我的成长足迹', journal: '我的日记本' };
  return (
    <header className="top-bar">
      <div>
        <p className="eyebrow">{labels[tab]}</p>
        <p className="today-date">{tab === 'today' ? formatFullDate(dateKey()) : saveStatus === 'saving' ? '正在保存…' : '已自动保存在本机'}</p>
      </div>
      <Button className="round-button" variant="ghost" size="icon" aria-label="打开设置" onClick={onOpenSettings}>
        <Settings aria-hidden="true" />
      </Button>
    </header>
  );
}

function TodayView({ state, onAdd, onToggle, onEdit, onOpenDiary }: {
  state: AppState;
  onAdd: () => void;
  onToggle: (id: string, done: boolean) => void;
  onEdit: (task: DailyTask) => void;
  onOpenDiary: () => void;
}) {
  const today = dateKey();
  const tasks = state.dailyTasks.filter((task) => task.date === today);
  const completed = tasks.filter((task) => task.done).length;
  const entry = state.diaries.find((item) => item.date === today);
  return (
    <div className="view-stack">
      <section className="hero-copy">
        <p className="hand-note">今天也要善待自己 ♡</p>
        <h1>今天，也慢慢来</h1>
        <p>不用完美，把想做的小事完成一点就好。</p>
      </section>

      <section className="paper-card today-card" aria-labelledby="today-heading">
        <div className="section-heading">
          <div><p className="section-kicker">TODAY</p><h2 id="today-heading">今日小事</h2></div>
          {!!tasks.length && <span className="progress-stamp"><Check aria-hidden="true" /> {completed} / {tasks.length}</span>}
        </div>
        {tasks.length ? (
          <div className="task-list">
            {tasks.map((task) => (
              <div className={`task-row ${task.done ? 'is-done' : ''}`} key={task.id}>
                <button className="task-check-area" type="button" onClick={() => onToggle(task.id, !task.done)} aria-label={`${task.done ? '取消完成' : '完成'}${task.title}`}>
                  <span className="task-emoji" aria-hidden="true">{task.emoji}</span>
                  <span className="task-title">{task.title}</span>
                </button>
                <Checkbox checked={task.done} onCheckedChange={(checked) => onToggle(task.id, checked === true)} aria-label={`完成${task.title}`} />
                <Button variant="ghost" size="icon-sm" aria-label={`编辑${task.title}`} onClick={() => onEdit(task)}><MoreHorizontal aria-hidden="true" /></Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="gentle-empty"><span>🍵</span><strong>今天还没有安排</strong><p>给自己放一件小事进来吧。</p></div>
        )}
        <Button className="add-today-button" size="lg" onClick={onAdd}><Plus aria-hidden="true" />添加今天要做的事</Button>
      </section>

      <button className="journal-peek" type="button" onClick={onOpenDiary}>
        <span className="journal-peek-icon"><BookHeart aria-hidden="true" /></span>
        <span><small>今天的一页</small><strong>{entry?.body.trim() ? entry.body.slice(0, 16) : '还没有写下日记'}</strong></span>
        <span className="journal-prompt">{entry ? '继续写' : '去写写'} <ChevronRight aria-hidden="true" /></span>
      </button>
      <p className="page-quote">“把平凡的今天，好好收藏起来。”</p>
    </div>
  );
}

function TodayDrawer({ state, open, mode, onModeChange, onOpenChange, onAddTask, onSaveCommon, onDeleteCommon }: {
  state: AppState;
  open: boolean;
  mode: 'add' | 'manage';
  onModeChange: (mode: 'add' | 'manage') => void;
  onOpenChange: (open: boolean) => void;
  onAddTask: (emoji: string, title: string, sourceId?: string) => void;
  onSaveCommon: (item: Pick<CommonItem, 'emoji' | 'title'>, id?: string) => void;
  onDeleteCommon: (item: CommonItem) => void;
}) {
  const [emoji, setEmoji] = useState('🌱');
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState<CommonItem | null>(null);
  function submitTask(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    onAddTask(emoji, title);
    setTitle('');
    onOpenChange(false);
  }
  function submitCommon(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    onSaveCommon({ emoji, title }, editing?.id);
    setTitle('');
    setEmoji('🌱');
    setEditing(null);
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="sheet-drawer">
        <div className="drawer-inner">
          <DrawerHeader>
            <DrawerTitle>{mode === 'add' ? '今天想做什么？' : '管理常用事项'}</DrawerTitle>
            <DrawerDescription>{mode === 'add' ? '点一个常用事项，或写下一件小事。' : '改好的模板以后一点就能加进今天。'}</DrawerDescription>
          </DrawerHeader>
          {mode === 'add' ? (
            <>
              <div className="quick-grid">
                {state.commonItems.map((item) => (
                  <Button key={item.id} variant="outline" className="quick-item" onClick={() => { onAddTask(item.emoji, item.title, item.id); onOpenChange(false); }}>
                    <span>{item.emoji}</span>{item.title}
                  </Button>
                ))}
              </div>
              <p className="or-divider"><span>或者手动填写</span></p>
              <form className="stack-form" onSubmit={submitTask}>
                <div className="emoji-title-fields"><Input aria-label="表情" value={emoji} onChange={(event) => setEmoji(event.target.value.slice(0, 4))} /><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="一行就好，例如：练琴 30 分钟" maxLength={50} /></div>
                <Button type="submit" size="lg" disabled={!title.trim()}>添加到今天</Button>
              </form>
              <Button variant="ghost" className="manage-common" onClick={() => { setTitle(''); onModeChange('manage'); }}>管理常用事项 <ChevronRight aria-hidden="true" /></Button>
            </>
          ) : (
            <>
              <form className="stack-form" onSubmit={submitCommon}>
                <div className="emoji-title-fields"><Input aria-label="表情" value={emoji} onChange={(event) => setEmoji(event.target.value.slice(0, 4))} /><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="常用事项名称" maxLength={30} /></div>
                <Button type="submit" disabled={!title.trim()}>{editing ? '保存修改' : '新增常用事项'}</Button>
              </form>
              <div className="manage-list">
                {state.commonItems.map((item) => (
                  <div className="manage-row" key={item.id}><span>{item.emoji}</span><strong>{item.title}</strong><Button variant="ghost" size="icon-sm" aria-label={`编辑${item.title}`} onClick={() => { setEditing(item); setEmoji(item.emoji); setTitle(item.title); }}><Pencil /></Button><Button variant="ghost" size="icon-sm" aria-label={`删除${item.title}`} onClick={() => onDeleteCommon(item)}><Trash2 /></Button></div>
                ))}
              </div>
              <Button variant="ghost" className="manage-common" onClick={() => onModeChange('add')}><ArrowLeft aria-hidden="true" /> 返回添加今日事项</Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function TaskEditDrawer({ task, onChange, onSave, onDelete }: { task: DailyTask | null; onChange: (task: DailyTask | null) => void; onSave: (event: SyntheticEvent<HTMLFormElement>) => void; onDelete: (task: DailyTask) => void }) {
  return (
    <Drawer open={!!task} onOpenChange={(open) => !open && onChange(null)}>
      <DrawerContent className="sheet-drawer">
        {task && <form className="drawer-inner stack-form" onSubmit={onSave}>
          <DrawerHeader><DrawerTitle>编辑今日事项</DrawerTitle><DrawerDescription>只修改今天这一条，常用事项不会跟着变。</DrawerDescription></DrawerHeader>
          <div className="emoji-title-fields"><Input aria-label="表情" value={task.emoji} onChange={(event) => onChange({ ...task, emoji: event.target.value.slice(0, 4) })} /><Input value={task.title} onChange={(event) => onChange({ ...task, title: event.target.value })} maxLength={50} /></div>
          <Button type="submit" size="lg"><Save aria-hidden="true" />保存修改</Button>
          <Button type="button" variant="ghost" className="danger-text" onClick={() => onDelete(task)}><Trash2 aria-hidden="true" />删除这条</Button>
        </form>}
      </DrawerContent>
    </Drawer>
  );
}

function GrowthView({ state, onAdd, onAdjust, onEdit, onDelete, onArchive, onCopy, onDeleteMemory }: {
  state: AppState;
  onAdd: (kind: GrowthDraft['kind']) => void;
  onAdjust: (id: string, delta: number) => void;
  onEdit: (item: Countdown | ProgressGoal) => void;
  onDelete: (item: Countdown | ProgressGoal) => void;
  onArchive: (goal: ProgressGoal, natural: boolean) => void;
  onCopy: (memory: GrowthMemory) => void;
  onDeleteMemory: (memory: GrowthMemory) => void;
}) {
  return (
    <div className="view-stack growth-view">
      <section className="view-intro"><p className="hand-note">每一步都算数 ✦</p><h1>把想去的地方，<br />一点点走到</h1><p>记下一点，进度就往前走一点。</p></section>
      <section className="growth-actions"><Button onClick={() => onAdd('progress')}><Plus />新建进度</Button><Button variant="outline" onClick={() => onAdd('countdown')}><Clock3 />新建倒计时</Button></section>

      {!!state.countdowns.length && <section><div className="section-heading compact"><div><p className="section-kicker">LOOKING FORWARD</p><h2>期待的日子</h2></div></div><div className="countdown-grid">{state.countdowns.map((item) => {
        const days = daysUntil(item.targetDate);
        return <article className="paper-card countdown-card" key={item.id}><span className="countdown-emoji">{item.emoji}</span><div className="countdown-copy"><small>{formatShortDate(item.targetDate)}</small><strong>{item.title}</strong>{item.note && <p>{item.note}</p>}</div><div className="countdown-number"><b>{Math.abs(days)}</b><span>{days >= 0 ? '天后' : '天前'}</span></div><div className="card-tools"><Button variant="ghost" size="icon-sm" aria-label="编辑倒计时" onClick={() => onEdit(item)}><Pencil /></Button><Button variant="ghost" size="icon-sm" aria-label="删除倒计时" onClick={() => onDelete(item)}><Trash2 /></Button></div></article>;
      })}</div></section>}

      <section><div className="section-heading compact"><div><p className="section-kicker">GROWING</p><h2>正在发生的成长</h2></div></div>
        {state.progressGoals.length ? <div className="goal-list">{state.progressGoals.map((goal) => <ProgressCard key={goal.id} goal={goal} onAdjust={onAdjust} onEdit={onEdit} onDelete={onDelete} onArchive={onArchive} />)}</div> : <div className="gentle-empty roomy"><span>🌱</span><strong>还没有开始的目标</strong><p>比如“这个月跑 30 km”，每次点一下就往前一格。</p><Button variant="outline" onClick={() => onAdd('progress')}><Plus />开始一个</Button></div>}
      </section>

      {!!state.memories.length && <section className="memory-section"><div className="section-heading compact"><div><p className="section-kicker">MEMORIES</p><h2>成长纪念册</h2></div></div><p className="memory-lead">完成得怎样都没关系，有尝试就很棒了。</p><div className="memory-list">{state.memories.map((memory) => <article className="memory-card" key={memory.id}><span>{memory.emoji}</span><div><small>{new Date(memory.endedAt).toLocaleDateString('zh-CN')} 收藏</small><strong>{memory.title}</strong><p>{memory.current} / {memory.total} {memory.unit} · {memory.events.length} 条足迹</p></div><div className="memory-tools"><Button variant="ghost" size="icon-sm" aria-label="复制为新一期" onClick={() => onCopy(memory)}><Copy /></Button><Button variant="ghost" size="icon-sm" aria-label="删除纪念" onClick={() => onDeleteMemory(memory)}><Trash2 /></Button></div></article>)}</div></section>}
    </div>
  );
}

function ProgressCard({ goal, onAdjust, onEdit, onDelete, onArchive }: { goal: ProgressGoal; onAdjust: (id: string, delta: number) => void; onEdit: (item: ProgressGoal) => void; onDelete: (item: ProgressGoal) => void; onArchive: (goal: ProgressGoal, natural: boolean) => void }) {
  const percentage = Math.min(100, Math.round((goal.current / goal.total) * 100));
  return <article className="paper-card progress-card" style={{ '--goal-color': goal.color } as CSSProperties}>
    <div className="goal-top"><span className="goal-emoji">{goal.emoji}</span><div><small>已完成 {percentage}%</small><h3>{goal.title}</h3>{goal.note && <p>{goal.note}</p>}</div><div className="card-tools"><Button variant="ghost" size="icon-sm" aria-label="编辑目标" onClick={() => onEdit(goal)}><Pencil /></Button><Button variant="ghost" size="icon-sm" aria-label="删除目标" onClick={() => onDelete(goal)}><Trash2 /></Button></div></div>
    <div className="goal-number"><strong>{goal.current.toLocaleString()}</strong><span>/ {goal.total.toLocaleString()} {goal.unit}</span></div>
    <div className="goal-progress" aria-label={`进度 ${percentage}%`}><i style={{ width: `${percentage}%` }} /><b style={{ left: `clamp(10px, ${percentage}%, calc(100% - 10px))` }}>{percentage}%</b></div>
    <div className="adjust-row"><Button variant="outline" size="lg" onClick={() => onAdjust(goal.id, -goal.step)} disabled={goal.current <= 0}><Minus />{goal.step}</Button><Button size="lg" onClick={() => onAdjust(goal.id, goal.step)} disabled={goal.current >= goal.total}><Plus />{goal.step} {goal.unit}</Button></div>
    <details className="footsteps"><summary><span><Footprints />我的足迹·{goal.events.length} 次调整</span><ChevronDown /></summary>{goal.events.length ? <ol>{[...goal.events].reverse().map((event) => <li key={event.id}><span>{formatMoment(event.createdAt)}</span><strong className={event.delta >= 0 ? 'positive' : ''}>{event.delta >= 0 ? '+' : ''}{event.delta} {goal.unit}</strong><small>累计 {event.valueAfter}</small></li>)}</ol> : <p>点一次加号，第一条足迹就会留在这里。</p>}</details>
    {goal.current >= goal.total ? <Button className="archive-button" onClick={() => onArchive(goal, true)}><Sparkles />完成了，收进纪念册</Button> : <Button className="finish-early" variant="ghost" onClick={() => onArchive(goal, false)}><Archive />现在结束这段成长</Button>}
  </article>;
}

function GrowthDrawer({ open, draft, onOpenChange, onDraftChange, onSave }: { open: boolean; draft: GrowthDraft; onOpenChange: (open: boolean) => void; onDraftChange: (draft: GrowthDraft) => void; onSave: (event: SyntheticEvent<HTMLFormElement>) => void }) {
  const patch = (next: Partial<GrowthDraft>) => onDraftChange({ ...draft, ...next });
  return <Drawer open={open} onOpenChange={onOpenChange}><DrawerContent className="sheet-drawer tall"><form className="drawer-inner stack-form" onSubmit={onSave}>
    <DrawerHeader><DrawerTitle>{draft.id ? '编辑' : '新建'}{draft.kind === 'progress' ? '进度目标' : '倒计时'}</DrawerTitle><DrawerDescription>{draft.kind === 'progress' ? '数字每次变动都会自动留下足迹。' : '把值得期待的日子放在手边。'}</DrawerDescription></DrawerHeader>
    {!draft.id && <div className="segmented"><button type="button" className={draft.kind === 'progress' ? 'active' : ''} onClick={() => patch({ kind: 'progress' })}>进度</button><button type="button" className={draft.kind === 'countdown' ? 'active' : ''} onClick={() => patch({ kind: 'countdown' })}>倒计时</button></div>}
    <label className="field-label">名称<div className="emoji-title-fields"><Input aria-label="表情" value={draft.emoji} onChange={(event) => patch({ emoji: event.target.value.slice(0, 4) })} /><Input value={draft.title} onChange={(event) => patch({ title: event.target.value })} placeholder={draft.kind === 'progress' ? '例如：九月跑量' : '例如：去看演出'} maxLength={40} /></div></label>
    {draft.kind === 'countdown' ? <label className="field-label">目标日期<Input type="date" min={dateKey()} value={draft.targetDate} onChange={(event) => patch({ targetDate: event.target.value })} /></label> : <div className="number-fields"><label className="field-label">当前<Input type="number" min="0" step="any" value={draft.current} onChange={(event) => patch({ current: event.target.value })} /></label><label className="field-label">总目标<Input type="number" min="0.01" step="any" value={draft.total} onChange={(event) => patch({ total: event.target.value })} /></label><label className="field-label">单位<Input value={draft.unit} onChange={(event) => patch({ unit: event.target.value })} maxLength={8} /></label><label className="field-label">每次调整<Input type="number" min="0.01" step="any" value={draft.step} onChange={(event) => patch({ step: event.target.value })} /></label></div>}
    {draft.kind === 'progress' && <fieldset className="color-picker"><legend>卡片颜色</legend>{(['#E799B0', '#DB7D74', '#576690'] as ProgressGoal['color'][]).map((color) => <button key={color} type="button" className={draft.color === color ? 'active' : ''} style={{ background: color }} aria-label={`选择颜色 ${color}`} onClick={() => patch({ color })} />)}</fieldset>}
    <label className="field-label">一句说明（可选）<Input value={draft.note} onChange={(event) => patch({ note: event.target.value })} maxLength={80} placeholder="写给自己看就好" /></label>
    <Button type="submit" size="lg" disabled={!draft.title.trim()}><Save />{draft.id ? '保存修改' : '开始记录'}</Button>
  </form></DrawerContent></Drawer>;
}

function JournalView({ state, selectedDate, onDateChange, onUpdate, onAddPhotos, onRemovePhoto, onDelete, saveStatus }: { state: AppState; selectedDate: string; onDateChange: (date: string) => void; onUpdate: (date: string, patch: Partial<DiaryEntry>) => void; onAddPhotos: (date: string, files: FileList | null) => void; onRemovePhoto: (date: string, id: string) => void; onDelete: (entry: DiaryEntry) => void; saveStatus: 'saved' | 'saving' }) {
  const entry = state.diaries.find((item) => item.date === selectedDate);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(fromDateKey(selectedDate));
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const photoIds = entry?.photoIds ?? [];
  const photoKey = photoIds.join('|');
  useEffect(() => {
    let alive = true;
    const urls: string[] = [];
    const ids = photoKey ? photoKey.split('|') : [];
    void getPhotos(ids).then((photos) => {
      if (!alive) return;
      const map: Record<string, string> = {};
      photos.forEach((photo) => { const url = URL.createObjectURL(photo.blob); urls.push(url); map[photo.id] = url; });
      setPhotoUrls(map);
    }).catch(() => setPhotoUrls({}));
    return () => { alive = false; urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [photoKey]);
  const mood = entry?.mood ?? '';
  return <div className="view-stack journal-view">
    <section className="journal-date-nav"><Button variant="ghost" size="icon" aria-label="前一天" onClick={() => onDateChange(moveDate(selectedDate, -1))}><ArrowLeft /></Button><button className="journal-date-trigger" type="button" onClick={() => { setCalendarMonth(fromDateKey(selectedDate)); setCalendarOpen(true); }}><CalendarDays aria-hidden="true" /><span><strong>{formatFullDate(selectedDate)}</strong><small>{selectedDate === dateKey() ? '今天 · 点开月历' : '点开月历查看过去'}</small></span></button><Button variant="ghost" size="icon" aria-label="后一天" disabled={selectedDate >= dateKey()} onClick={() => onDateChange(moveDate(selectedDate, 1))}><ArrowRight /></Button></section>
    <Drawer open={calendarOpen} onOpenChange={setCalendarOpen}><DrawerContent className="sheet-drawer calendar-drawer"><div className="drawer-inner"><DrawerHeader><DrawerTitle>翻一翻以前的日记</DrawerTitle><DrawerDescription>有粉色小点的日子已经留下过记录。</DrawerDescription></DrawerHeader><Calendar mode="single" locale={zhCN} selected={fromDateKey(selectedDate)} month={calendarMonth} onMonthChange={setCalendarMonth} disabled={{ after: fromDateKey(dateKey()) }} modifiers={{ hasDiary: state.diaries.filter((item) => item.body || item.mood || item.photoIds.length).map((item) => fromDateKey(item.date)) }} modifiersClassNames={{ hasDiary: 'has-diary' }} onSelect={(date) => { if (!date) return; onDateChange(dateKey(date)); setCalendarOpen(false); }} /><RecentDiaryList entries={state.diaries} onSelect={(date) => { onDateChange(date); setCalendarOpen(false); }} /></div></DrawerContent></Drawer>
    <section className="journal-title"><p className="hand-note">DEAR DIARY ♡</p><h1>{selectedDate === dateKey() ? '今天过得怎么样？' : `${formatShortDate(selectedDate)}，那天的我`}</h1><p>{saveStatus === 'saving' ? '正在保存…' : '文字会自动保存在这台设备上'}</p></section>
    <section className="mood-section"><h2>先选一个今天的心情</h2><div className="mood-row">{moodOptions.map((option) => <button key={option.value} type="button" className={mood === option.value ? 'active' : ''} onClick={() => onUpdate(selectedDate, { mood: option.value })}><span>{option.emoji}</span><small>{option.label}</small></button>)}</div></section>
    <section className="journal-paper"><textarea value={entry?.body ?? ''} onChange={(event) => onUpdate(selectedDate, { body: event.target.value })} placeholder="今天发生了什么？\n\n高兴的、普通的、有点狼狈的都可以写下来…" maxLength={12000} aria-label="日记正文" /><span className="journal-word-count">{entry?.body.length ?? 0} 字</span></section>
    <section className="photo-section"><div className="photo-heading"><div><h2>今天的画面</h2><p>最多 9 张，只保存在本机。</p></div><label className="photo-add"><Camera /><span>添加照片</span><input type="file" accept="image/*" multiple onChange={(event) => { onAddPhotos(selectedDate, event.target.files); event.target.value = ''; }} /></label></div>{photoIds.length > 0 && <div className="photo-grid">{photoIds.map((id) => <figure key={id}>{photoUrls[id] ? <Image src={photoUrls[id]} alt="日记照片" fill sizes="(max-width: 560px) 30vw, 160px" unoptimized /> : <span className="photo-loading"><ImageIcon /></span>}<Button variant="secondary" size="icon-sm" aria-label="删除照片" onClick={() => onRemovePhoto(selectedDate, id)}><X /></Button></figure>)}</div>}</section>
    <BilibiliTags />
    {entry && (entry.body || entry.mood || entry.photoIds.length) && <Button variant="ghost" className="danger-text journal-delete" onClick={() => onDelete(entry)}><Trash2 />删除这一页日记</Button>}
  </div>;
}

function RecentDiaryList({ entries, onSelect }: { entries: DiaryEntry[]; onSelect: (date: string) => void }) {
  const recent = entries
    .filter((entry) => entry.body.trim() || entry.mood || entry.photoIds.length)
    .sort((first, second) => second.date.localeCompare(first.date))
    .slice(0, 5);
  return <section className="recent-diaries"><h3>最近写过</h3>{recent.length ? <div>{recent.map((entry) => { const mood = moodOptions.find((item) => item.value === entry.mood); return <button type="button" key={entry.date} onClick={() => onSelect(entry.date)}><span>{mood?.emoji ?? '📖'}</span><span><strong>{formatFullDate(entry.date)}</strong><small>{entry.body.trim().slice(0, 24) || (entry.photoIds.length ? `${entry.photoIds.length} 张照片` : mood?.label)}</small></span><ChevronRight /></button>; })}</div> : <p>还没有过去的日记。写下第一页后，它会留在这里。</p>}</section>;
}

function BilibiliTags() {
  const tags = [
    { name: '贝极星空间站的日常', href: 'https://www.bilibili.com/v/topic/detail?topic_id=32780', color: 'bella' },
    { name: '嘉心糖的手帐本', href: 'https://www.bilibili.com/v/topic/detail?topic_id=36443', color: 'jiaran' },
    { name: '乃琳夸夸群', href: 'https://www.bilibili.com/v/topic/detail?topic_id=9825', color: 'nailin' },
  ];
  return <section className="bili-tags"><p className="section-kicker">SHARE YOUR DAY</p><h2>也可以去 B 站留下今天</h2><div>{tags.map((tag) => <a className={tag.color} href={tag.href} target="_blank" rel="noreferrer" key={tag.href}><Heart />{tag.name}<ChevronRight /></a>)}</div></section>;
}

function SettingsDrawer({ state, open, onOpenChange, onStateChange, onExport, onImport, onClear, onInstall }: { state: AppState; open: boolean; onOpenChange: (open: boolean) => void; onStateChange: (state: AppState) => void; onExport: () => void; onImport: (event: ChangeEvent<HTMLInputElement>) => void; onClear: () => void; onInstall: () => void }) {
  const setSettings = (patch: Partial<AppState['settings']>) => onStateChange({ ...state, settings: { ...state.settings, ...patch } });
  return <Drawer open={open} onOpenChange={onOpenChange}><DrawerContent className="sheet-drawer tall"><div className="drawer-inner settings-sheet">
    <DrawerHeader><DrawerTitle>这本日记的样子</DrawerTitle><DrawerDescription>选择温馨纸张，或让一张收藏壁纸陪着你记录。</DrawerDescription></DrawerHeader>
    <section className="settings-section"><h3>主题</h3><button type="button" className={`paper-theme-card ${state.settings.theme === 'paper' ? 'active' : ''}`} onClick={() => setSettings({ theme: 'paper' })}><span><i /><i /><i /></span><div><strong>温馨日记</strong><small>默认线稿纸与装订孔</small></div>{state.settings.theme === 'paper' && <Check />}</button><p className="wallpaper-label">或者选一张收藏壁纸</p><div className="wallpaper-grid">{WALLPAPERS.map((wallpaper, index) => <button type="button" key={wallpaper} className={state.settings.theme === 'wallpaper' && state.settings.wallpaper === wallpaper ? 'active' : ''} onClick={() => setSettings({ theme: 'wallpaper', wallpaper })}><Image src={wallpaper} alt={`壁纸 ${index + 1}`} fill sizes="(max-width: 560px) 30vw, 170px" unoptimized />{state.settings.theme === 'wallpaper' && state.settings.wallpaper === wallpaper && <Check />}</button>)}</div><p className="setting-note">壁纸只作为远景，记录内容仍放在清晰纸张上，不会影响阅读。</p></section>
    <section className="settings-section"><h3>安装与反馈</h3><Button variant="outline" className="settings-wide" onClick={onInstall}><Smartphone />安装到手机桌面</Button><label className="toggle-row"><span><strong>轻微振动反馈</strong><small>打勾和记录进度时轻轻回应</small></span><input type="checkbox" checked={state.settings.haptics} onChange={(event) => setSettings({ haptics: event.target.checked })} /></label></section>
    <section className="settings-section"><h3>本地数据</h3><p className="setting-note">所有文字和照片都在这台设备的浏览器中。清理浏览器或换手机前，请下载备份。</p><div className="settings-buttons"><Button onClick={onExport}><Download />下载完整备份</Button><label className="import-button"><FileUp />恢备备份<input type="file" accept="application/json,.json" onChange={onImport} /></label></div><Button variant="ghost" className="danger-text settings-wide" onClick={onClear}><Trash2 />清空全部数据</Button></section>
    <footer className="settings-footer"><strong>Asoul一个魂生活日记 v3</strong><span>第三代数据结构 · 不读取 v2 数据</span></footer>
  </div></DrawerContent></Drawer>;
}

function BottomNav({ active, onChange }: { active: AppTab; onChange: (tab: AppTab) => void }) {
  const items: { id: AppTab; label: string; icon: typeof CalendarDays }[] = [
    { id: 'today', label: '今日', icon: CalendarDays },
    { id: 'growth', label: '成长', icon: Sprout },
    { id: 'journal', label: '日记', icon: BookHeart },
  ];
  return <nav className="bottom-nav" aria-label="主要页面">{items.map((item) => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${active === item.id ? 'is-active' : ''}`} type="button" onClick={() => onChange(item.id)}><Icon /><span>{item.label}</span></button>; })}</nav>;
}
