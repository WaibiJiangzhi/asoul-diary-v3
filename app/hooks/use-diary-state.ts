import { useEffect, useRef, useState } from 'react';

import { createDefaultState } from '@/lib/defaults';
import { dateKey } from '@/lib/date';
import { loadState, saveState } from '@/lib/db';
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
  const [state, setState] = useState<AppState | null>(null);
  const [todayDate, setTodayDate] = useState(dateKey());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const stateRef = useRef<AppState | null>(null);
  const storageAvailable = useRef(true);
  const loaded = useRef(false);
  const isReady = state !== null;
  const activeAccent = state?.settings.accent;

  useEffect(() => {
    loadState()
      .then((loadedState) => {
        const next = prepareLoadedState(loadedState);
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
        showToast('本地存储不可用，当前内容不会被保存');
      });
  }, [showToast]);

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
  }, [showToast, state]);

  useEffect(() => {
    if (!activeAccent) return;
    document.documentElement.dataset.accent = activeAccent;
    try {
      localStorage.setItem('asoul-diary-theme-hint', activeAccent);
    } catch {
      // Theme persistence is only a loading-screen hint; IndexedDB remains authoritative.
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
        // The reminder can still be shown when local storage is unavailable.
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
  }, [isReady, showToast]);

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
  };
}
