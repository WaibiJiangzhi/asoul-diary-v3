import { useCallback } from 'react';
import type { MutableRefObject } from 'react';

import type { AppState } from '@/lib/types';

export function useAppFeedback(stateRef: MutableRefObject<AppState | null>) {
  const haptic = useCallback(() => {
    if (stateRef.current?.settings.haptics) navigator.vibrate?.(18);
  }, [stateRef]);

  const softChime = useCallback(
    (kind: 'check' | 'progress' | 'celebrate') => {
      if (!stateRef.current?.settings.sounds) return;
      try {
        const audio = new AudioContext();
        const gain = audio.createGain();
        gain.gain.setValueAtTime(0.0001, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.055,
          audio.currentTime + 0.012,
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          audio.currentTime + (kind === 'celebrate' ? 0.52 : 0.24),
        );
        gain.connect(audio.destination);
        const notes =
          kind === 'celebrate'
            ? [523, 659, 784, 1047]
            : kind === 'check'
              ? [659, 880]
              : [523, 659];
        notes.forEach((frequency, index) => {
          const oscillator = audio.createOscillator();
          oscillator.type = 'sine';
          oscillator.frequency.value = frequency;
          oscillator.connect(gain);
          oscillator.start(audio.currentTime + index * 0.055);
          oscillator.stop(
            audio.currentTime + (kind === 'celebrate' ? 0.5 : 0.22),
          );
        });
        window.setTimeout(
          () => void audio.close(),
          kind === 'celebrate' ? 620 : 320,
        );
      } catch {
        // Audio feedback is optional.
      }
    },
    [stateRef],
  );

  return { haptic, softChime };
}
