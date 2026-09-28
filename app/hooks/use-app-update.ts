import { useCallback, useEffect, useRef, useState } from 'react';
import type { ShowToast } from '@/hooks/use-toast';
import { isNativeApp } from '@/lib/native';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface AppUpdateOptions {
  enabled?: boolean;
  flushSave: () => Promise<boolean>;
  showToast: ShowToast;
}

export function useAppUpdate({
  flushSave,
  showToast,
  enabled = true,
}: AppUpdateOptions) {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [waitingServiceWorker, setWaitingServiceWorker] =
    useState<ServiceWorker | null>(null);
  const [updateNoticeVisible, setUpdateNoticeVisible] = useState(false);
  const updateNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reloadRequested = useRef(false);

  useEffect(() => {
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleInstall);
    void navigator.storage?.persist?.().catch(() => {});
    return () =>
      window.removeEventListener('beforeinstallprompt', handleInstall);
  }, []);

  useEffect(() => {
    if (
      !enabled ||
      isNativeApp() ||
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
      setWaitingServiceWorker(null);
      if (hadController && reloadRequested.current) {
        void flushSave().then((saved) => {
          if (saved) window.location.reload();
          else showToast('记录尚未保存，已暂停刷新。请先导出备份。');
        });
      }
    };
    const checkForUpdate = () => {
      if (document.visibilityState === 'visible')
        void registration?.update().catch(() => {});
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
        void registration.update().catch(() => {});
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
  }, [flushSave, showToast, enabled]);

  const applyReadyUpdate = useCallback(async () => {
    const worker = waitingServiceWorker;
    if (!worker) return;

    if (!(await flushSave())) {
      showToast('记录尚未保存，已暂停更新。请先导出备份，再重试。');
      return;
    }
    reloadRequested.current = true;
    setUpdateNoticeVisible(false);
    worker.postMessage({ type: 'SKIP_WAITING' });
  }, [flushSave, showToast, waitingServiceWorker]);

  const installApp = useCallback(async () => {
    if (installPrompt) {
      // A browser install prompt can only be consumed once, even if dismissed.
      setInstallPrompt(null);
      try {
        await installPrompt.prompt();
        await installPrompt.userChoice;
        return;
      } catch {
        // Offer the browser menu path when an old prompt is no longer usable.
      }
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
