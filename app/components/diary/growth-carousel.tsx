'use client';

import {
  useLayoutEffect,
  useRef,
  type ReactNode,
  type UIEventHandler,
} from 'react';

/** The visible card owns the rail height; other cards keep their natural height. */
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
      const card = cards[activeIndex];
      if (!card || !rail.clientWidth) return;
      const style = getComputedStyle(rail);
      rail.style.height = `${card.offsetHeight + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)}px`;
    };
    measure();
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    cards.forEach((card) => observer.observe(card));
    observer.observe(rail);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [activeIndex, children]);
  return (
    <div ref={ref} className={className} onScroll={onScroll}>
      {children}
    </div>
  );
}
