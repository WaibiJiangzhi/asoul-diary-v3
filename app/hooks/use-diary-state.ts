import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { createDefaultState, createDemoState } from '@/lib/defaults';
import { dateKey } from '@/lib/date';
import { loadState, saveState, StorageConflictError } from '@/lib/db';

import type { AppState } from '@/lib/types';
import type { ShowToast } from '@/hooks/use-toast';

export type SaveStatus = 'saved' | 'saving' | 'unavailable';
const BROWSER_THEME_COLORS = {
  bella: '#fff6f1',
  jiaran: '#fff4f7',
  nailin: '#f1f3fa',
} as const;

export function useDiaryState(showToast: ShowToast, preview = false) {
  const [state, renderState] = useState<AppState | null>(null);
  const [todayDate, setTodayDate] = useState(dateKey());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const stateRef = useRef<AppState | null>(null);
  const savedRef = useRef<AppState | null>(null);
  const loaded = useRef(false);
  const replacing = useRef(false);
  const conflict = useRef(false);
  const generation = useRef(0);
  const failures = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const alive = useRef(true);
  const isReady = state !== null;
  const activeAccent = state?.settings.accent;

  // All controllers read the same latest snapshot, even between batched renders.
  const setState: Dispatch<SetStateAction<AppState | null>> = useCallback(
    (action) => {
      const next =
        typeof action === 'function' ? action(stateRef.current) : action;
      stateRef.current = next;
      renderState(next);
    },
    [],
  );

  const flushSave = useCallback(
    async function attempt(): Promise<boolean> {
      if (preview) return true;
      clearTimeout(saveTimer.current);
      clearTimeout(retryTimer.current);
      const snapshot = stateRef.current;
      if (
        !snapshot ||
        !loaded.current ||
        replacing.current ||
        conflict.current ||
        !alive.current
      )
        return false;
      if (snapshot === savedRef.current) return true;
      const started = generation.current;
      setSaveStatus('saving');
      try {
        await saveState(snapshot);
        if (started !== generation.current || !alive.current) return false;
        failures.current = 0;
        savedRef.current = snapshot;
        if (snapshot !== stateRef.current) {
          saveTimer.current = setTimeout(() => {
            void attempt();
          }, 280);
          return false;
        }
        setSaveStatus('saved');
        return true;
      } catch (error) {
        if (started !== generation.current || !alive.current) return false;
        setSaveStatus('unavailable');
        conflict.current = error instanceof StorageConflictError;
        if (!failures.current++ || conflict.current)
          showToast(
            conflict.current
              ? (error as Error).message
              : '自动保存失败，正在重试；也可以先导出备份',
          );
        if (!conflict.current)
          retryTimer.current = setTimeout(
            () => {
              void attempt();
            },
            Math.min(30000, 2000 * 2 ** Math.min(failures.current, 4)),
          );
        return false;
      }
    },
    [showToast, preview],
  );

  const replaceData = useCallback(
    async (operation: () => Promise<AppState>) => {
      if (replacing.current) throw new Error('正在恢复记录，请稍候');
      replacing.current = true;
      generation.current++;
      clearTimeout(saveTimer.current);
      clearTimeout(retryTimer.current);
      let succeeded = false;
      try {
        const restored = await operation();
        const next = restored;
        savedRef.current = restored;
        loaded.current = true;
        conflict.current = false;
        failures.current = 0;
        setState(next);
        setSaveStatus('saved');
        succeeded = true;
      } finally {
        replacing.current = false;
        if (!succeeded) void flushSave();
      }
    },
    [setState, flushSave],
  );

  useEffect(() => {
    let disposed = false;
    alive.current = true;
    void (preview ? Promise.resolve(createDemoState()) : loadState())
      .then((loadedState) => {
        if (disposed) return;
        loaded.current = true;
        savedRef.current = loadedState;
        setState(loadedState);
      })
      .catch(() => {
        if (disposed) return;
        setState(createDefaultState());
        setSaveStatus('unavailable');
        showToast('本地存储不可用，当前内容不会被保存');
      });
    return () => {
      disposed = true;
      alive.current = false;
      clearTimeout(saveTimer.current);
      clearTimeout(retryTimer.current);
    };
  }, [showToast, setState, preview]);

  useEffect(() => {
    if (
      preview ||
      !state ||
      state === savedRef.current ||
      !loaded.current ||
      replacing.current ||
      conflict.current
    )
      return;
    setSaveStatus('saving');
    saveTimer.current = setTimeout(() => {
      void flushSave();
    }, 280);
    return () => clearTimeout(saveTimer.current);
  }, [state, flushSave, preview]);

  useEffect(() => {
    const onVisibility = () => {
      void flushSave();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onVisibility);
    };
  }, [flushSave]);

  useEffect(() => {
    if (!activeAccent) return;
    document.documentElement.dataset.accent = activeAccent;
    try {
      if (!preview)
        localStorage.setItem('asoul-diary-theme-hint', activeAccent);
    } catch {
      /* Optional loading hint. */
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', BROWSER_THEME_COLORS[activeAccent]);
  }, [activeAccent, preview]);

  useEffect(() => {
    if (!isReady) return;
    let currentDay = dateKey();
    let lastNotice = '';
    const refreshDayBoundary = () => {
      const nextDay = dateKey();
      if (nextDay !== currentDay) {
        currentDay = nextDay;
        setTodayDate(nextDay);
      }
      const now = new Date();
      if (preview || now.getHours() !== 0 || lastNotice === nextDay) return;
      lastNotice = nextDay;
      const noticeKey = `asoul-midnight-notice:${dateKey(now)}`;
      try {
        if (localStorage.getItem(noticeKey)) return;
        localStorage.setItem(noticeKey, 'shown');
      } catch {
        /* The reminder works without preference storage. */
      }
      showToast('新的一天开始了，过去的记录也随时可以补记。');
    };
    refreshDayBoundary();
    const timer = window.setInterval(refreshDayBoundary, 30_000);
    document.addEventListener('visibilitychange', refreshDayBoundary);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshDayBoundary);
    };
  }, [isReady, showToast, preview]);

  return {
    state,
    setState,
    stateRef,
    saveStatus,
    todayDate,
    setTodayDate,
    isReady,
    flushSave,
    replaceData,
  };
}
