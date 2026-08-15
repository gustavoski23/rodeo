'use client';
import { useRef, useCallback, useEffect, useMemo } from 'react';

const easeOutCubic = (t) => 1 - (1 - t) ** 3;
function useFlipAnimator() {
  const rafRef = useRef(null);
  const activeRef = useRef(false);
  const cancel = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    activeRef.current = false;
  }, []);
  useEffect(() => () => cancel(), [cancel]);
  const start = useCallback(
    (options) => {
      cancel();
      const reduceMotion = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const duration = reduceMotion ? 0 : Math.max(0, options.duration ?? 1e3);
      const easing = options.easing ?? easeOutCubic;
      const startTs = performance.now();
      activeRef.current = true;
      const tick = () => {
        if (!activeRef.current) {
          return;
        }
        const elapsed = performance.now() - startTs;
        const raw = duration === 0 ? 1 : Math.min(1, elapsed / duration);
        const eased = easing(raw);
        options.onProgress(eased, raw);
        if (raw >= 1) {
          activeRef.current = false;
          rafRef.current = null;
          options.onComplete?.();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return cancel;
    },
    [cancel]
  );
  const isActive = useCallback(() => activeRef.current, []);
  return useMemo(() => ({ start, stop: cancel, isActive }), [start, cancel, isActive]);
}

export { easeOutCubic, useFlipAnimator };
