import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { createDefaultState } from '@/lib/defaults';
import { dateKey } from '@/lib/date';
import { loadState, saveState, StorageConflictError } from '@/lib/db';
import { prepareLoadedState } from '@/lib/state';
import type { AppState } from '@/lib/types';
import type { ShowToast } from '@/hooks/use-toast';

export type SaveStatus = 'saved' | 'saving' | 'unavailable';
const BROWSER_THEME_COLORS = {
  bella: '#fff6f1',
  jiaran: '#fff4f7',
  nailin: '#f1f3fa',
} as const;

export function useDiaryState(showToast: ShowToast) {
  const [state, renderState] = useState<AppState | null>(null);
  const [todayDate, setTodayDate] = useState(dateKey());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const stateRef = useRef<AppState | null>(null);
  const savedRef = useRef<AppState | null>(null);
  const storageAvailable = useRef(true);
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
        storageAvailable.current = true;
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
        storageAvailable.current = false;
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
    [showToast],
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
        const next = prepareLoadedState(restored);
        savedRef.current = restored;
        loaded.current = true;
        conflict.current = false;
        failures.current = 0;
        storageAvailable.current = true;
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
    void loadState()
      .then((loadedState) => {
        if (disposed) return;
        loaded.current = true;
        savedRef.current = loadedState;
        setState(prepareLoadedState(loadedState));
      })
      .catch(() => {
        if (disposed) return;
        storageAvailable.current = false;
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
  }, [showToast, setState]);

  useEffect(() => {
    if (
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
  }, [state, flushSave]);

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
      localStorage.setItem('asoul-diary-theme-hint', activeAccent);
    } catch {
      /* Optional loading hint. */
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', BROWSER_THEME_COLORS[activeAccent]);
  }, [activeAccent]);

  useEffect(() => {
    if (!isReady) return;
    let currentDay = dateKey();
    const refreshDayBoundary = () => {
      const nextDay = dateKey();
      if (nextDay !== currentDay) {
        currentDay = nextDay;
        setTodayDate(nextDay);
        setState((current) => current && prepareLoadedState(current, nextDay));
      }
      const now = new Date();
      if (now.getHours() !== 0) return;
      const noticeKey = `asoul-midnight-notice:${dateKey(now)}`;
      try {
        if (localStorage.getItem(noticeKey)) return;
        localStorage.setItem(noticeKey, 'shown');
      } catch {
        /* The reminder works without preference storage. */
      }
      showToast('已经是新的一天啦，昨天的小事还可以补进日记。');
    };
    refreshDayBoundary();
    const timer = window.setInterval(refreshDayBoundary, 30_000);
    document.addEventListener('visibilitychange', refreshDayBoundary);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshDayBoundary);
    };
  }, [isReady, showToast, setState]);

  return {
    state,
    setState,
    stateRef,
    storageAvailable,
    saveStatus,
    setSaveStatus,
    todayDate,
    setTodayDate,
    isReady,
    flushSave,
    replaceData,
  };
}
