import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { AppState } from '@/lib/types';

/** Everyday bells and a resolving C-major ascent share the same soft timbre. */
export function useAppFeedback(stateRef: MutableRefObject<AppState | null>) {
  const context = useRef<AudioContext | null>(null);
  const lastSound = useRef(0);
  useEffect(
    () => () => {
      const audio = context.current;
      context.current = null;
      if (audio && audio.state !== 'closed') void audio.close().catch(() => {});
    },
    [],
  );

  const haptic = useCallback(() => {
    if (stateRef.current?.settings.haptics) navigator.vibrate?.(18);
  }, [stateRef]);

  const softChime = useCallback(
    (kind: 'check' | 'progress' | 'celebrate') => {
      if (!stateRef.current?.settings.sounds) return;
      const now = performance.now();
      // A goal reached by a quick second tap still deserves its completion cue.
      if (kind !== 'celebrate' && now - lastSound.current < 120) return;
      lastSound.current = now;
      try {
        const audio =
          context.current?.state !== 'closed' && context.current
            ? context.current
            : (context.current = new AudioContext());
        const play = () => {
          if (audio.state !== 'running' || !stateRef.current?.settings.sounds)
            return;
          const notes =
            kind === 'celebrate'
              ? [523.25, 659.25, 783.99, 1046.5]
              : kind === 'progress'
                ? [659.25, 880]
                : [783.99, 1046.5];
          const master = audio.createGain();
          master.gain.value = 0.8 / Math.sqrt(Math.min(notes.length, 2));
          master.connect(audio.destination);
          let voices = notes.length * 3;
          notes.forEach((frequency, index) => {
            const start =
              audio.currentTime +
              0.008 +
              (kind === 'celebrate'
                ? [0, 0.11, 0.22, 0.39][index]
                : index * 0.085);
            const duration =
              index === notes.length - 1
                ? kind === 'celebrate'
                  ? 0.88
                  : 0.62
                : 0.44;
            [1, 2, 3].forEach((partial, harmonic) => {
              const oscillator = audio.createOscillator();
              const envelope = audio.createGain();
              const level = [0.19, 0.035, 0.009][harmonic];
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(frequency * partial, start);
              envelope.gain.setValueAtTime(0, start);
              envelope.gain.linearRampToValueAtTime(level, start + 0.008);
              envelope.gain.exponentialRampToValueAtTime(
                level * 0.3,
                start + 0.09,
              );
              envelope.gain.exponentialRampToValueAtTime(
                0.0001,
                start + duration - 0.025,
              );
              envelope.gain.linearRampToValueAtTime(0, start + duration);
              oscillator.connect(envelope);
              envelope.connect(master);
              oscillator.onended = () => {
                oscillator.disconnect();
                envelope.disconnect();
                if (--voices === 0) master.disconnect();
              };
              oscillator.start(start);
              oscillator.stop(start + duration);
            });
          });
        };
        if (audio.state === 'suspended')
          void audio
            .resume()
            .then(play)
            .catch(() => {});
        else play();
      } catch {
        // Sound is optional; recording still succeeds when audio is unavailable.
      }
    },
    [stateRef],
  );
  return { haptic, softChime };
}
