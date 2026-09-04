import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { Confirmation } from '@/components/diary/confirm-dialog';
import { formatShortDate } from '@/lib/date';
import { deletePhotos, storePhoto } from '@/lib/db';
import type { AppState, CardColor, DiaryEntry } from '@/lib/types';
import type { ShowToast } from '@/hooks/use-toast';

interface JournalControllerOptions {
  stateRef: MutableRefObject<AppState | null>;
  setState: Dispatch<SetStateAction<AppState | null>>;
  showToast: ShowToast;
  askConfirmation: (confirmation: Confirmation) => void;
}

export function useJournalController({
  stateRef,
  setState,
  showToast,
  askConfirmation,
}: JournalControllerOptions) {
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
            growthSnapshots: [],
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

  function setDateMarker(date: string, color: CardColor | null) {
    setState(
      (current) =>
        current && {
          ...current,
          dateMarkers: color
            ? [
                ...current.dateMarkers.filter((marker) => marker.date !== date),
                { date, color },
              ]
            : current.dateMarkers.filter((marker) => marker.date !== date),
        },
    );
  }

  async function addDiaryPhotos(date: string, files: FileList | null) {
    if (!files?.length) return;
    try {
      const currentIds =
        stateRef.current?.diaries.find((entry) => entry.date === date)
          ?.photoIds ?? [];
      const remaining = Math.max(0, 9 - currentIds.length);
      if (!remaining) {
        showToast('这一页已经放满 9 张照片了');
        return;
      }
      const chosen = Array.from(files).slice(0, remaining);
      const stored = await Promise.all(chosen.map(storePhoto));
      updateDiary(date, {
        photoIds: [...currentIds, ...stored.map((photo) => photo.id)],
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

  return {
    updateDiary,
    setDateMarker,
    addDiaryPhotos,
    removeDiaryPhoto,
    deleteDiary,
  };
}
