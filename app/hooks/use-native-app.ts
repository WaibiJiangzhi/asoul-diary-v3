import { useEffect, useEffectEvent } from 'react';
import { isNativeApp } from '@/lib/native';

export function useNativeApp(
  onBack: () => boolean,
  flushSave: () => Promise<boolean>,
) {
  const back = useEffectEvent(onBack);
  const save = useEffectEvent(flushSave);
  useEffect(() => {
    if (!isNativeApp()) return;
    let disposed = false;
    const remove: Array<() => Promise<void>> = [];
    void import('@capacitor/app').then(async ({ App }) => {
      const register = async (
        pending: Promise<{ remove: () => Promise<void> }>,
      ) => {
        const handle = await pending;
        if (disposed) await handle.remove();
        else remove.push(() => handle.remove());
      };
      await register(
        App.addListener('backButton', async () => {
          // The keyboard is dismissed by Android first; close the remaining composer next.
          const composer = document.querySelector<HTMLButtonElement>(
            'button[aria-label="收起编辑工具"]',
          );
          if (composer && composer.getClientRects().length) {
            composer.click();
            return;
          }
          if (back()) return;
          if (await save()) await App.minimizeApp();
        }),
      );
      await register(
        App.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) void save();
        }),
      );
    });
    return () => {
      disposed = true;
      remove.forEach((cleanup) => {
        void cleanup();
      });
    };
  }, []);
}
