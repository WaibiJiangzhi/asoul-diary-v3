import {
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import { createId } from '@/lib/defaults';
import { getCommonCards, restartLifeCard } from '@/lib/card-templates';
import { dateKey } from '@/lib/date';
import {
  completed,
  reachedMilestone,
  saveLifeRecord,
  stageRecord,
  statusRecord,
  canRecord,
} from '@/lib/life';
import { dataGeneration, deletePhotos, storePhotos } from '@/lib/db';
import { validateState } from '@/lib/backup-validation';
import type { AppState, LifeCard, LifeRecord } from '@/lib/types';
import type { Confirmation } from '@/components/diary/confirm-dialog';
import type { ShowToast } from './use-toast';
export function useLifeController({
  stateRef,
  setState,
  showToast,
  haptic,
  softChime,
  askConfirmation,
  preview = false,
}: {
  stateRef: MutableRefObject<AppState | null>;
  setState: Dispatch<SetStateAction<AppState | null>>;
  showToast: ShowToast;
  haptic: () => void;
  softChime: (kind: 'check' | 'progress' | 'celebrate') => void;
  askConfirmation: (c: Confirmation) => void;
  preview?: boolean;
}) {
  const [celebration, setCelebration] = useState<{
    id: string;
    title: string;
  } | null>(null);
  function updateCard(
    id: string,
    change: (card: LifeCard) => LifeCard,
    feedback = false,
  ) {
    const state = stateRef.current;
    const before = state?.cards.find((c) => c.id === id);
    if (!state || !before) return;
    const after = change(before);
    setState({
      ...state,
      cards: state.cards.map((c) => (c.id === id ? after : c)),
    });
    if (feedback) {
      haptic();
      if (reachedMilestone(before, after)) {
        softChime('celebrate');
        setCelebration({
          id: createId('celebrate'),
          title: completed(after)
            ? '这一步，真的做到了'
            : '这一段日子，都记下来了',
        });
      } else softChime('check');
    }
  }
  function saveCard(draft: LifeCard) {
    const state = stateRef.current;
    if (!state) return;
    const before = state.cards.find((c) => c.id === draft.id);
    const card = {
      ...draft,
      title: draft.title.trim(),
      note: draft.note.trim(),
      records: before?.records ?? draft.records,
      updatedAt: new Date().toISOString(),
    };
    if (card.records.some((r) => r.date < card.startDate))
      throw new Error('开始日期需要包含已有记录');
    if (card.record?.periodDays) {
      const end = new Date(card.startDate + 'T12:00:00');
      end.setDate(end.getDate() + card.record.periodDays - 1);
      if (card.records.some((r) => r.statusId && r.date > dateKey(end)))
        throw new Error('记录周期需要包含已记录的日子');
    }
    const next = {
      ...state,
      cards: before
        ? state.cards.map((c) => (c.id === card.id ? card : c))
        : [...state.cards, card],
    };
    validateState(next);
    setState(next);
    showToast(before ? '卡片已更新' : '新的一段生活，开始了');
  }
  async function saveRecord(
    cardId: string,
    record: LifeRecord,
    files: File[] = [],
  ) {
    const generation = dataGeneration();
    const before = stateRef.current?.cards.find((c) => c.id === cardId);
    if (!before) throw new Error('这张卡片已经不存在了');
    saveLifeRecord(before, record);
    if (preview && files.length)
      throw new Error('示例页不保存照片，请返回生活页添加');
    const added = files.length ? await storePhotos(files) : [];
    if (generation !== dataGeneration())
      throw new Error('数据已替换，请重新打开记录');
    const latest = stateRef.current?.cards.find((c) => c.id === cardId);
    if (!latest) throw new Error('这张卡片已经不存在了');
    const old = latest.records.find((r) => r.id === record.id);
    const removed =
      old?.photoIds.filter((id) => !record.photoIds.includes(id)) ?? [];
    if (removed.length && !preview) await deletePhotos(removed);
    if (generation !== dataGeneration())
      throw new Error('数据已替换，请重新打开记录');
    updateCard(
      cardId,
      (c) =>
        saveLifeRecord(c, {
          ...record,
          photoIds: [...record.photoIds, ...added.map((p) => p.id)],
        }),
      true,
    );
    showToast('已经记下了');
  }
  function quickStatus(cardId: string, date: string, statusId: string) {
    try {
      updateCard(
        cardId,
        (c) => {
          const old = statusRecord(c, date);
          const now = new Date().toISOString();
          return saveLifeRecord(c, {
            ...old,
            id: old?.id ?? createId('record'),
            date,
            body: old?.body ?? '',
            photoIds: old?.photoIds ?? [],
            createdAt: old?.createdAt ?? now,
            updatedAt: now,
            statusId: old?.statusId === statusId ? undefined : statusId,
          });
        },
        true,
      );
    } catch (e) {
      showToast((e as Error).message);
    }
  }
  function setStage(
    cardId: string,
    stageId: string,
    done: boolean,
    emoji = '',
  ) {
    try {
      updateCard(
        cardId,
        (c) => {
          const now = new Date().toISOString();
          const previous = stageRecord(c, stageId);
          const existing =
            previous?.stageDone === done && previous.date === dateKey()
              ? previous
              : undefined;
          return saveLifeRecord(c, {
            ...existing,
            id: existing?.id ?? createId('record'),
            date: dateKey(),
            body: existing?.body ?? '',
            photoIds: existing?.photoIds ?? [],
            stageId,
            stageDone: done,
            stageEmoji: done ? emoji : undefined,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          });
        },
        true,
      );
    } catch (e) {
      showToast((e as Error).message);
    }
  }
  function adjustProgress(cardId: string, direction: -1 | 1) {
    try {
      updateCard(
        cardId,
        (card) => {
          if (card.kind !== 'progress' || !card.progress)
            throw new Error('这张卡片不能调整数量');
          const now = new Date().toISOString();
          return saveLifeRecord(card, {
            id: createId('record'),
            date: dateKey(),
            body: '',
            photoIds: [],
            delta: direction * card.progress.step,
            createdAt: now,
            updatedAt: now,
          });
        },
        true,
      );
    } catch (e) {
      showToast((e as Error).message);
    }
  }
  function saveCommonCard(draft: LifeCard) {
    const state = stateRef.current;
    if (!state) return;
    const card = {
      ...draft,
      records: [],
      title: draft.title.trim(),
      note: draft.note.trim(),
      updatedAt: new Date().toISOString(),
    };
    const current = getCommonCards(state);
    const next = {
      ...state,
      commonCards: current.some((c) => c.id === card.id)
        ? current.map((c) => (c.id === card.id ? card : c))
        : [...current, card],
    };
    validateState(next);
    setState(next);
    showToast('常用卡片已保存');
  }
  function removeCommonCard(id: string) {
    setState(
      (state) =>
        state && {
          ...state,
          commonCards: getCommonCards(state).filter((c) => c.id !== id),
        },
    );
    showToast('已从常用卡片移除，生活里的卡片不受影响');
  }
  function addCommonCards(ids: string[]) {
    const state = stateRef.current;
    if (!state) return;
    const cards = getCommonCards(state)
      .filter((c) => ids.includes(c.id))
      .map(restartLifeCard);
    if (!cards.length) return;
    const next = { ...state, cards: [...state.cards, ...cards] };
    validateState(next);
    setState(next);
    showToast(cards.length + ' 张卡片已放进生活');
  }
  function removeRecord(cardId: string, recordId: string) {
    askConfirmation({
      title: '删除这条记录？',
      description: '数量、状态和阶段会按剩余记录重新计算。',
      destructive: true,
      confirmLabel: '删除记录',
      action: async () => {
        try {
          const generation = dataGeneration();
          const record = stateRef.current?.cards
            .find((c) => c.id === cardId)
            ?.records.find((r) => r.id === recordId);
          if (!record) return;
          if (!preview) await deletePhotos(record.photoIds);
          if (generation !== dataGeneration()) return;
          updateCard(cardId, (c) => ({
            ...c,
            records: c.records.filter((r) => r.id !== recordId),
            updatedAt: new Date().toISOString(),
          }));
          showToast('记录已删除');
        } catch (e) {
          showToast((e as Error).message);
        }
      },
    });
  }
  function removeCard(cardId: string) {
    const card = stateRef.current?.cards.find((c) => c.id === cardId);
    if (!card) return;
    askConfirmation({
      title: '删除“' + card.title + '”？',
      description: '卡片及其中的记录和照片会一并删除。',
      destructive: true,
      confirmLabel: '删除卡片',
      action: async () => {
        try {
          const generation = dataGeneration();
          const latest = stateRef.current?.cards.find((c) => c.id === cardId);
          if (!latest) return;
          if (!preview)
            await deletePhotos(latest.records.flatMap((r) => r.photoIds));
          if (generation !== dataGeneration()) return;
          setState(
            (s) => s && { ...s, cards: s.cards.filter((c) => c.id !== cardId) },
          );
          showToast('卡片已删除');
        } catch (e) {
          showToast((e as Error).message);
        }
      },
    });
  }
  function archive(
    cardId: string,
    summary: string,
    ending: 'achieved' | 'closed',
  ) {
    updateCard(cardId, (c) => ({
      ...c,
      location: 'memory',
      summary: summary.trim(),
      ending,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    if (ending === 'achieved') {
      haptic();
      softChime('celebrate');
      setCelebration({ id: createId('celebrate'), title: '这一段，值得珍藏' });
    }
    showToast('已收进纪念册');
  }
  function locate(cardId: string, location: 'active' | 'later') {
    updateCard(cardId, (c) => ({
      ...c,
      location,
      archivedAt: undefined,
      ending: undefined,
      updatedAt: new Date().toISOString(),
    }));
    showToast(
      location === 'active' ? '回到生活，继续慢慢来' : '先收在以后想做',
    );
  }
  function reorder(activeId: string, overId: string) {
    setState((s) => {
      if (!s) return s;
      const cards = [...s.cards];
      const a = cards.findIndex((c) => c.id === activeId),
        b = cards.findIndex((c) => c.id === overId);
      if (a < 0 || b < 0) return s;
      cards.splice(b, 0, cards.splice(a, 1)[0]);
      return { ...s, cards };
    });
  }
  return {
    saveCard,
    saveRecord,
    quickStatus,
    setStage,
    adjustProgress,
    saveCommonCard,
    removeCommonCard,
    addCommonCards,
    removeRecord,
    removeCard,
    archive,
    locate,
    reorder,
    celebration,
    setCelebration,
    canRecord,
  };
}
export type LifeController = ReturnType<typeof useLifeController>;
