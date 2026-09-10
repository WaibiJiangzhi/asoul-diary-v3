import { useEffect, useState } from 'react';

/** Keep the editor toolbar above the visible keyboard without resizing the whole app. */
export function useVisualViewport() {
  const [viewport, setViewport] = useState({ bottom: 0, height: 0 });
  useEffect(() => {
    const visual = window.visualViewport;
    const update = () =>
      setViewport({
        bottom:
          visual && visual.scale === 1
            ? Math.max(0, window.innerHeight - visual.height - visual.offsetTop)
            : 0,
        height: visual?.height ?? window.innerHeight,
      });
    update();
    visual?.addEventListener('resize', update);
    visual?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      visual?.removeEventListener('resize', update);
      visual?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return viewport;
}
