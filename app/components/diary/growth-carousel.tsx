'use client';

import {
  useLayoutEffect,
  useRef,
  type ReactNode,
  type UIEventHandler,
} from 'react';

/** Blend visible card heights during swipes without stretching the cards. */
export function GrowthCarousel({
  children,
  activeIndex,
  className,
  onScroll,
}: {
  children: ReactNode;
  activeIndex: number;
  className: string;
  onScroll: UIEventHandler<HTMLDivElement>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const rail = ref.current;
    if (!rail) return;
    const cards = [
      ...rail.querySelectorAll<HTMLElement>('[data-carousel-card]'),
    ];
    let frame = 0;
    const measure = () => {
      if (!cards.length || !rail.clientWidth) return;
      const center = rail.getBoundingClientRect().left + rail.clientWidth / 2;
      const positions = cards.map((card) => {
        const rect = card.getBoundingClientRect();
        return {
          center: rect.left + rect.width / 2,
          height: card.offsetHeight,
        };
      });
      const rightIndex = positions.findIndex(
        (position) => position.center >= center,
      );
      let height = positions.at(-1)!.height;
      if (rightIndex === 0) height = positions[0].height;
      else if (rightIndex > 0) {
        const left = positions[rightIndex - 1];
        const right = positions[rightIndex];
        const progress = (center - left.center) / (right.center - left.center);
        height = left.height + (right.height - left.height) * progress;
      }
      if (rail.scrollLeft <= 1) height = positions[0].height;
      else if (rail.scrollWidth - rail.clientWidth - rail.scrollLeft <= 1)
        height = positions.at(-1)!.height;
      const style = getComputedStyle(rail);
      const next = `${Math.ceil(height + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom))}px`;
      if (rail.style.height !== next) rail.style.height = next;
    };
    measure();
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    rail.addEventListener('scroll', schedule, { passive: true });
    cards.forEach((card) => observer.observe(card));
    observer.observe(rail);
    return () => {
      observer.disconnect();
      rail.removeEventListener('scroll', schedule);
      cancelAnimationFrame(frame);
    };
  }, [activeIndex, children]);
  return (
    <div ref={ref} className={className} onScroll={onScroll}>
      {children}
    </div>
  );
}
