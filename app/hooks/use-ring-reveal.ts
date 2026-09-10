import { useLayoutEffect, useRef } from 'react';

/** Reveal only when this chart is visible; updates never restart the sweep. */
export function useRingReveal(view: string, active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let started = false;
    const finish = () => {
      cancelAnimationFrame(frame);
      element.style.setProperty('--reveal', '360deg');
    };
    if (!active || reduced.matches) {
      finish();
      return;
    }
    element.style.setProperty('--reveal', '0deg');
    const observer = new IntersectionObserver(
      (entries) => {
        if (started || !entries.some((entry) => entry.isIntersecting)) return;
        started = true;
        const start = performance.now();
        const draw = (now: number) => {
          const t = Math.min(1, (now - start) / 620);
          element.style.setProperty(
            '--reveal',
            `${360 * (1 - (1 - t) ** 3)}deg`,
          );
          if (t < 1) frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);
      },
      { threshold: 0.35 },
    );
    observer.observe(element);
    reduced.addEventListener('change', finish);
    return () => {
      observer.disconnect();
      reduced.removeEventListener('change', finish);
      finish();
    };
  }, [view, active]);
  return ref;
}
