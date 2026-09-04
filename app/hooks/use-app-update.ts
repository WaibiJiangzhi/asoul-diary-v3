import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { saveState } from '@/lib/db';
import type { AppState } from '@/lib/types';
import type { SaveStatus } from '@/hooks/use-diary-state';
import type { ShowToast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface AppUpdateOptions {
  stateRef: MutableRefObject<AppState | null>;
  storageAvailable: MutableRefObject<boolean>;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  showToast: ShowToast;
}

export function useAppUpdate({
  stateRef,
  storageAvailable,
  setSaveStatus,
  showToast,
}: AppUpdateOptions) {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [waitingServiceWorker, setWaitingServiceWorker] =
    useState<ServiceWorker | null>(null);
  const [updateNoticeVisible, setUpdateNoticeVisible] = useState(false);
  const updateNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleInstall);
    void navigator.storage?.persist?.();
    return () =>
      window.removeEventListener('beforeinstallprompt', handleInstall);
  }, []);

  useEffect(() => {
    if (
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return;
    }

    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;
    let updateCheckTimer: ReturnType<typeof setInterval> | null = null;
    const workerListeners: Array<{
      worker: ServiceWorker;
      listener: () => void;
    }> = [];
    const hadController = Boolean(navigator.serviceWorker.controller);

    const announceUpdate = (worker: ServiceWorker) => {
      if (disposed) return;
      setWaitingServiceWorker(worker);
      setUpdateNoticeVisible(true);
      if (updateNoticeTimer.current) clearTimeout(updateNoticeTimer.current);
      updateNoticeTimer.current = setTimeout(
        () => setUpdateNoticeVisible(false),
        8000,
      );
    };

    const watchInstallingWorker = () => {
      const worker = registration?.installing;
      if (!worker) return;
      const handleStateChange = () => {
        if (
          worker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          announceUpdate(worker);
        }
      };
      worker.addEventListener('statechange', handleStateChange);
      workerListeners.push({ worker, listener: handleStateChange });
    };

    const handleControllerChange = () => {
      if (hadController) window.location.reload();
    };
    const checkForUpdate = () => {
      if (document.visibilityState === 'visible') void registration?.update();
    };
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    );
    document.addEventListener('visibilitychange', checkForUpdate);

    void navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((nextRegistration) => {
        if (disposed) return;
        registration = nextRegistration;
        if (registration.waiting) announceUpdate(registration.waiting);
        registration.addEventListener('updatefound', watchInstallingWorker);
        void registration.update();
        updateCheckTimer = setInterval(checkForUpdate, 60 * 60 * 1000);
      })
      .catch(() => {
        // The diary still works as a normal website when PWA updates are unavailable.
      });

    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      );
      registration?.removeEventListener('updatefound', watchInstallingWorker);
      document.removeEventListener('visibilitychange', checkForUpdate);
      workerListeners.forEach(({ worker, listener }) =>
        worker.removeEventListener('statechange', listener),
      );
      if (updateCheckTimer) clearInterval(updateCheckTimer);
      if (updateNoticeTimer.current) clearTimeout(updateNoticeTimer.current);
    };
  }, []);

  const applyReadyUpdate = useCallback(async () => {
    const worker = waitingServiceWorker;
    if (!worker) return;

    setUpdateNoticeVisible(false);
    if (stateRef.current && storageAvailable.current) {
      try {
        await saveState(stateRef.current);
        setSaveStatus('saved');
      } catch {
        storageAvailable.current = false;
        setSaveStatus('unavailable');
      }
    }
    worker.postMessage({ type: 'SKIP_WAITING' });
  }, [setSaveStatus, stateRef, storageAvailable, waitingServiceWorker]);

  const installApp = useCallback(async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') setInstallPrompt(null);
      return;
    }
    showToast('苹果请点“分享 → 添加到主屏幕”；Android 请打开浏览器菜单安装');
  }, [installPrompt, showToast]);

  return {
    waitingServiceWorker,
    updateNoticeVisible,
    applyReadyUpdate,
    installApp,
  };
}
