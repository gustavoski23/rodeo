'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useFlipAnimator } from './animator.mjs';
import { useDragController } from './drag.mjs';
import { clampReflectionTarget, computeReflectionFold, shouldCompleteFold, turnAnchorY, turnTargetY } from './geometry.mjs';

function useCurlController(options) {
  const {
    width: W,
    height: H,
    threshold,
    flippingTime,
    swipeDistance,
    swipeTimeThreshold,
    mobileScrollSupport,
    disabled,
    flipped: flippedProp,
    turnOrigin = "bottom",
    rootRef,
    onFold,
    onFlip
  } = options;
  const [view, setView] = useState({
    fold: null,
    flipped: flippedProp ?? false,
    curlProgress: 0
  });
  const flippedRef = useRef(flippedProp ?? false);
  const foldRef = useRef(null);
  const anchorRef = useRef({ x: W, y: 0 });
  const lastTargetRef = useRef(null);
  const animator = useFlipAnimator();
  const setBoth = useCallback((f, flip, curlProgress = 0) => {
    foldRef.current = f;
    flippedRef.current = flip;
    setView({ fold: f, flipped: flip, curlProgress });
  }, []);
  useEffect(() => {
    if (flippedProp === void 0 || flippedProp === flippedRef.current) {
      return;
    }
    animator.stop();
    const wasFlipped = flippedRef.current;
    const anchor = { x: wasFlipped ? -W : W, y: turnAnchorY(turnOrigin, H) };
    anchorRef.current = anchor;
    const toX = -anchor.x;
    animator.start({
      duration: flippingTime,
      onProgress: (eased) => {
        const raw = {
          x: anchor.x + (toX - anchor.x) * eased,
          y: turnTargetY(turnOrigin, eased, H)
        };
        const t = clampReflectionTarget(anchor, raw, W, H);
        const f = computeReflectionFold(anchor, t, W, H);
        setBoth(f, wasFlipped, signedCurl(anchor, t));
        if (f) {
          onFoldRef.current?.({ progress: f.progress, phase: "settle" });
        }
      },
      onComplete: () => {
        setBoth(null, flippedProp);
        onFlipRef.current?.({ flipped: flippedProp });
      }
    });
  }, [flippedProp]);
  const signedCurl = useCallback(
    (anchor, target) => {
      const toward = (anchor.x - target.x) * (anchor.x < 0 ? -1 : 1);
      return Math.max(0, Math.min(100, toward / (2 * W) * 100));
    },
    [W]
  );
  const onFoldRef = useRef(onFold);
  onFoldRef.current = onFold;
  const onFlipRef = useRef(onFlip);
  onFlipRef.current = onFlip;
  const getLocalPoint = useCallback(
    (clientX, clientY) => {
      const rect = rootRef.current?.getBoundingClientRect();
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;
      return { x: clientX - left - W, y: clientY - top };
    },
    [W, rootRef]
  );
  const handleStart = useCallback(
    (local) => {
      animator.stop();
      anchorRef.current = { x: flippedRef.current ? -W : W, y: Math.max(0, Math.min(H, local.y)) };
      lastTargetRef.current = null;
      setBoth(null, flippedRef.current);
      onFoldRef.current?.({ progress: 0, phase: "grab" });
    },
    [W, H, animator, setBoth]
  );
  const handleMove = useCallback(
    (local) => {
      const anchor = anchorRef.current;
      const target = clampReflectionTarget(anchor, local, W, H);
      lastTargetRef.current = target;
      const f = computeReflectionFold(anchor, target, W, H);
      setBoth(f, flippedRef.current, signedCurl(anchor, target));
      if (f) {
        onFoldRef.current?.({ progress: f.progress, phase: "move" });
      }
    },
    [W, H, setBoth, signedCurl]
  );
  const handleRelease = useCallback(
    (summary) => {
      const current = foldRef.current;
      const wasFlipped = flippedRef.current;
      const anchor = anchorRef.current;
      const from = lastTargetRef.current;
      if (summary.kind === "click" || !current || !from) {
        setBoth(null, wasFlipped);
        onFlipRef.current?.({ flipped: wasFlipped });
        return;
      }
      const complete = shouldCompleteFold(
        current.progress,
        threshold,
        summary.kind === "swipe",
        summary.velocity.x,
        anchor.x
      );
      const to = complete ? { x: -anchor.x, y: anchor.y } : { x: anchor.x, y: anchor.y };
      animator.start({
        duration: flippingTime,
        onProgress: (eased) => {
          const t = {
            x: from.x + (to.x - from.x) * eased,
            y: from.y + (to.y - from.y) * eased
          };
          const f = computeReflectionFold(anchor, t, W, H);
          setBoth(f, wasFlipped, signedCurl(anchor, t));
          if (f) {
            onFoldRef.current?.({ progress: f.progress, phase: "settle" });
          }
        },
        onComplete: () => {
          const nowFlipped = complete ? !wasFlipped : wasFlipped;
          setBoth(null, nowFlipped);
          onFlipRef.current?.({ flipped: nowFlipped });
        }
      });
    },
    [W, H, threshold, flippingTime, animator, setBoth, signedCurl]
  );
  const drag = useDragController({
    swipeDistance,
    swipeTimeThreshold,
    mobileScrollSupport,
    getLocalPoint,
    onStart: handleStart,
    onMove: handleMove,
    onRelease: handleRelease
  });
  const dragHandlers = disabled ? {} : {
    onPointerDown: drag.onPointerDown,
    onPointerMove: drag.onPointerMove,
    onPointerUp: drag.onPointerUp,
    onPointerCancel: drag.onPointerCancel
  };
  return {
    fold: view.fold,
    flipped: view.flipped,
    folding: view.fold !== null,
    curlProgress: view.curlProgress,
    dragHandlers
  };
}

export { useCurlController };
