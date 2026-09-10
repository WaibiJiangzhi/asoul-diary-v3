import { useState } from 'react';
import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  SyntheticEvent,
} from 'react';

import type { Confirmation } from '@/components/diary/confirm-dialog';
import {
  createEmptyGrowthDraft,
  type GrowthDraft,
} from '@/components/diary/constants';
import { ACCENT_COLORS, createId } from '@/lib/defaults';
import { dateKey, moveDate } from '@/lib/date';
import { adjustProgressEntry } from '@/lib/progress';
import {
  canRecordChallenge,
  challengeMilestone,
  clearChallengeDay,
  recordStates,
  isDateKey,
  progressEventLabel,
  rebuildChallenge,
  recordChallengeDay,
  type ChallengeOutcome,
} from '@/lib/challenge';
import type {
  AppState,
  Countdown,
  CountdownNote,
  GrowthMemory,
  ProgressEvent,
  ProgressGoal,
} from '@/lib/types';
import type { ShowToast } from '@/hooks/use-toast';

interface GrowthControllerOptions {
  state: AppState | null;
  stateRef: MutableRefObject<AppState | null>;
  setState: Dispatch<SetStateAction<AppState | null>>;
  showToast: ShowToast;
  haptic: () => void;
  softChime: (kind: 'check' | 'progress' | 'celebrate') => void;
  askConfirmation: (confirmation: Confirmation) => void;
}

export function useGrowthController({
  state,
  stateRef,
  setState,
  showToast,
  haptic,
  softChime,
  askConfirmation,
}: GrowthControllerOptions) {
  const [growthOpen, setGrowthOpen] = useState(false);
  const [growthDraft, setGrowthDraft] = useState<GrowthDraft>(
    createEmptyGrowthDraft,
  );

  function openNewGrowth(kind: GrowthDraft['kind']) {
    const fresh = createEmptyGrowthDraft();
    const color = ACCENT_COLORS[stateRef.current?.settings.accent ?? 'jiaran'];
    setGrowthDraft({
      ...fresh,
      states: fresh.states.map((status, index) =>
        index === 0 ? { ...status, color } : status,
      ),
      kind,
      color: ACCENT_COLORS[stateRef.current?.settings.accent ?? 'jiaran'],
    });
    setGrowthOpen(true);
  }

  function openEditGrowth(item: Countdown | ProgressGoal) {
    setGrowthDraft(
      item.kind === 'countdown'
        ? {
            ...createEmptyGrowthDraft(),
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
            ...createEmptyGrowthDraft(),
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
            mode: item.challenge ? 'challenge' : 'counter',
            expectedDateEnabled: !!item.expectedDate,
            expectedDate: item.expectedDate ?? moveDate(dateKey(), 30),
            startDate: item.challenge?.startDate ?? dateKey(),
            states: recordStates(item).map((status) => ({ ...status })),
            targetStateId:
              item.challenge?.targetStateId ?? recordStates(item)[0].id,
            targetEnabled: item.challenge?.targetDays !== undefined,
            targetDays: String(
              item.challenge?.targetDays ?? Math.min(20, item.total),
            ),
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
        emoji: growthDraft.emoji.trim(),
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
      const isChallenge = growthDraft.mode === 'challenge';
      if (
        !isChallenge &&
        growthDraft.expectedDateEnabled &&
        !isDateKey(growthDraft.expectedDate)
      ) {
        showToast('请选择一个期望完成日期');
        return;
      }
      const total = Math.max(0.01, Number(growthDraft.total) || 1);
      const currentValue = Math.max(0, Number(growthDraft.current) || 0);
      const previous = state?.progressGoals.find(
        (entry) => entry.id === growthDraft.id,
      );
      if (
        isChallenge &&
        (!Number.isInteger(total) ||
          total < 1 ||
          total > 3650 ||
          !isDateKey(growthDraft.startDate))
      ) {
        showToast('请填写有效的开始日期和 1–3650 天的记录时长');
        return;
      }
      const targetDays = growthDraft.targetEnabled
        ? Number(growthDraft.targetDays)
        : undefined;
      if (
        isChallenge &&
        targetDays !== undefined &&
        (!Number.isInteger(targetDays) || targetDays < 1 || targetDays > total)
      ) {
        showToast('期待天数需要在 1 天到记录总天数之间');
        return;
      }
      if (
        isChallenge &&
        previous?.events.some(
          (entry) =>
            entry.outcome &&
            entry.date &&
            (entry.date < growthDraft.startDate ||
              entry.date > moveDate(growthDraft.startDate, total - 1)),
        )
      ) {
        showToast('调整后的日期范围需要包含已记录的日子');
        return;
      }
      if (
        isChallenge &&
        (growthDraft.states.length < 1 ||
          growthDraft.states.length > 4 ||
          growthDraft.states.some((status) => !status.name.trim()) ||
          new Set(growthDraft.states.map((status) => status.name.trim()))
            .size !== growthDraft.states.length)
      ) {
        showToast('请设置 1–4 种名称不同的状态');
        return;
      }
      if (
        isChallenge &&
        previous?.events.some(
          (entry) =>
            entry.outcome &&
            !growthDraft.states.some((status) => status.id === entry.outcome),
        )
      ) {
        showToast('已有记录的状态需要保留，可以修改名称和表情');
        return;
      }
      if (
        isChallenge &&
        growthDraft.targetEnabled &&
        !growthDraft.states.some(
          (status) => status.id === growthDraft.targetStateId,
        )
      ) {
        showToast('请选择期待积累的状态');
        return;
      }
      const events = [...(previous?.events ?? [])];
      if (
        isChallenge &&
        previous &&
        previous.note !== growthDraft.note.trim()
      ) {
        events.push({
          id: createId('event'),
          delta: 0,
          valueAfter: previous.current,
          note: `约定调整：${previous.note || '未填写'} → ${growthDraft.note.trim() || '未填写'}`,
          createdAt: now,
        });
      }
      const item: ProgressGoal = {
        id: growthDraft.id ?? createId('goal'),
        kind: 'progress',
        emoji: growthDraft.emoji.trim(),
        title: growthDraft.title.trim(),
        current: isChallenge ? (previous?.current ?? 0) : currentValue,
        total,
        unit: isChallenge ? '天' : growthDraft.unit.trim() || '次',
        step: isChallenge ? 1 : Math.max(0.01, Number(growthDraft.step) || 1),
        note: growthDraft.note.trim(),
        color: growthDraft.color,
        events,
        expectedDate:
          !isChallenge && growthDraft.expectedDateEnabled
            ? growthDraft.expectedDate
            : undefined,
        challenge: isChallenge
          ? {
              startDate: growthDraft.startDate,
              states: growthDraft.states.map((status) => ({
                ...status,
                name: status.name.trim(),
              })),
              targetStateId: growthDraft.targetEnabled
                ? growthDraft.targetStateId
                : undefined,
              targetCelebrated:
                previous?.challenge?.targetStateId ===
                  growthDraft.targetStateId &&
                previous.challenge.targetDays === targetDays
                  ? previous.challenge.targetCelebrated
                  : false,
              targetDays,
            }
          : undefined,
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

  function adjustProgress(
    goalId: string,
    requestedDelta: number,
    note = '',
    date = dateKey(),
  ) {
    if (
      !Number.isFinite(requestedDelta) ||
      (requestedDelta === 0 && !note.trim())
    )
      return;
    const previous = stateRef.current?.progressGoals.find(
      (goal) => goal.id === goalId,
    );
    if (!previous) return;
    if (previous.challenge && requestedDelta !== 0) return;
    if (
      !isDateKey(date) ||
      date > dateKey() ||
      (previous.challenge && !canRecordChallenge(previous, date))
    ) {
      showToast('请选择可记录的日期');
      return;
    }
    const projected = Math.max(
      0,
      Number((previous.current + requestedDelta).toFixed(4)),
    );
    const actuallyCompleted =
      previous.current < previous.total && projected >= previous.total;
    setState((current) => {
      if (!current) return current;
      return {
        ...current,
        progressGoals: current.progressGoals.map((goal) => {
          if (goal.id !== goalId) return goal;
          return adjustProgressEntry(
            goal,
            requestedDelta,
            note,
            date,
            createId('event'),
            new Date().toISOString(),
          );
        }),
      };
    });
    haptic();
    if (requestedDelta > 0)
      softChime(actuallyCompleted ? 'celebrate' : 'progress');
    showToast(
      requestedDelta === 0
        ? '这句话已留下，进度保持不变'
        : actuallyCompleted
          ? '到达目标了！这段成长值得收藏 🎉'
          : note.trim()
            ? '这一步和一句话都记下了'
            : '已记下这一步成长',
    );
  }

  function recordChallenge(
    goalId: string,
    date: string,
    outcome: ChallengeOutcome | null,
    note = '',
  ) {
    const previous = stateRef.current?.progressGoals.find(
      (goal) => goal.id === goalId,
    );
    if (
      !previous ||
      !canRecordChallenge(previous, date) ||
      (outcome !== null &&
        !recordStates(previous).some((status) => status.id === outcome))
    ) {
      showToast('请选择开始日期之后、今天及以前的日期');
      return;
    }
    const original = previous.events.find(
      (entry) => entry.date === date && entry.outcome,
    );
    const now = new Date().toISOString();
    const id = createId('event');
    const update = (goal: ProgressGoal) =>
      outcome === null
        ? clearChallengeDay(goal, date, now)
        : recordChallengeDay(goal, date, outcome, note, id, now);
    const next = update(previous);
    if (next === previous) return;
    const previousDay = previous.events.filter((event) => event.date === date);
    const nextDay = JSON.stringify(
      next.events.filter((event) => event.date === date),
    );
    const milestone = challengeMilestone(previous, next);
    setState(
      (current) =>
        current && {
          ...current,
          progressGoals: current.progressGoals.map((goal) =>
            goal.id === goalId ? update(goal) : goal,
          ),
        },
    );
    haptic();
    if (outcome !== null) softChime(milestone ? 'celebrate' : 'check');
    showToast(
      outcome === null
        ? '已取消这天的状态，文字足迹仍保留'
        : milestone
          ? milestone === 'target'
            ? '积累到了期待的天数，这段成长值得庆祝 ✨'
            : '每一天都留下记录了，这段成长值得庆祝 ✨'
          : original
            ? '这一天的记录已修改'
            : '这一天也好好记下了 ✨',
      () => {
        setState(
          (current) =>
            current && {
              ...current,
              progressGoals: current.progressGoals.map((goal) => {
                if (goal.id !== goalId) return goal;
                if (
                  JSON.stringify(
                    goal.events.filter((event) => event.date === date),
                  ) !== nextDay
                )
                  return goal;
                return rebuildChallenge({
                  ...goal,
                  updatedAt: new Date().toISOString(),
                  events: [
                    ...goal.events.filter((entry) => entry.date !== date),
                    ...previousDay,
                  ],
                });
              }),
            },
        );
      },
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
      showToast(direction < 0 ? '已经在最左边了' : '已经在最右边了');
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
    showToast(direction < 0 ? '卡片已向左移动' : '卡片已向右移动');
  }

  function deleteProgressEvent(goal: ProgressGoal, event: ProgressEvent) {
    const nextValue = Math.max(
      0,
      Number((goal.current - event.delta).toFixed(4)),
    );
    askConfirmation({
      title: '删除这条成长足迹？',
      description: goal.challenge
        ? `“${progressEventLabel(goal, event)}”会被移除${event.outcome ? '，这一天恢复为未记录' : '，每日记录保持不变'}。`
        : event.delta === 0
          ? '这条文字足迹会被移除，当前进度保持不变。'
          : `${event.delta >= 0 ? '+' : ''}${event.delta} ${goal.unit} 会从记录中移除，当前进度将从 ${goal.current} ${goal.unit} 调整为 ${nextValue} ${goal.unit}。`,
      confirmLabel: '删除足迹',
      destructive: true,
      action: () => {
        setState((current) => {
          if (!current) return current;
          return {
            ...current,
            progressGoals: current.progressGoals.map((item) => {
              if (item.id !== goal.id) return item;
              if (item.challenge)
                return rebuildChallenge({
                  ...item,
                  events: item.events.filter((entry) => entry.id !== event.id),
                  updatedAt: new Date().toISOString(),
                });
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
                  running = Math.max(
                    0,
                    Number((running + entry.delta).toFixed(4)),
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

  function archiveGrowth(
    item: Countdown | ProgressGoal,
    completedNaturally: boolean,
    confirmed = false,
  ) {
    if (!completedNaturally && !confirmed) {
      askConfirmation({
        title:
          item.kind === 'countdown'
            ? '提前结束这个倒计时？'
            : '现在结束这段成长？',
        description:
          item.kind === 'countdown'
            ? '它会连同日子手记一起收进成长纪念册，之后也可以恢复。'
            : '它会按目前的进度收进成长纪念册，之后也可以恢复。',
        confirmLabel: '结束并收藏',
        action: () => archiveGrowth(item, false, true),
      });
      return;
    }
    const memory: GrowthMemory =
      item.kind === 'progress'
        ? {
            id: createId('memory'),
            kind: 'progress',
            sourceGoalId: item.id,
            emoji: item.emoji,
            title: item.title,
            current: item.current,
            total: item.total,
            unit: item.unit,
            note: item.note,
            color: item.color,
            completedNaturally,
            startedAt: item.createdAt,
            endedAt: new Date().toISOString(),
            events: item.events,
            challenge: item.challenge,
            expectedDate: item.expectedDate,
          }
        : {
            id: createId('memory'),
            kind: 'countdown',
            sourceCountdownId: item.id,
            emoji: item.emoji,
            title: item.title,
            targetDate: item.targetDate,
            note: item.note,
            notes: item.notes,
            color: item.color,
            startedAt: item.createdAt,
            endedAt: new Date().toISOString(),
            endedEarly: !completedNaturally,
          };
    setState(
      (current) =>
        current && {
          ...current,
          progressGoals:
            item.kind === 'progress'
              ? current.progressGoals.filter((entry) => entry.id !== item.id)
              : current.progressGoals,
          countdowns:
            item.kind === 'countdown'
              ? current.countdowns.filter((entry) => entry.id !== item.id)
              : current.countdowns,
          memories: [memory, ...current.memories],
        },
    );
    haptic();
    showToast('已收进成长纪念册 · 有尝试就很棒了');
  }

  function copyMemory(memory: GrowthMemory) {
    const now = new Date().toISOString();
    setState((current) => {
      if (!current) return current;
      if (memory.kind === 'countdown') {
        const originalDays = Math.max(
          1,
          Math.ceil(
            (new Date(`${memory.targetDate}T00:00:00`).getTime() -
              new Date(
                `${dateKey(new Date(memory.startedAt))}T00:00:00`,
              ).getTime()) /
              86_400_000,
          ),
        );
        const countdown: Countdown = {
          id: createId('countdown'),
          kind: 'countdown',
          emoji: memory.emoji,
          title: memory.title,
          targetDate: moveDate(dateKey(), originalDays),
          note: memory.note,
          notes: [],
          color: memory.color,
          createdAt: now,
          updatedAt: now,
        };
        return { ...current, countdowns: [...current.countdowns, countdown] };
      }
      const goal: ProgressGoal = {
        id: createId('goal'),
        kind: 'progress',
        emoji: memory.emoji,
        title: memory.title,
        current: 0,
        total: memory.total,
        unit: memory.unit,
        step: memory.challenge
          ? 1
          : Math.max(0.01, Math.abs(memory.events.at(-1)?.delta ?? 1)),
        note: memory.note,
        color: memory.color,
        events: [],
        challenge: memory.challenge
          ? {
              ...memory.challenge,
              startDate: dateKey(),
              targetCelebrated: false,
            }
          : undefined,
        createdAt: now,
        updatedAt: now,
      };
      return { ...current, progressGoals: [...current.progressGoals, goal] };
    });
    showToast('已复制为新的一期');
  }

  function restoreMemory(memory: GrowthMemory) {
    setState((current) => {
      if (!current) return current;
      if (memory.kind === 'countdown') {
        const restored: Countdown = {
          id: memory.sourceCountdownId,
          kind: 'countdown',
          emoji: memory.emoji,
          title: memory.title,
          targetDate: memory.targetDate,
          note: memory.note,
          notes: memory.notes,
          color: memory.color,
          createdAt: memory.startedAt,
          updatedAt: new Date().toISOString(),
        };
        return {
          ...current,
          countdowns: [...current.countdowns, restored],
          memories: current.memories.filter((entry) => entry.id !== memory.id),
        };
      }
      const restored: ProgressGoal = {
        id: memory.sourceGoalId,
        kind: 'progress',
        emoji: memory.emoji,
        title: memory.title,
        current: memory.current,
        total: memory.total,
        unit: memory.unit,
        step: memory.challenge
          ? 1
          : Math.max(0.01, Math.abs(memory.events.at(-1)?.delta ?? 1)),
        note: memory.note,
        color: memory.color,
        events: memory.events,
        challenge: memory.challenge,
        expectedDate: memory.expectedDate,
        createdAt: memory.startedAt,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...current,
        progressGoals: [...current.progressGoals, restored],
        memories: current.memories.filter((entry) => entry.id !== memory.id),
      };
    });
    showToast('已恢复到正在发生的成长');
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

  return {
    growthOpen,
    setGrowthOpen,
    growthDraft,
    setGrowthDraft,
    openNewGrowth,
    openEditGrowth,
    saveGrowth,
    adjustProgress,
    recordChallenge,
    addCountdownNote,
    deleteCountdownNote,
    moveGrowth,
    deleteProgressEvent,
    deleteGrowth,
    archiveGrowth,
    copyMemory,
    restoreMemory,
    deleteMemory,
  };
}
